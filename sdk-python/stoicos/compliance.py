"""
Compliance & Audit Client

Immutable audit trail for all agent decisions.
Circuit breaker calculates agent health from recent BLOCK verdicts.
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

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
