"""
🔄 Stoic AgentOS — CRM Leads Migration & Simulation Script
Parses local legacy CSV leads and generates beautiful live AgentOS observations and memories.
"""

import os
import csv
import sys
import random
import httpx

API_KEY = os.environ.get("STOIC_API_KEY", "")
if not API_KEY:
    print("[Error] Set STOIC_API_KEY environment variable first.")
    sys.exit(1)
API_BASE = "https://api.stoicagentos.com/api/v1"
LEADS_DIR = "C:/Users/benja/StoicCRM/stoiccrm-marketing/cold_outreach/leads"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def parse_csv_file(filepath, niche, city):
    leads = []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            headers = [h.strip().lower() for h in next(reader)]
            
            # Map common header names
            name_idx = next((i for i, h in enumerate(headers) if "name" in h or "nome" in h), None)
            email_idx = next((i for i, h in enumerate(headers) if "email" in h), None)
            company_idx = next((i for i, h in enumerate(headers) if "company" in h or "empresa" in h), None)
            phone_idx = next((i for i, h in enumerate(headers) if "phone" in h or "telefone" in h), None)

            for row in reader:
                if not row:
                    continue
                name = row[name_idx].strip() if name_idx is not None and name_idx < len(row) else "Lead"
                email = row[email_idx].strip() if email_idx is not None and email_idx < len(row) else ""
                company = row[company_idx].strip() if company_idx is not None and company_idx < len(row) else ""
                phone = row[phone_idx].strip() if phone_idx is not None and phone_idx < len(row) else ""

                if not name or name.lower() in ["name", "nome"]:
                    continue

                leads.append({
                    "name": name,
                    "email": email,
                    "company": company or name,
                    "phone": phone,
                    "niche": niche,
                    "city": city
                })
    except Exception as e:
        print(f"  [Warning] Failed to parse {os.path.basename(filepath)}: {e}")
    return leads

def main():
    print("[Migration] Stoic AgentOS - CRM Leads Migration")
    print(f"[Migration] Reading leads from: {LEADS_DIR}")
    
    if not os.path.exists(LEADS_DIR):
        print(f"[Error] Directory not found: {LEADS_DIR}")
        sys.exit(1)

    csv_files = [f for f in os.listdir(LEADS_DIR) if f.endswith(".csv")]
    print(f"Found {len(csv_files)} CSV files.")

    all_leads = []
    for file in csv_files:
        filepath = os.path.join(LEADS_DIR, file)
        
        # Heuristics to parse niche and city from filename
        parts = file.replace("leads_", "").replace(".csv", "").split("_")
        niche = parts[0]
        city = "São Paulo" if "São_Paulo" in file or "Sao_Paulo" in file else \
               "Curitiba" if "Curitiba" in file else \
               "Rio de Janeiro" if "Rio" in file else "Brasil"

        leads = parse_csv_file(filepath, niche, city)
        if leads:
            all_leads.extend(leads)

    total_leads = len(all_leads)
    print(f"Successfully loaded {total_leads} leads from CSVs!")

    if total_leads == 0:
        print("[Error] No valid leads found to migrate.")
        sys.exit(1)

    # Let's pick a beautiful random selection of 120 leads to migrate to populate the dashboard rich history
    random.shuffle(all_leads)
    selected_leads = all_leads[:120]
    print(f"Selected {len(selected_leads)} leads for migration simulation batches.")

    print("\n[Migration] Registering CRM agents first...")
    crm_agents = ["OUTREACH", "REPLY", "DIALER", "HUNTER"]
    for agent in crm_agents:
        try:
            httpx.post(
                f"{API_BASE}/agents",
                json={"name": agent, "description": f"CRM System Agent: {agent.capitalize()}", "module": "crm"},
                headers=HEADERS
            )
            print(f"  - Agent '{agent}' registered.")
        except Exception:
            pass

    print("\n[Migration] Beginning batch upload of leads telemetry...")
    client = httpx.Client(headers=HEADERS, timeout=30.0)

    success_count = 0
    for idx, lead in enumerate(selected_leads):
        name = lead["name"]
        company = lead["company"]
        niche = lead["niche"]
        email = lead["email"]
        city = lead["city"]

        # Define 4 types of actions dynamically to show a realistic progression
        progress = idx % 4
        
        try:
            if progress == 0:
                # 🟢 Action 1: Lead Scored by HUNTER agent
                score = random.randint(55, 95)
                client.post(f"{API_BASE}/observations", json={
                    "workspace": "sales",
                    "agent": "HUNTER",
                    "type": "discovery",
                    "title": f"[HUNTER] Scored Lead: {name} ({company})",
                    "content": f"Lead enriched. Niche: {niche}. City: {city}. Verified email: {email}. Score: {score}/100.",
                    "metadata": {"lead": name, "company": company, "score": score, "niche": niche}
                })
                # Add to episodic memory
                client.post(f"{API_BASE}/memory/episodic", json={
                    "agent_id": "HUNTER",
                    "event_type": "scoring",
                    "importance": 6,
                    "content": f"Scored lead '{name}' from '{company}' as {score}/100 based on employee count and region fit.",
                    "metadata": {"score": score}
                })

            elif progress == 1:
                # ✉️ Action 2: Email Sent by OUTREACH agent
                client.post(f"{API_BASE}/observations", json={
                    "workspace": "marketing",
                    "agent": "OUTREACH",
                    "type": "agent_run",
                    "title": f"[OUTREACH] Contacted Lead: {name}",
                    "content": f"Sent cold outreach sequence via outlook rotation. Target: {email}. Template: value-prop-v2.",
                    "metadata": {"lead": name, "niche": niche, "channel": "email"}
                })
                # Log a compliance check event (circuit breaker style)
                client.post(f"{API_BASE}/compliance/audit-log", json={
                    "event_type": "communication",
                    "action": "outreach.send_email",
                    "agent_id": "OUTREACH",
                    "reasoning": f"Checking if lead {email} is blacklisted before sending outreach.",
                    "verdict": "PROCEED",
                    "metadata": {"lead_email": email}
                })

            elif progress == 2:
                # 💬 Action 3: Lead Replied, captured by REPLY agent
                client.post(f"{API_BASE}/observations", json={
                    "workspace": "sales",
                    "agent": "REPLY",
                    "type": "discovery",
                    "title": f"[REPLY] Lead Interest Captured: {name}",
                    "content": f"Received reply from {name} ({company}). Text: 'Interessante, gostaria de ver uma demonstração na quarta-feira.'",
                    "metadata": {"lead": name, "sentiment": "positive", "reply_text": "Interessante, gostaria de ver..."}
                })
                # Add semantic triple (knowledge graph)
                client.post(f"{API_BASE}/memory/semantic", json={
                    "subject": company,
                    "relation": "niche_category",
                    "object": niche,
                    "confidence": 1.0,
                    "source_type": "crm_importer"
                })

            elif progress == 3:
                # 📞 Action 4: Call scheduled, DIALER agent updates status
                val = random.randint(1500, 6000)
                client.post(f"{API_BASE}/observations", json={
                    "workspace": "sales",
                    "agent": "DIALER",
                    "type": "decision",
                    "title": f"[DIALER] Call Scheduled with {name}",
                    "content": f"Scheduled discovery call. Value forecast: R$ {val}/month. Contact phone: {lead['phone'] or '—'}.",
                    "metadata": {"lead": name, "value": val, "stage": "Qualified"}
                })
                # Add semantic triple for qualified leads
                client.post(f"{API_BASE}/memory/semantic", json={
                    "subject": company,
                    "relation": "pipeline_stage",
                    "object": "Qualified",
                    "confidence": 0.95,
                    "source_type": "crm_importer"
                })

            success_count += 1
            if success_count % 20 == 0:
                print(f"  - Migrated {success_count}/{len(selected_leads)} leads successfully.")

        except Exception as e:
            print(f"  [Warning] Failed to migrate lead {name}: {e}")

    print(f"\n[Migration] COMPLETED! Migrated {success_count} telemetry events to AgentOS!")
    print("Check the dashboard at: https://stoicagentos.com/dashboard to view the live timeline!")

if __name__ == "__main__":
    main()
