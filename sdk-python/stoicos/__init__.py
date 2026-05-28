"""
Stoic AgentOS Python SDK
Official SDK for AI Agent Operations Platform

Usage:
    import asyncio
    from stoicos import StoicOS

    async def main():
        async with StoicOS(api_key="sk_live_xxx") as os:
            await os.capture("decision", "Switched to GPT-4o")
            await os.memory.record_episode("deployed v3", importance=8)
            await os.compliance.log_event("tool_call", "search_web")
            await os.reflection.run()  # extract knowledge

    asyncio.run(main())
"""

from stoicos.client import StoicOS
from stoicos.memory import Memory
from stoicos.compliance import Compliance
from stoicos.reflection import Reflection
from stoicos.errors import AgentOSError, AuthError, ValidationError, RateLimitError

__version__ = "1.0.0"
__all__ = [
    "StoicOS", "Memory", "Compliance", "Reflection",
    "AgentOSError", "AuthError", "ValidationError", "RateLimitError",
]
