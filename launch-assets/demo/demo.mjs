import { AgentOS } from 'stoic-agentos-sdk';
import Anthropic from '@anthropic-ai/sdk';

// ─── Initialize ───
const os = new AgentOS({
  apiKey: process.env.AGENTOS_API_KEY,
  apiUrl: process.env.AGENTOS_API_URL || 'https://agent-ops-production.up.railway.app/api/v1',
  debug: true,
});

const claude = new Anthropic();

// ─── One line: auto-capture every LLM call ───
os.instrumentClient('anthropic', claude);

// ─── Start a trace ───
const trace = os.startTrace('demo-task', { agent: 'demo-agent' });

console.log('\n⚡ Running agent...\n');

// ─── Make an LLM call (auto-captured) ───
const result = await claude.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 256,
  messages: [{ role: 'user', content: 'What is the capital of Brazil? Answer in one sentence.' }],
});

const answer = result.content[0].text;
console.log('🤖 Agent says:', answer);

// ─── Store what the agent learned (persistent memory) ───
await os.memory.recordEpisode(
  `The capital of Brazil is Brasília. Confirmed via Claude Haiku.`,
  { importance: 8, agentId: 'demo-agent', eventType: 'discovery' }
);
console.log('🧠 Episode recorded to persistent memory');

// ─── End trace and flush ───
await trace.end();
await os.shutdown();

console.log('\n✅ Done — check your dashboard at stoicagentos.com/dashboard\n');
