"""
Compliance & Audit Client
EU AI Act Article 12 (Logging) + Article 14 (Human Oversight)
"""

from __future__ import annotations

from typing import Any, Literal, TYPE_CHECKING

if TYPE_CHECKING:
    from stoicos.client import StoicOS


class Compliance:
    """Immutable audit log, SIEM export, and circuit breaker."""

    def __init__(self, sdk: StoicOS):
        self._sdk = sdk

    # ── Audit Log ───────────────────────────────────────

    async def log_event(
        self,
        event_type: str,
        action: str,
        agent_id: str | None = None,
        reasoning: str | None = None,
        context: dict[str, Any] | None = None,
        policy_version: str | None = None,
        verdict: str = "PROCEED",
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Log an immutable audit event."""
        return await self._sdk._post("/audit/log", {
            "event_type": event_type,
            "action": action,
            "agent_id": agent_id,
            "reasoning": reasoning,
            "context": context,
            "policy_version": policy_version,
            "verdict": verdict,
            "metadata": metadata or {},
        })

    async def log_batch(self, events: list[dict[str, Any]]) -> dict[str, Any] | None:
        """Batch-log up to 100 audit events."""
        return await self._sdk._post("/audit/log/batch", {"events": events})

    async def get_events(
        self,
        agent_id: str | None = None,
        event_type: str | None = None,
        verdict: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]] | None:
        """Query audit log with filters."""
        params: dict[str, str] = {"limit": str(limit)}
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
        return await self._sdk._get("/audit/log", params)

    # ── SIEM Export ─────────────────────────────────────

    async def export(
        self,
        from_date: str,
        to_date: str,
        format: Literal["json", "ndjson"] = "json",
        agent_id: str | None = None,
        event_type: str | None = None,
    ) -> dict[str, Any] | None:
        """Export audit trail for compliance tools (Team+ plans)."""
        params: dict[str, str] = {"from": from_date, "to": to_date, "format": format}
        if agent_id:
            params["agent_id"] = agent_id
        if event_type:
            params["event_type"] = event_type
        return await self._sdk._get("/compliance/export", params)

    # ── Circuit Breaker ─────────────────────────────────

    async def circuit_breaker(
        self,
        action: Literal["HALT_ALL", "RESUME_ALL"],
        reason: str | None = None,
    ) -> dict[str, Any] | None:
        """
        Fleet-wide agent kill switch (EU AI Act Article 14).

        Args:
            action: HALT_ALL stops all agents, RESUME_ALL restarts them
            reason: Human-readable reason for the action
        """
        return await self._sdk._post("/compliance/circuit-breaker", {
            "action": action,
            "reason": reason,
        })

    async def stats(self) -> dict[str, Any] | None:
        """Get compliance dashboard statistics."""
        return await self._sdk._get("/compliance/stats")
