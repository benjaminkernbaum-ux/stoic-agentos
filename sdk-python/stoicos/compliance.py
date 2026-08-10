"""
Compliance & Audit Client

Immutable audit trail for all agent decisions.
Circuit breaker calculates agent health from recent BLOCK verdicts.
Active Shield: declarative policies, HITL approvals, governance report.
"""

from __future__ import annotations

import asyncio
import functools
import time
from typing import Any, Awaitable, Callable, TYPE_CHECKING

from stoicos.errors import (
    ApprovalRejectedError,
    ApprovalTimeoutError,
    PolicyBlockedError,
)

if TYPE_CHECKING:
    from stoicos.client import StoicOS


class Compliance:
    """Audit log + circuit breaker status."""

    def __init__(self, sdk: StoicOS):
        self._sdk = sdk

    # ── Audit Log ───────────────────────────────────────

    async def log_event(
        self,
        event_type: str,
        action: str,
        agent_id: str | None = None,
        reasoning: str | None = None,
        verdict: str = "PROCEED",
        metadata: dict[str, Any] | None = None,
        policy_version: str = "1.0",
        context_hash: str | None = None,
    ) -> dict[str, Any] | None:
        """Log an immutable audit event."""
        return await self._sdk._post("/compliance/audit-log", {
            "event_type": event_type,
            "action": action,
            "agent_id": agent_id,
            "reasoning": reasoning,
            "verdict": verdict,
            "metadata": metadata or {},
            "policy_version": policy_version,
            "context_hash": context_hash,
        })

    async def get_events(
        self,
        agent_id: str | None = None,
        event_type: str | None = None,
        verdict: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """Query audit log with filters."""
        params: dict[str, str] = {}
        if agent_id:
            params["agent_id"] = agent_id
        if event_type:
            params["event_type"] = event_type
        if verdict:
            params["verdict"] = verdict
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        return await self._sdk._get("/compliance/audit-log", params)

    # ── Export ──────────────────────────────────────────

    async def export(
        self,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """Export audit trail as downloadable JSON."""
        params: dict[str, str] = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        return await self._sdk._get("/compliance/audit-log/export", params)

    # ── Circuit Breaker ─────────────────────────────────

    async def circuit_breaker(self) -> list[dict[str, Any]] | None:
        """
        Get circuit breaker status for all agents (read-only).

        Returns a list of agents with their circuit status:
        - closed: healthy (0 blocks in last hour)
        - half-open: degraded (1-5 blocks)
        - open: unhealthy (>5 blocks)
        """
        return await self._sdk._get("/compliance/circuit-breaker")

    async def stats(self) -> dict[str, Any] | None:
        """Get audit log statistics — by type, verdict, and day."""
        return await self._sdk._get("/compliance/audit-log/stats")

    # ── Active Shield & HITL ────────────────────────────

    async def suspend(
        self,
        tool_name: str,
        agent_id: str | None = None,
        trace_id: str | None = None,
        tool_args: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Suspend execution of a critical tool call and request human approval."""
        return await self._sdk._post("/compliance/shield/suspend", {
            "tool_name": tool_name,
            "agent_id": agent_id,
            "trace_id": trace_id,
            "tool_args": tool_args or {},
        })

    async def check_approval_status(self, approval_id: str) -> dict[str, Any] | None:
        """Poll the status of a pending approval."""
        return await self._sdk._get(f"/compliance/shield/approvals/{approval_id}/status")

    async def resolve_approval(self, approval_id: str, verdict: str) -> dict[str, Any] | None:
        """Resolve an approval — verdict must be APPROVED or REJECTED."""
        return await self._sdk._post(
            f"/compliance/shield/approvals/{approval_id}/resolve", {"verdict": verdict}
        )

    async def consume_approval(self, approval_id: str) -> dict[str, Any] | None:
        """Atomically claim (CAS) an APPROVED ticket before executing the tool."""
        return await self._sdk._post(f"/compliance/shield/approvals/{approval_id}/consume", {})

    async def get_approvals(self, status: str | None = None) -> list[dict[str, Any]] | None:
        """List pending/resolved approvals."""
        params = {"status": status} if status else None
        return await self._sdk._get("/compliance/shield/approvals", params)

    # ── Declarative Policies (server-side) ──────────────

    async def list_policies(self) -> list[dict[str, Any]] | None:
        """List the org's Shield policies."""
        return await self._sdk._get("/compliance/shield/policies")

    async def create_policy(
        self,
        name: str,
        tool_pattern: str,
        action: str = "REQUIRE_APPROVAL",
        priority: int = 100,
        timeout_seconds: int = 300,
        description: str | None = None,
        enabled: bool = True,
    ) -> dict[str, Any] | None:
        """Create a Shield policy. action: ALLOW | REQUIRE_APPROVAL | BLOCK."""
        return await self._sdk._post("/compliance/shield/policies", {
            "name": name,
            "tool_pattern": tool_pattern,
            "action": action,
            "priority": priority,
            "timeout_seconds": timeout_seconds,
            "description": description,
            "enabled": enabled,
        })

    async def delete_policy(self, policy_id: str) -> dict[str, Any] | None:
        """Delete a Shield policy."""
        return await self._sdk._post(
            f"/compliance/shield/policies/{policy_id}", {}, method="DELETE"
        )

    async def evaluate(
        self,
        tool_name: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
        trace_id: str | None = None,
        tool_args: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """
        Ask the server to evaluate a tool call against the org's Shield
        policies and the agent's circuit breaker.
        Returns {verdict: ALLOW|BLOCK|REQUIRE_APPROVAL, approval_id?, ...}.
        """
        return await self._sdk._post("/compliance/shield/evaluate", {
            "tool_name": tool_name,
            "agent_id": agent_id,
            "agent_name": agent_name,
            "trace_id": trace_id,
            "tool_args": tool_args or {},
        })

    async def wait_for_approval(
        self,
        approval_id: str,
        timeout_seconds: float = 300.0,
        poll_interval_seconds: float = 2.0,
    ) -> str:
        """Poll until the approval leaves PENDING or the deadline passes."""
        deadline = time.monotonic() + timeout_seconds
        while time.monotonic() < deadline:
            await asyncio.sleep(poll_interval_seconds)
            try:
                res = await self.check_approval_status(approval_id)
                if res and res.get("status") and res["status"] != "PENDING":
                    return res["status"]
            except Exception:  # noqa: BLE001 — transient polling errors retry
                pass
        return "TIMEOUT"

    async def guard(
        self,
        tool_name: str,
        agent_id: str | None = None,
        agent_name: str | None = None,
        trace_id: str | None = None,
        tool_args: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        The one-call guard: evaluate → (if required) wait for human approval →
        atomically consume the ticket. Returns when execution may proceed;
        raises PolicyBlockedError / ApprovalRejectedError / ApprovalTimeoutError
        otherwise.
        """
        evaluation = await self.evaluate(
            tool_name, agent_id=agent_id, agent_name=agent_name,
            trace_id=trace_id, tool_args=tool_args,
        )
        if not evaluation or evaluation.get("verdict") == "ALLOW":
            return {"verdict": "ALLOW", "approval_id": None, "policy": (evaluation or {}).get("policy")}

        if evaluation.get("verdict") == "BLOCK":
            if evaluation.get("reason") == "circuit_breaker_open":
                why = f"circuit breaker open ({evaluation.get('block_count')} blocks in the last hour)"
            else:
                why = f"policy \"{(evaluation.get('policy') or {}).get('name', 'unknown')}\""
            raise PolicyBlockedError(f'Tool "{tool_name}" blocked by {why}.')

        approval_id = evaluation.get("approval_id")
        timeout_seconds = float(evaluation.get("timeout_seconds") or 300) + 5.0  # grace for the sweep
        poll = float(evaluation.get("poll_interval_ms") or 2000) / 1000.0
        status = await self.wait_for_approval(
            approval_id, timeout_seconds=timeout_seconds, poll_interval_seconds=poll
        )

        if status == "APPROVED":
            consumed = await self.consume_approval(approval_id)
            if consumed and consumed.get("success"):
                return {"verdict": "APPROVED", "approval_id": approval_id, "policy": evaluation.get("policy")}
            raise ApprovalRejectedError(
                f'Approval for "{tool_name}" was claimed elsewhere or invalidated.', approval_id
            )
        if status == "REJECTED":
            raise ApprovalRejectedError(
                f'Tool "{tool_name}" was rejected by an administrator.', approval_id
            )
        raise ApprovalTimeoutError(
            f'Approval for "{tool_name}" timed out before a human resolved it.', approval_id
        )

    def protect_tool(
        self,
        tool_name: str,
        func: Callable[..., Awaitable[Any]],
        agent_id: str | None = None,
        agent_name: str | None = None,
    ) -> Callable[..., Awaitable[Any]]:
        """
        Wrap an async tool function so every invocation is guarded by the
        org's server-side Shield policies.

        Example:
            safe_refund = os.compliance.protect_tool("stripe_refund", issue_refund)
            await safe_refund(charge_id)  # waits for human approval if policy says so
        """

        @functools.wraps(func)
        async def guarded(*args: Any, **kwargs: Any) -> Any:
            await self.guard(
                tool_name,
                agent_id=agent_id,
                agent_name=agent_name,
                tool_args={"args": list(args), "kwargs": kwargs},
            )
            return await func(*args, **kwargs)

        return guarded

    # ── Governance Report ───────────────────────────────

    async def report(
        self,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any] | None:
        """Governance report — the client-facing rollup for a period."""
        params: dict[str, str] = {}
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date
        return await self._sdk._get("/compliance/report", params or None)
