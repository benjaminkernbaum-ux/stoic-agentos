import sys
from supabase import create_client, Client
import os

FLAGSHIP_URL = os.environ.get("SUPABASE_URL", "https://viiagdhtzbvkfhcjqrlz.supabase.co")
FLAGSHIP_KEY = os.environ.get("SUPABASE_ANON_KEY", "")

def main():
    print("[Test] Connecting to Supabase...")
    client: Client = create_client(FLAGSHIP_URL, FLAGSHIP_KEY)
    
    print("[Test] Trying to insert observation...")
    try:
        # Default org_id from the verified logs is '06765767-e0a6-4fe0-9a82-0a229830e095'
        response = client.table("observations").insert({
            "org_id": "06765767-e0a6-4fe0-9a82-0a229830e095",
            "workspace_id": "engineering",
            "agent_id": "STOICBOT",
            "type": "note",
            "title": "[Test] Remote migration test connection",
            "content": "Verifying direct Supabase anon key write connectivity.",
            "importance": 6
        }).execute()
        
        print(f"[Test] Success! Inserted observation: {response.data}")
    except Exception as e:
        print(f"[Test] Failed: {e}")

if __name__ == "__main__":
    main()
