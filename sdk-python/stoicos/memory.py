"""
Three-Tier Memory Client

Tier 1: Working Memory  — ephemeral, session-scoped key-value store
Tier 2: Episodic Memory — time-series events with importance scoring
Tier 3: Semantic Memory — persistent knowledge triplets (subject->relation->object)
"""

from __future__ import annotations

from typing import Any, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from stoicos.client import StoicOS


class Memory:
    """Three-tier memory system: working, episodic, semantic."""

    def __init__(self, sdk: StoicOS):
        self._sdk = sdk

    # ── Tier 1: Working Memory ──────────────────────────

    async def set_working(
        self,
        session_id: str,
        key: str,
        value: Any,
        agent_id: str | None = None,
        ttl_seconds: int | None = None,
    ) -> dict[str, Any] | None:
        """Store or update a working memory entry."""
        return await self._sdk._post("/memory/working", {
            "session_id": session_id,
            "key": key,
            "value": value,
            "agent_id": agent_id,
            "ttl_seconds": ttl_seconds,
        })

    async def get_working(
        self,
        session_id: str | None = None,
        agent_id: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """Retrieve working memory entries."""
        params: dict[str, str] = {}
        if session_id:
            params["session_id"] = session_id
        if agent_id:
            params["agent_id"] = agent_id
        return await self._sdk._get("/memory/working", params)

    async def delete_working(self, entry_id: str) -> dict[str, Any] | None:
        """Delete a working memory entry by ID."""
        return await self._sdk._delete(f"/memory/working/{entry_id}")

    # ── Tier 2: Episodic Memory ─────────────────────────

    async def record_episode(
        self,
        content: str,
        event_type: str = "observation",
        importance: int = 5,
        agent_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Record a timestamped episode."""
        return await self._sdk._post("/memory/episodic", {
            "content": content,
            "event_type": event_type,
            "importance": min(10, max(1, importance)),
            "agent_id": agent_id,
            "metadata": metadata or {},
        })

    async def list_episodes(
        self,
        agent_id: str | None = None,
        event_type: str | None = None,
        min_importance: int | None = None,
    ) -> list[dict[str, Any]] | None:
        """List episodic memories with filters."""
        params: dict[str, str] = {}
        if agent_id:
            params["agent_id"] = agent_id
        if event_type:
            params["event_type"] = event_type
        if min_importance is not None:
            params["min_importance"] = str(min_importance)
        return await self._sdk._get("/memory/episodic", params)

    async def timeline(self) -> dict[str, Any] | None:
        """Get episodic memory as a timeline grouped by day."""
        return await self._sdk._get("/memory/episodic/timeline")

    # ── Tier 3: Semantic Memory ─────────────────────────

    async def store_triple(
        self,
        subject: str,
        relation: str,
        object_: str,
        confidence: float | None = None,
        source_type: str | None = None,
    ) -> dict[str, Any] | None:
        """Store a knowledge triple."""
        return await self._sdk._post("/memory/semantic", {
            "subject": subject,
            "relation": relation,
            "object": object_,
            "confidence": confidence,
            "source_type": source_type,
        })

    async def query_triples(
        self,
        subject: str | None = None,
        relation: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """Query knowledge triples."""
        params: dict[str, str] = {}
        if subject:
            params["subject"] = subject
        if relation:
            params["relation"] = relation
        return await self._sdk._get("/memory/semantic", params)

    async def delete_triple(self, triple_id: str) -> dict[str, Any] | None:
        """Delete a semantic triple."""
        return await self._sdk._delete(f"/memory/semantic/{triple_id}")

    async def stats(self) -> dict[str, Any] | None:
        """Get memory statistics across all tiers."""
        return await self._sdk._get("/memory/stats")
