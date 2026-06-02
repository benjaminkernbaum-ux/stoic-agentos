// Dashboard constants — extracted from Dashboard.jsx monolith

export const STATUS_COLORS = {
  running: '#22c55e',
  success: '#a1a1aa',
  idle: 'rgba(255,255,255,0.3)',
  error: '#ef4444',
  disabled: 'rgba(255,255,255,0.15)',
};

export const TYPE_ICONS = {
  architecture: '🏗️',
  decision: '🧭',
  git_commit: '📝',
  deployment: '🚀',
  error: '❌',
  discovery: '💡',
  note: '📌',
  agent_run: '🤖',
  file_edit: '✏️',
};

export const CMD_ITEMS = [
  { id: 'overview',      icon: '📊', name: 'Go to Overview',      desc: 'Fleet overview and stats',         tab: 'overview' },
  { id: 'chat',          icon: '🛰️', name: 'Mission Comms',         desc: 'Brief agents and get results',     tab: 'chat' },
  { id: 'inbox',         icon: '📡', name: 'Signal Feed',           desc: 'Agent signals and alerts',          tab: 'inbox' },
  { id: 'agents',        icon: '🤖', name: 'Go to Agents',          desc: 'Agent registry and status',         tab: 'agents' },
  { id: 'workspaces',    icon: '📦', name: 'Go to Workspaces',      desc: 'Connected codebases',               tab: 'workspaces' },
  { id: 'templates',     icon: '🧬', name: 'Agent Blueprints',      desc: 'Battle-tested agent configs',       tab: 'templates' },
  { id: 'integrations',  icon: '🔌', name: 'Connect Hub',           desc: 'Connect tools and services',        tab: 'integrations' },
  { id: 'skills',        icon: '🧩', name: 'Capabilities',          desc: 'Skills organized by function',      tab: 'skills' },
  { id: 'brain',         icon: '💡', name: 'Go to Brain',         desc: 'Knowledge and observations',       tab: 'brain' },
  { id: 'graph',         icon: '🕸️', name: 'Go to Graph',         desc: 'Knowledge visualization',          tab: 'graph' },
  { id: 'traces',        icon: '📈', name: 'Go to Traces',        desc: 'LLM call tracing and costs',       tab: 'traces' },
  { id: 'workflows',     icon: '🔗', name: 'Go to Workflows',     desc: 'Agent execution workflows',        tab: 'workflows' },
  { id: 'memory',        icon: '🧠', name: 'Go to Memory',        desc: 'Three-tier memory system',         tab: 'memory' },
  { id: 'compliance',    icon: '🛡️', name: 'Go to Compliance',    desc: 'Audit log and circuit breakers',   tab: 'compliance' },
  { id: 'teamhq',        icon: '🏢', name: 'Go to Team HQ',       desc: 'Team management and collaboration',tab: 'teamhq' },
  { id: 'commandcenter', icon: '🎛️', name: 'Command Center',      desc: 'Full ecosystem command center',    tab: 'commandcenter' },
  { id: 'settings',      icon: '⚙️', name: 'Go to Settings',      desc: 'API keys and account',             tab: 'settings' },
];

export const TAB_TITLES = {
  overview:       'Overview',
  chat:           'Mission Comms',
  inbox:          'Signal Feed',
  agents:         'Agents',
  workspaces:     'Workspaces',
  templates:      'Agent Blueprints',
  integrations:   'Connect Hub',
  skills:         'Capabilities',
  brain:          'Knowledge Brain',
  graph:          'Knowledge Graph',
  traces:         'Agent Traces',
  workflows:      'Workflows',
  memory:         'Memory',
  compliance:     'Compliance',
  teamhq:         'Team HQ',
  settings:       'Settings',
  commandcenter:  'Command Center',
};

export const BRAIN_FILTERS = ['all', 'note', 'decision', 'architecture', 'git_commit', 'deployment', 'discovery', 'error'];

export const AGENT_STATUSES = ['running', 'idle', 'paused', 'disabled'];

export const CAPTURE_HINTS = [
  'Deployed v1.3 to staging...',
  'Fixed memory leak in agent-5...',
  'Switched from GPT-4 to Claude for summarization...',
  'Discovered N+1 query in workspace sync...',
  'Architecture: moved to event-driven pipeline...',
  'Error: rate limit hit on OpenAI endpoint...',
];
