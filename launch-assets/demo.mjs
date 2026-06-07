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
