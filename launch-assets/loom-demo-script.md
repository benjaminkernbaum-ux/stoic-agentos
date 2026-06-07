# 90-Second Loom Script — Stoic AgentOS Demo

> Total runtime target: 60-90 seconds. No fluff. Show the product.

---

## PRE-RECORD CHECKLIST

- [ ] Terminal open (dark theme, large font — 16pt minimum)
- [ ] stoicagentos.com/dashboard open in browser (logged in, dark mode)
- [ ] Have a clean directory ready (e.g., `~/demo-stoic/`)
- [ ] OpenAI API key set in env (`OPENAI_API_KEY`)
- [ ] Stoic API key set in env (`AGENTOS_API_KEY`)
- [ ] Create the demo script below BEFORE recording (test it works)
- [ ] Browser tabs: only dashboard, nothing else
- [ ] Loom: record tab + screen, webcam off or small circle

---

## THE SCRIPT (Read this while recording, don't wing it)

### SHOT 1 — Install (0:00 - 0:10)

**[TERMINAL — full screen]**

Say: *"Three lines. That's it."*

Type (or paste):
```bash
npm install stoic-agentos-sdk openai
```

Wait for install to finish (~3 seconds).

---

### SHOT 2 — The Code (0:10 - 0:25)

**[TERMINAL — show the file]**

Say: *"Here's my entire agent. I add one line — instrumentClient — and every LLM call is auto-captured."*

Show this file (create it beforehand as `demo.mjs`):

```javascript
import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

const os = new AgentOS({ apiKey: process.env.AGENTOS_API_KEY });
const openai = new OpenAI();

// ← This one line captures everything
os.instrumentClient('openai', openai);

// Run a simple agent task
const trace = os.startTrace('demo-task', { agent: 'demo-agent' });

const result = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is the capital of Brazil?' }],
});

console.log('Agent says:', result.choices[0].message.content);

await trace.end();
await os.shutdown();
console.log('✅ Trace sent to Stoic AgentOS');
```

**Highlight line 8** (`os.instrumentClient('openai', openai)`) — this is the hero.

---

### SHOT 3 — Run It (0:25 - 0:35)

**[TERMINAL]**

Say: *"Let's run it."*

```bash
node demo.mjs
```

Output will show:
```
Agent says: The capital of Brazil is Brasília.
✅ Trace sent to Stoic AgentOS
```

---

### SHOT 4 — The Dashboard (0:35 - 0:55)

**[SWITCH TO BROWSER — stoicagentos.com/dashboard]**

Say: *"And here it is in the dashboard."*

Show (click through quickly):
1. **Traces view** — the "demo-task" trace just appeared
2. **Click into it** — show the span: model (gpt-4o-mini), tokens (prompt + completion), cost ($0.0001), latency
3. **Agents view** — "demo-agent" shows up with status "success"
4. **Stats/overview** — show the cost chart if it has data

Say: *"Model, tokens, cost, latency — all auto-captured. Per agent, per trace."*

---

### SHOT 5 — Memory (The Closer) (0:55 - 1:15)

**[SWITCH BACK TO TERMINAL]**

Say: *"But here's what no other platform does."*

Show this addition (or a second file `demo-memory.mjs`):

```javascript
// Store what the agent learned
await os.memory.recordEpisode(
  'The capital of Brazil is Brasília',
  { importance: 8, agentId: 'demo-agent' }
);

// Next session — agent remembers
const knowledge = await os.memory.queryTriples({ subject: 'Brazil' });
console.log('Agent knows:', knowledge);
```

Say: *"Persistent memory. Your agent remembers across sessions. Not a context window hack — actual persistence in a database you own."*

---

### SHOT 6 — Outro (1:15 - 1:25)

**[BROWSER — show GitHub repo or landing page]**

Say: *"Open source. MIT licensed. Self-hostable. Link in the description."*

**END RECORDING.**

---

## POST-PRODUCTION

1. Trim any pauses or typos
2. Add a title card at the start (optional): "Stoic AgentOS — 90 seconds"
3. Set Loom title: "Stoic AgentOS: Agent Observability + Memory in 3 Lines of Code"
4. Copy the Loom link → add to:
   - README.md (after the badges section)
   - Landing page hero (replace or add alongside the existing demo)
   - LinkedIn posts (future)
   - Show HN post (today)

---

## THE DEMO FILE (Create this before recording)

Save as `demo.mjs` in a clean directory:

```javascript
import { AgentOS } from 'stoic-agentos-sdk';
import OpenAI from 'openai';

// Initialize Stoic AgentOS
const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  debug: true,
});

// Initialize OpenAI
const openai = new OpenAI();

// One line — auto-capture every LLM call
os.instrumentClient('openai', openai);

// Start a trace
const trace = os.startTrace('demo-task', { agent: 'demo-agent' });

// Make an LLM call (auto-captured)
const result = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'What is the capital of Brazil?' }],
});

console.log('\n🤖 Agent says:', result.choices[0].message.content);

// Store what the agent learned (persistent memory)
await os.memory.recordEpisode(
  'The capital of Brazil is Brasília. Confirmed via GPT-4o-mini.',
  { importance: 8, agentId: 'demo-agent', eventType: 'discovery' }
);

console.log('🧠 Episode recorded to memory');

// End trace and flush
await trace.end();
await os.shutdown();

console.log('✅ Done — check your dashboard at stoicagentos.com/dashboard');
```

**Test this file works BEFORE recording.** Run it twice to make sure.
