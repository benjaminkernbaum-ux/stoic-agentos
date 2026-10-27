"""
Mock tests for stoicos.StoicOS client.

Uses httpx.MockTransport (built-in) — no real network calls, no extra deps
beyond pytest itself. Async coroutines are driven with asyncio.run() from
sync test functions to avoid a hard dependency on pytest-asyncio.
"""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from stoicos import StoicOS
from stoicos.errors import AuthError, RateLimitError


# ── Helpers ─────────────────────────────────────────────────


class Recorder:
    """Captures the requests a mocked transport sees."""

    def __init__(self):
        self.requests: list[httpx.Request] = []


def make_client(handler):
    """
    Build a StoicOS pointed at a MockTransport. The handler is a callable
    (request) -> httpx.Response.
    """
    os_client = StoicOS(api_key="sk_test_mock", workspace="tests", max_retries=1)
    # Swap the internal AsyncClient for one wired to our mock transport,
    # preserving the auth/UA headers the real client sets.
    os_client._client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        headers={
            "Authorization": f"Bearer {os_client.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "stoicos-python/1.0.0",
        },
    )
    return os_client


def run(coro):
    return asyncio.run(coro)


# ── Init ────────────────────────────────────────────────────


def test_init_uses_defaults_and_strips_trailing_slash():
    os_client = StoicOS(api_key="sk_test_1", api_url="https://api.example.com/api/v1/")
    assert os_client.api_key == "sk_test_1"
    assert os_client.api_url == "https://api.example.com/api/v1"  # trailing slash stripped
    assert os_client.workspace == "default"


def test_init_reads_env_when_no_key(monkeypatch):
    monkeypatch.setenv("AGENTOS_API_KEY", "sk_test_env")
    os_client = StoicOS()
    assert os_client.api_key == "sk_test_env"


# ── capture(): payload shape ────────────────────────────────


def test_capture_sends_expected_payload():
    rec = Recorder()

    def handler(request: httpx.Request) -> httpx.Response:
        rec.requests.append(request)
        return httpx.Response(201, json={"id": "obs_1"})

    async def run_it():
        async with make_client(handler) as os_client:
            result = await os_client.capture(
                type="decision",
                title="Switched to GPT-4o",
                content="Latency was 200ms lower.",
                agent="planner",
            )
            return result

    result = run(run_it())
    assert result == {"id": "obs_1"}
    assert len(rec.requests) == 1
    body = json.loads(rec.requests[0].content)
    assert body["type"] == "decision"
    assert body["title"] == "Switched to GPT-4o"
    assert body["agent"] == "planner"
    assert body["workspace"] == "tests"
    assert body["metadata"] == {}
    assert "tags" not in body  # no tags passed → omitted


def test_capture_with_tags_is_sanitized():
    rec = Recorder()

    def handler(request: httpx.Request) -> httpx.Response:
        rec.requests.append(request)
        return httpx.Response(201, json={"id": "obs_tagged"})

    async def run_it():
        async with make_client(handler) as os_client:
            await os_client.capture(
                type="error",
                title="DB timeout",
                # 7 tags provided; one is empty; one exceeds 20 chars → sanitized.
                tags=["db", "critical", "", "prod", "  ", "extra1", "x" * 30],
            )

    run(run_it())
    body = json.loads(rec.requests[0].content)
    assert "tags" in body
    assert len(body["tags"]) <= 5
    assert all(len(t) <= 20 for t in body["tags"])
    assert "" not in body["tags"]
    assert "db" in body["tags"] and "critical" in body["tags"]


# ── Errors ──────────────────────────────────────────────────


def test_capture_raises_auth_error_on_401():
    def handler(_):
        return httpx.Response(401, json={"error": "Invalid API key"})

    async def run_it():
        async with make_client(handler) as os_client:
            await os_client.capture(type="note", title="hi")

    with pytest.raises(AuthError):
        run(run_it())


def test_capture_raises_rate_limit_after_retries_exhausted():
    """After max_retries, a persistent 429 should raise RateLimitError."""

    def handler(_):
        return httpx.Response(429, json={"error": "Rate limited"})

    async def run_it():
        # max_retries=1 → 1 retry then the final 429 raises RateLimitError
        async with make_client(handler) as os_client:
            await os_client.capture(type="note", title="hi")

    with pytest.raises(RateLimitError):
        run(run_it())


def test_capture_returns_none_on_500_without_raising():
    """Non-auth/rate-limit 5xx should degrade gracefully (return None)."""

    def handler(_):
        return httpx.Response(500, text="boom")

    async def run_it():
        async with make_client(handler) as os_client:
            return await os_client.capture(type="note", title="hi")

    assert run(run_it()) is None


def test_capture_retries_on_network_error_then_succeeds():
    """A transient transport error should be retried, not swallowed silently."""
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("boom")
        return httpx.Response(201, json={"id": "obs_ok"})

    async def run_it():
        async with make_client(handler) as os_client:
            # StoicOS internal retry loop sleeps ~0.5s * 2^attempt, patch it out
            # to keep the test fast.
            original_sleep = asyncio.sleep
            async def fast_sleep(_):
                return await original_sleep(0)
            import stoicos.client as sc
            sc.asyncio.sleep = fast_sleep  # type: ignore[attr-defined]
            try:
                return await os_client.capture(type="note", title="hi")
            finally:
                sc.asyncio.sleep = original_sleep  # type: ignore[attr-defined]

    assert run(run_it()) == {"id": "obs_ok"}
    assert calls["n"] == 2  # first failed, second succeeded


# ── agent_heartbeat() ───────────────────────────────────────


def test_agent_heartbeat_posts_status():
    rec = Recorder()

    def handler(request: httpx.Request) -> httpx.Response:
        rec.requests.append(request)
        return httpx.Response(200, json={"ok": True})

    async def run_it():
        async with make_client(handler) as os_client:
            await os_client.agent_heartbeat(name="planner", status="running")

    run(run_it())
    assert rec.requests[0].url.path.endswith("/agents/heartbeat")
    body = json.loads(rec.requests[0].content)
    assert body["name"] == "planner"
    assert body["status"] == "running"


# ── wrap_agent(): decorator tracks start/end and re-raises errors ──


def test_wrap_agent_records_success_and_returns_result():
    posted: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        posted.append({
            "path": request.url.path,
            "body": json.loads(request.content) if request.content else {},
        })
        return httpx.Response(200, json={"ok": True})

    async def run_it():
        async with make_client(handler) as os_client:
            @os_client.wrap_agent("planner")
            async def do_work(x):
                return x * 2

            return await do_work(21)

    assert run(run_it()) == 42

    # Expect at least one agent_run "Started" capture and one "Success" capture.
    started = [p for p in posted if p["body"].get("title", "").endswith("Started")]
    succeeded = [p for p in posted if "Success" in p["body"].get("title", "")]
    assert started, "expected a Started observation"
    assert succeeded, "expected a Success observation"


def test_wrap_agent_captures_error_and_reraises():
    captured_types: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content) if request.content else {}
        if "type" in body:
            captured_types.append(body["type"])
        return httpx.Response(200, json={"ok": True})

    async def run_it():
        async with make_client(handler) as os_client:
            @os_client.wrap_agent("planner")
            async def do_work():
                raise RuntimeError("kaboom")

            await do_work()

    with pytest.raises(RuntimeError, match="kaboom"):
        run(run_it())

    assert "error" in captured_types, f"expected an error observation; saw {captured_types}"
