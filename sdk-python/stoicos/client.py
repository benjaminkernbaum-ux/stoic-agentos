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
        tags: list[str] | None = None,
    ) -> dict[str, Any] | None:
        """Capture an observation.

        tags: optional list of up to 5 labels (≤20 chars each) — over-limit
        entries are trimmed client-side to match server-side validation.
        """
        payload: dict[str, Any] = {
            "workspace": self.workspace,
            "type": type,
            "title": title,
            "content": content,
            "agent": agent,
            "metadata": metadata or {},
        }
        if tags:
            clean = [t.strip()[:20] for t in tags if isinstance(t, str) and t.strip()]
            if clean:
                payload["tags"] = clean[:5]
        return await self._post("/observations", payload)

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
                            metadata={"event": "error", "duration_ms": duration_ms, "error_name": e.__class__.__name__},
                        )
                        await self.agent_heartbeat(name=name, status="error")
                        raise e
                return async_wrapper
            else:
                @functools.wraps(func)
                def sync_wrapper(*args, **kwargs):
                    import concurrent.futures
                    start_time = time.time()

                    def _fire_async(coro):
                        """Run an async coroutine from sync context, even inside a running loop."""
                        try:
                            loop = asyncio.get_running_loop()
                        except RuntimeError:
                            loop = None

                        if loop and loop.is_running():
                            # Schedule on the existing running loop and wait for result
                            future = asyncio.run_coroutine_threadsafe(coro, loop)
                            # Don't block — the coro will run when the loop is free
                            return None
                        else:
                            return asyncio.run(coro)

                    try:
                        _fire_async(self.capture(
                            type="agent_run",
                            title=f"[{name}] Started",
                            agent=name,
                            metadata={"event": "start", "args_count": len(args)},
                        ))
                        _fire_async(self.agent_heartbeat(name=name, status="running"))
                    except Exception:
                        pass  # Don't fail the function if telemetry fails

                    try:
                        result = func(*args, **kwargs)
                        duration_ms = int((time.time() - start_time) * 1000)
                        try:
                            _fire_async(self.capture(
                                type="agent_run",
                                title=f"[{name}] ✅ Success ({duration_ms}ms)",
                                agent=name,
                                metadata={"event": "success", "duration_ms": duration_ms},
                            ))
                            _fire_async(self.agent_heartbeat(name=name, status="success"))
                        except Exception:
                            pass
                        return result
                    except Exception as e:
                        duration_ms = int((time.time() - start_time) * 1000)
                        import traceback
                        try:
                            _fire_async(self.capture(
                                type="error",
                                title=f"[{name}] ❌ Error: {str(e)}",
                                content=traceback.format_exc(),
                                agent=name,
                                metadata={"event": "error", "duration_ms": duration_ms, "error_name": e.__class__.__name__},
                            ))
                            _fire_async(self.agent_heartbeat(name=name, status="error"))
                        except Exception:
                            pass
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
    # CLAUDE INSIGHTS (AI Insights)
    # ═══════════════════════════════════

    async def summarize(
        self,
        hours: int = 24,
        agent_id: str | None = None,
        workspace_id: str | None = None,
    ) -> dict[str, Any] | None:
        """Get an AI-powered summary of recent observations."""
        body: dict[str, Any] = {"hours": hours}
        if agent_id:
            body["agent_id"] = agent_id
        if workspace_id:
            body["workspace_id"] = workspace_id
        return await self._post("/insights/summarize", body)

    async def analyze_agent(self, agent_id: str) -> dict[str, Any] | None:
        """Diagnose an agent's reliability using Claude Sonnet."""
        return await self._post("/insights/analyze-agent", {"agent_id": agent_id})

    async def ask(
        self,
        question: str,
        model: str = "fast",
        force_fresh: bool = False,
    ) -> dict[str, Any] | None:
        """Ask free-form questions about your agent fleet, grounded in logs."""
        return await self._post("/insights/ask", {
            "question": question,
            "model": model,
            "force_fresh": force_fresh,
        })

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
        last_err: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                resp = await self._client.request("DELETE", f"{self.api_url}{path}", params=params)

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
