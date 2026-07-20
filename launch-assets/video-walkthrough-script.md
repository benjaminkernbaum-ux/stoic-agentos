# 🎬 Stoic AgentOS — Video Walkthrough Script

> **Duration:** 3:30–4:00  
> **Format:** Screen recording with voiceover  
> **Tools:** OBS Studio (free) or Loom  
> **Resolution:** 1920×1080, dark background terminal + browser

---

## PRE-RECORDING CHECKLIST

- [ ] Dashboard loaded at stoicagentos.com with your account logged in
- [ ] At least 3-5 agents visible with recent activity/heartbeats
- [ ] Knowledge items populated (at least 5-10 entries)
- [ ] Graph tab showing connected nodes
- [ ] Terminal open with a fresh project folder ready
- [ ] `stoic-agentos-sdk` NOT yet installed in the demo project (we install live)
- [ ] Background noise eliminated, mic tested

---

## SCENE 1 — HOOK (0:00–0:15)

**[Screen: Terminal, black background]**

> **Narration:**
> "You're running AI agents in production. They crash at 3 AM. They forget everything between sessions. And you have zero visibility into what they're doing.
>
> This is Stoic AgentOS — the open-source command center for AI agent fleets. Let me show you how it works."

---

## SCENE 2 — THE DASHBOARD (0:15–0:55)

**[Screen: Switch to browser → stoicagentos.com dashboard]**

> **Narration:**
> "This is your fleet overview. Every agent you deploy shows up here with real-time heartbeats, status, and error tracking."

**[ACTION: Hover over agents, show green/yellow/red status indicators]**

> "You can see which agents are active, which ones have errored, and when each one last checked in."

**[ACTION: Click into an agent → show its observation history]**

> "Drill into any agent to see its full execution history — every decision, every tool call, every output — timestamped and searchable."

**[ACTION: Switch to Knowledge tab]**

> "And this is the knowledge persistence layer. Unlike other tools, AgentOS gives your agents long-term memory. Decisions, architecture notes, patterns — they persist across sessions so your agents stop repeating the same mistakes."

---

## SCENE 3 — THE GRAPH (0:55–1:15)

**[ACTION: Switch to Graph tab → interactive force-directed visualization]**

> **Narration:**
> "The knowledge graph shows how your agents, workspaces, and knowledge items connect. You can see the relationships between agents, what they know, and how they coordinate."

**[ACTION: Drag nodes, zoom in/out, hover to show connections]**

> "This isn't just visualization — it's how your agent fleet builds organizational intelligence over time."

---

## SCENE 4 — SDK INTEGRATION (1:15–2:15)

**[Screen: Switch to terminal — split screen with terminal + code editor]**

> **Narration:**
> "Let me show you how fast you can add an agent. Three lines of code."

**[ACTION: Type in terminal]**
```bash
npm install stoic-agentos-sdk
```

> "Install the SDK..."

**[ACTION: Open a new file `demo-agent.js` in editor, type:]**

```javascript
import { AgentOS } from 'stoic-agentos-sdk';

const os = new AgentOS({
  apiKey: 'sk_live_your_key_here',
  workspace: 'demo',
});

// Wrap any function → auto-captures start, success, and errors
const myAgent = os.wrapAgent('invoice-processor', async (input) => {
  console.log(`Processing invoice: ${input.invoiceId}`);
  // your existing logic here
  return { status: 'processed', total: 1250.00 };
});

// Run it
await myAgent({ invoiceId: 'INV-001' });
```

> "Three lines to initialize. Wrap your existing function with `wrapAgent`. That's it — your agent is now monitored."

**[ACTION: Run `node demo-agent.js` in terminal]**

> "Run it..."

**[ACTION: Switch to browser, refresh dashboard]**

> "And there it is. The 'invoice-processor' agent appeared in your dashboard within seconds. Start time, completion status, execution duration — all captured automatically."

---

## SCENE 5 — CLAUDE DIAGNOSTICS (2:15–3:00)

**[ACTION: Switch to the AI Chat tab in dashboard]**

> **Narration:**
> "Now here's where it gets powerful. AgentOS has a built-in AI assistant powered by Claude. You can ask it anything about your fleet."

**[ACTION: Type in chat: "Summarize what happened this week"]**

> "Ask for a weekly briefing..."

**[ACTION: Show the streaming response with the summary]**

> "It analyzes all your agent activity and gives you a concise operational briefing."

**[ACTION: Type: "Why did the email-agent fail yesterday?"]**

> "Or ask it to diagnose a failure. It reads the traces, checks the knowledge base, and gives you a root cause analysis."

> "And if you want to use your own Anthropic key instead of ours, just add it in Settings. Your key is encrypted in Supabase Vault — we never see it in plaintext."

---

## SCENE 6 — SELF-HOSTING + CTA (3:00–3:30)

**[Screen: Terminal]**

> **Narration:**
> "One more thing: you can self-host the entire platform."

**[ACTION: Show the three commands on screen]**
```bash
git clone https://github.com/benjaminkernbaum-ux/stoic-agentos.git
cp .env.selfhost.example .env
docker compose up -d
```

> "Three commands. Your data stays on your servers."

**[Screen: Show the GitHub repo page]**

> "Stoic AgentOS is MIT-licensed and fully open source. Star us on GitHub, try the free tier at stoicagentos.com, or self-host it today."

> "Link in the description. Thanks for watching."

**[END CARD: GitHub URL + stoicagentos.com + npm install stoic-agentos-sdk]**

---

## POST-PRODUCTION NOTES

1. **Thumbnail:** Dashboard screenshot with "⚡ Command Center for AI Agents" text overlay
2. **Music:** Subtle lo-fi background (optional, very low volume)
3. **Speed:** Keep pacing quick. Cut pauses. Speed up terminal output 2x.
4. **Captions:** Add auto-captions (YouTube built-in or Descript)
5. **Description:** Include links to GitHub, npm, stoicagentos.com, and Discord
6. **Tags:** AI agents, observability, monitoring, open source, LLM, developer tools, agent framework
