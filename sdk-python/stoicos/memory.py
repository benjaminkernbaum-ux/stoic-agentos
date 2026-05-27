"""
Three-Tier Memory Client

Tier 1: Working Memory  — per-session mutable JSONB state
Tier 2: Episodic Memory — time-series events with embeddings
Tier 3: Semantic Memory — knowledge triplets (subject→relation→object)
"""

from __future__ import annotations

from typing import Any, Optional, Literal, TYPE_CHECKING

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
        expires_in_seconds: int | None = None,
    ) -> dict[str, Any] | None:
        """Store or update a working memory entry."""
        return await self._sdk._post("/memory/working", {
            "session_id": session_id,
            "key": key,
            "value": value,
            "agent_id": agent_id,
            "expires_in_seconds": expires_in_seconds,
        })

    async def get_working(
        self,
        session_id: str,
        agent_id: str | None = None,
        key: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """Retrieve working memory for a session."""
        params: dict[str, str] = {"session_id": session_id}
        if agent_id:
            params["agent_id"] = agent_id
        if key:
            params["key"] = key
        return await self._sdk._get("/memory/working", params)

    async def clear_working(
        self,
        session_id: str,
        agent_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Clear all working memory for a session."""
        params = f"session_id={session_id}"
        if agent_id:
            params += f"&agent_id={agent_id}"
        return await self._sdk._post(f"/memory/working?{params}", method="DELETE")

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
        limit: int = 50,
        since: str | None = None,
        until: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """List episodic memories with filters."""
        params: dict[str, str] = {"limit": str(limit)}
        if agent_id:
            params["agent_id"] = agent_id
        if event_type:
            params["event_type"] = event_type
        if since:
            params["since"] = since
        if until:
            params["until"] = until
        return await self._sdk._get("/memory/episodic", params)

    async def invalidate_episode(self, episode_id: str) -> dict[str, Any] | None:
        """Mark an episode as no longer valid."""
        return await self._sdk._post(f"/memory/episodic/{episode_id}/invalidate", {}, method="PATCH")

    # ── Tier 3: Semantic Memory ─────────────────────────

    async def store_triple(
        self,
        subject: str,
        relation: str,
        object_: str,
        confidence: float | None = None,
        source_type: str | None = None,
    ) -> dict[str, Any] | None:
        """Store or strengthen a knowledge triple."""
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
        object_: str | None = None,
        min_confidence: float = 0.0,
        limit: int = 50,
    ) -> list[dict[str, Any]] | None:
        """Query knowledge triples."""
        params: dict[str, str] = {
            "min_confidence": str(min_confidence),
            "limit": str(limit),
        }
        if subject:
            params["subject"] = subject
        if relation:
            params["relation"] = relation
        if object_:
            params["object"] = object_
        return await self._sdk._get("/memory/semantic", params)

    async def delete_triple(self, triple_id: str) -> dict[str, Any] | None:
        """Delete a semantic triple."""
        return await self._sdk._post(f"/memory/semantic/{triple_id}", method="DELETE")

    # ── Hybrid Recall ───────────────────────────────────

    async def recall(
        self,
        query: str,
        mode: Literal["quick", "standard", "deep"] = "standard",
        agent_id: str | None = None,
        session_id: str | None = None,
        temporal_window: str | None = None,
        max_results: int = 20,
    ) -> dict[str, Any] | None:
        """
        Fused retrieval across all three memory tiers.

        Args:
            query: Search query
            mode: quick (~1.5K tokens) | standard (~3K) | deep (~8K+)
            temporal_window: e.g. '7d', '24h', '30d'
        """
        return await self._sdk._post("/memory/recall", {
            "query": query,
            "mode": mode,
            "agent_id": agent_id,
            "session_id": session_id,
            "temporal_window": temporal_window,
            "max_results": max_results,
        })

    async def stats(self) -> dict[str, Any] | None:
        """Get memory statistics across all tiers."""
        return await self._sdk._get("/memory/stats")
