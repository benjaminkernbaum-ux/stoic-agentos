"""
Reflection Client — AI-Powered Knowledge Extraction + Memory Decay

- run()   — Extract semantic triples from episodic memories using Claude
- decay() — Clean up expired/stale memories across all tiers
- status() — Get timestamps of last reflection and decay cycles
"""

from __future__ import annotations

from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from stoicos.client import StoicOS


class Reflection:
    """AI-powered knowledge extraction and memory lifecycle management."""

    def __init__(self, sdk: StoicOS):
        self._sdk = sdk

    async def run(self) -> dict[str, Any] | None:
        """
        Run Claude-powered reflection.

        Extracts semantic knowledge triples from the 20 most recent
        episodic memories and inserts them into semantic memory.

        Requires an Anthropic API key configured on the org.

        Returns:
            triplets_extracted: number of triples inserted
            episodes_processed: number of episodes analyzed
            model: Claude model used
        """
        return await self._sdk._post("/reflection/run", {})

    async def decay(self) -> dict[str, Any] | None:
        """
        Trigger memory decay cycle.

        - Tier 1: Delete expired working memory (past TTL)
        - Tier 2: Reduce importance of episodes older than 30 days
        - Tier 3: Reduce confidence of semantic triples older than 60 days

        Returns:
            working_expired: number of working memory entries deleted
            episodic_decayed: number of episodes with reduced importance
            semantic_decayed: number of triples with reduced confidence
        """
        return await self._sdk._post("/reflection/decay", {})

    async def status(self) -> dict[str, Any] | None:
        """Get timestamps of last reflection run and last decay cycle."""
        return await self._sdk._get("/reflection/status")
