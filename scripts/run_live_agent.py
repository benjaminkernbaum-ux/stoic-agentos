"""
🤖 Stoic AgentOS — Live Agent Telemetry Simulation
Wires up a real simulated agent using the official Python SDK to send live data.

Usage:
    py scripts/run_live_agent.py --api-key sk_live_your_key
"""

import argparse
import asyncio
import os
import random
import sys

# Ensure the local sdk-python path is prioritized so we run the latest local SDK code
sdk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk-python"))
sys.path.insert(0, sdk_path)

from stoicos import StoicOS, AgentOSError


async def main():
    parser = argparse.ArgumentParser(description="Run StoicOS Live Agent Telemetry Simulation")
    parser.add_argument("--api-key", help="Stoic AgentOS API Key (sk_live_...)")
    parser.add_argument("--workspace", default="engineering", help="Workspace identifier")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("AGENTOS_API_KEY")
    if not api_key:
        print("[Error] No API Key provided.")
        print("Please provide it via --api-key or set AGENTOS_API_KEY environment variable.")
        sys.exit(1)

    print("[StoicOS] Initializing client...")
    print(f"  - Target Workspace: {args.workspace}")

    # Initialize client
    client = StoicOS(api_key=api_key, workspace=args.workspace, debug=True)

    agent_name = "STOICBOT"
    print(f"\n[StoicOS] Wiring up agent telemetry for: {agent_name}...")

    # Dynamically resolve agent UUID from platform
    print("[StoicOS] Resolving agent UUID dynamically...")
    agents = await client._get("/agents")
    agent_id = None
    if agents:
        for a in agents:
            if a.get("name") == agent_name:
                agent_id = a.get("id")
                break
    
    if agent_id:
        print(f"  - Resolved '{agent_name}' to UUID: {agent_id}")
    else:
        print(f"  - Warning: Could not find registered UUID for '{agent_name}' in database. Using name fallback.")
        agent_id = agent_name

    # Decorate sync and async functions to simulate real-world operations
    @client.wrap_agent(name=agent_name)
    async def audit_pull_request(pr_id: int, files_changed: list[str]):
        print(f"  - Auditing Pull Request #{pr_id}...")
        
        # 1. Ephemeral state in Tier 1 Working Memory
        session_id = f"pr-audit-{pr_id}-{random.randint(1000, 9999)}"
        await client.memory.set_working(
            session_id=session_id,
            key="audit_state",
            value="in_progress",
            agent_id=agent_id,
            ttl_seconds=300
        )
        
        # Simulating analysis steps
        await asyncio.sleep(0.5)
        
        # Log compliance check
        await client.compliance.log_event(
            event_type="security_check",
            action="git.scan_dependencies",
            agent_id=agent_id,
            reasoning=f"Verifying third-party dependencies in PR #{pr_id} package.json.",
            verdict="PROCEED",
            metadata={"files_count": len(files_changed)}
        )

        for filename in files_changed:
            await client.memory.record_episode(
                content=f"Scanned {filename} in PR #{pr_id} for critical patterns.",
                event_type="audit",
                importance=4,
                agent_id=agent_id
            )

        # 2. Record episodic achievement in Tier 2
        await client.memory.record_episode(
            content=f"Successfully completed vulnerability scan for PR #{pr_id}.",
            event_type="achievement",
            importance=8,
            agent_id=agent_id,
            metadata={"vulnerabilities_found": 0}
        )

        # 3. Commit persistent knowledge to Tier 3 Semantic Memory
        await client.memory.store_triple(
            subject=f"PR #{pr_id}",
            relation="vulnerability_status",
            object_="secure",
            confidence=0.99,
            source_type="git_scanner"
        )
        
        # Mark working memory task complete
        await client.memory.set_working(
            session_id=session_id,
            key="audit_state",
            value="completed",
            agent_id=agent_id,
            ttl_seconds=60
        )
        
        return {"status": "clean", "audited_files": len(files_changed)}

    @client.wrap_agent(name=agent_name)
    def deploy_release(version: str):
        print(f"  - Deploying Release {version}...")
        if "beta" in version:
            # Let's trigger a failure to demonstrate error logging and heartbeats!
            raise RuntimeError(f"Deploy failed: Unresolved peer dependencies in beta branch.")
        return "Deployed!"

    async with client:
        # Run 1: Normal agent execution (Success path)
        print("\n--- Executing Success Scenario ---")
        result = await audit_pull_request(
            pr_id=1402, 
            files_changed=["package.json", "src/auth/auth.py", "Dockerfile"]
        )
        print(f"  - Success Result: {result}")

        await asyncio.sleep(1)

        # Run 2: Failed agent execution (Error/Failure path)
        print("\n--- Executing Failure Scenario ---")
        try:
            deploy_release(version="v2.1.0-beta3")
        except RuntimeError as e:
            print(f"  - Handled Expected Simulation Error: {e}")

        # Final Dashboard Summary
        print("\n[StoicOS] Fetching fresh dashboard statistics from platform...")
        stats = await client.get_stats()
        if stats:
            print(f"  - Telemetry Successful! Live Platform Stats:")
            print(f"    Organizations: {stats.get('orgs_count', 0)}")
            print(f"    Active Agents: {stats.get('agents_count', 0)}")
            print(f"    Observations Captured: {stats.get('observations_count', 0)}")
        else:
            print("  - Could not fetch stats (verify connection).")

    print("\n[StoicOS] Live Agent Telemetry Simulation Complete! Check your dashboard at https://stoicagentos.com/dashboard")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Simulation aborted.")
