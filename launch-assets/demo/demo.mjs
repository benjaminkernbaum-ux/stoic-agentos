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
console.log(`\n📊 Trace has ${trace.spans.length} span(s)`);
if (trace.spans.length > 0) {
  const sp = trace.spans[0];
  console.log(`   Provider: ${sp.provider}, Model: ${sp.model}`);
  console.log(`   Tokens: ${sp.prompt_tokens} in / ${sp.completion_tokens} out = ${sp.total_tokens}`);
  console.log(`   Cost: $${sp.cost_usd}, Latency: ${sp.latency_ms}ms`);
}

// ─── End trace — sends to /traces/ingest ───
console.log('\n📡 Sending trace to Stoic AgentOS...');
try {
  const ingestResult = await trace.end();
  console.log('📡 Trace ingest response:', JSON.stringify(ingestResult, null, 2));
} catch (err) {
  console.error('❌ Trace ingest error:', err.message);
}

// ─── Store what the agent learned (persistent memory) ───
try {
  const memResult = await os.memory.recordEpisode(
    `The capital of Brazil is Brasília. Confirmed via Claude Sonnet.`,
    { importance: 8, agentId: 'demo-agent', eventType: 'discovery' }
  );
  console.log('🧠 Episode recorded:', JSON.stringify(memResult, null, 2));
} catch (err) {
  console.error('❌ Memory error:', err.message);
}

// ─── Flush observations ───
await os.shutdown();
console.log('\n✅ Done — check your dashboard at stoicagentos.com/dashboard\n');
