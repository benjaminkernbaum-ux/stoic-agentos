"""
StoicOS Python SDK — Main Client

Usage:
    async with StoicOS(api_key="sk_live_xxx") as os:
        await os.capture("decision", "Switched model")
        stats = await os.get_stats()
"""

from __future__ import annotations

import asyncio
import os as _os
from typing import Any, Optional

import httpx

from stoicos.errors import AgentOSError, AuthError, RateLimitError
from stoicos.memory import Memory
from stoicos.compliance import Compliance
from stoicos.reflection import Reflection

DEFAULT_API_URL = "https://api.stoicagentos.com/api/v1"

VALID_TYPES = [
    "note", "decision", "architecture", "deployment", "discovery",
    "file_edit", "error", "git_commit", "agent_run", "command",
    "dependency", "config",
]


class StoicOS:
    """Main client for the Stoic AgentOS platform."""

    def __init__(
        self,
        api_key: str | None = None,
        api_url: str | None = None,
        workspace: str = "default",
        debug: bool = False,
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        self.api_key = api_key or _os.environ.get("AGENTOS_API_KEY", "")
        self.api_url = (api_url or _os.environ.get("AGENTOS_API_URL", DEFAULT_API_URL)).rstrip("/")
        self.workspace = workspace
        self.debug = debug
        self._max_retries = max_retries
        self._client = httpx.AsyncClient(
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "stoicos-python/1.0.0",
            },
        )
        self._memory: Memory | None = None
        self._compliance: Compliance | None = None
        self._reflection: Reflection | None = None

    async def __aenter__(self) -> StoicOS:
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.shutdown()

    # ═══════════════════════════════════
    # OBSERVATIONS
    # ═══════════════════════════════════

    async def capture(
        self,
        type: str = "note",
        title: str = "",
        content: str = "",
        agent: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        """Capture an observation."""
        return await self._post("/observations", {
            "workspace": self.workspace,
            "type": type,
            "title": title,
            "content": content,
            "agent": agent,
            "metadata": metadata or {},
        })

    async def get_observations(
        self,
        limit: int = 50,
        type: str | None = None,
        workspace: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """List recent observations."""
        params: dict[str, str] = {"limit": str(limit)}
        if type:
            params["type"] = type
        if workspace:
            params["workspace"] = workspace
        return await self._get("/observations", params)

    # ═══════════════════════════════════
    # AGENTS
    # ═══════════════════════════════════

    async def register_agent(
        self,
        name: str,
        description: str = "",
        module: str = "standalone",
    ) -> dict[str, Any] | None:
        """Register a new agent."""
        return await self._post("/agents", {
            "name": name,
            "description": description,
            "module": module,
            "status": "idle",
        })

    async def agent_heartbeat(
        self,
        name: str,
        status: str,
        description: str = "",
        module: str = "standalone",
    ) -> dict[str, Any] | None:
        """Send a heartbeat to update agent status and run/error counters."""
        return await self._post("/agents/heartbeat", {
            "name": name,
            "status": status,
            "description": description,
            "module": module,
        })

    def wrap_agent(self, name: str):
        """
        Decorator to wrap an agent function.
        Automatically logs: agent_run (start), agent_run (success/error), creates a trace,
        and updates heartbeats.
        Supports both async and sync functions.
        """
        import functools
        import time

        def decorator(func):
            if asyncio.iscoroutinefunction(func):
                @functools.wraps(func)
                async def async_wrapper(*args, **kwargs):
                    start_time = time.time()
                    await self.capture(
                        type="agent_run",
                        title=f"[{name}] Started",
                        agent=name,
                        metadata={"event": "start", "args_count": len(args)},
                    )
                    await self.agent_heartbeat(name=name, status="running")
                    try:
                        result = await func(*args, **kwargs)
                        duration_ms = int((time.time() - start_time) * 1000)
                        await self.capture(
                            type="agent_run",
                            title=f"[{name}] ✅ Success ({duration_ms}ms)",
                            agent=name,
                            metadata={"event": "success", "duration_ms": duration_ms},
                        )
                        await self.agent_heartbeat(name=name, status="success")
                        return result
                    except Exception as e:
                        duration_ms = int((time.time() - start_time) * 1000)
                        import traceback
                        await self.capture(
                            type="error",
                            title=f"[{name}] ❌ Error: {str(e)}",
                            content=traceback.format_exc(),
                            agent=name,
                            metadata={"event": "error", "duration_ms": duration_ms, "error_name": type(e).__name__},
                        )
                        await self.agent_heartbeat(name=name, status="error")
                        raise e
                return async_wrapper
            else:
                @functools.wraps(func)
                def sync_wrapper(*args, **kwargs):
                    start_time = time.time()

                    def run_async(coro):
                        try:
                            loop = asyncio.get_event_loop()
                        except RuntimeError:
                            loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(loop)
                        if loop.is_running():
                            return asyncio.ensure_future(coro)
                        else:
                            return loop.run_until_complete(coro)

                    run_async(self.capture(
                        type="agent_run",
                        title=f"[{name}] Started",
                        agent=name,
                        metadata={"event": "start", "args_count": len(args)},
                    ))
                    run_async(self.agent_heartbeat(name=name, status="running"))

                    try:
                        result = func(*args, **kwargs)
                        duration_ms = int((time.time() - start_time) * 1000)
                        run_async(self.capture(
                            type="agent_run",
                            title=f"[{name}] ✅ Success ({duration_ms}ms)",
                            agent=name,
                            metadata={"event": "success", "duration_ms": duration_ms},
                        ))
                        run_async(self.agent_heartbeat(name=name, status="success"))
                        return result
                    except Exception as e:
                        duration_ms = int((time.time() - start_time) * 1000)
                        import traceback
                        run_async(self.capture(
                            type="error",
                            title=f"[{name}] ❌ Error: {str(e)}",
                            content=traceback.format_exc(),
                            agent=name,
                            metadata={"event": "error", "duration_ms": duration_ms, "error_name": type(e).__name__},
                        ))
                        run_async(self.agent_heartbeat(name=name, status="error"))
                        raise e
                return sync_wrapper
        return decorator

    # ═══════════════════════════════════
    # STATS & TRACES
    # ═══════════════════════════════════

    async def get_stats(self) -> dict[str, Any] | None:
        """Get dashboard statistics."""
        return await self._get("/stats")

    async def get_traces(
        self,
        limit: int = 50,
        agent: str | None = None,
        status: str | None = None,
    ) -> list[dict[str, Any]] | None:
        """List traces."""
        params: dict[str, str] = {"limit": str(limit)}
        if agent:
            params["agent"] = agent
        if status:
            params["status"] = status
        return await self._get("/traces", params)

    # ═══════════════════════════════════
    # MEMORY (Three-Tier)
    # ═══════════════════════════════════

    @property
    def memory(self) -> Memory:
        """Access the three-tier memory system."""
        if not self._memory:
            self._memory = Memory(self)
        return self._memory

    # ═══════════════════════════════════
    # COMPLIANCE & AUDIT
    # ═══════════════════════════════════

    @property
    def compliance(self) -> Compliance:
        """Access the compliance and audit system."""
        if not self._compliance:
            self._compliance = Compliance(self)
        return self._compliance

    # ═══════════════════════════════════
    # REFLECTION
    # ═══════════════════════════════════

    @property
    def reflection(self) -> Reflection:
        """Access the reflection and memory decay system."""
        if not self._reflection:
            self._reflection = Reflection(self)
        return self._reflection

    # ═══════════════════════════════════
    # LIFECYCLE
    # ═══════════════════════════════════

    async def shutdown(self) -> None:
        """Graceful shutdown."""
        await self._client.aclose()

    # ═══════════════════════════════════
    # INTERNALS
    # ═══════════════════════════════════

    async def _post(self, path: str, body: dict[str, Any] | None = None, method: str = "POST") -> Any:
        """POST/PATCH/DELETE with retry."""
        last_err: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                resp = await self._client.request(method, f"{self.api_url}{path}", json=body)

                if resp.status_code == 429 and attempt < self._max_retries:
                    delay = (0.5 * (2 ** attempt))
                    if self.debug:
                        print(f"[StoicOS] Rate limited, retry in {delay:.1f}s")
                    await asyncio.sleep(delay)
                    continue

                if resp.status_code == 401:
                    raise AuthError(resp.json().get("error", "Invalid API key"))

                if resp.status_code == 429:
                    data = resp.json()
                    raise RateLimitError(data.get("error", "Rate limited"))

                if resp.status_code >= 400:
                    if self.debug:
                        print(f"[StoicOS] API error {resp.status_code}: {resp.text}")
                    return None

                return resp.json()
            except (AgentOSError,):
                raise
            except Exception as e:
                last_err = e
                if attempt < self._max_retries:
                    delay = 0.5 * (2 ** attempt)
                    if self.debug:
                        print(f"[StoicOS] Network error, retry {attempt+1}: {e}")
                    await asyncio.sleep(delay)

        if self.debug and last_err:
            print(f"[StoicOS] All {self._max_retries+1} attempts failed: {last_err}")
        return None

    async def _get(self, path: str, params: dict[str, str] | None = None) -> Any:
        """GET with retry."""
        last_err: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                resp = await self._client.get(f"{self.api_url}{path}", params=params)

                if resp.status_code == 429 and attempt < self._max_retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))
                    continue

                if resp.status_code >= 400:
                    return None

                return resp.json()
            except Exception as e:
                last_err = e
                if attempt < self._max_retries:
                    await asyncio.sleep(0.5 * (2 ** attempt))

        return None

    async def _delete(self, path: str, params: dict[str, str] | None = None) -> Any:
        """DELETE with retry."""
        return await self._post(path, method="DELETE")
