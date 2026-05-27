"""
Stoic AgentOS Python SDK
Official SDK for AI Agent Operations Platform

Usage:
    import asyncio
    from stoicos import StoicOS

    async def main():
        async with StoicOS(api_key="sk_live_xxx") as os:
            await os.capture("decision", "Switched to GPT-4o")
            result = await os.memory.recall("deployment config")
            await os.compliance.log_event("tool_call", "search_web")

    asyncio.run(main())
"""

from stoicos.client import StoicOS
from stoicos.memory import Memory
from stoicos.compliance import Compliance
from stoicos.errors import AgentOSError, AuthError, ValidationError, RateLimitError

__version__ = "1.0.0"
__all__ = [
    "StoicOS", "Memory", "Compliance",
    "AgentOSError", "AuthError", "ValidationError", "RateLimitError",
]
