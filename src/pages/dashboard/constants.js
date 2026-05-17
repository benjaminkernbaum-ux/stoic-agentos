// Dashboard constants — extracted from Dashboard.jsx monolith

export const STATUS_COLORS = {
  running: '#00e68a',
  success: '#00d4ff',
  idle: 'rgba(255,255,255,0.3)',
  error: '#ff4757',
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
  { id: 'overview',   icon: '📊', name: 'Go to Overview',    desc: 'Fleet overview and stats',       tab: 'overview' },
  { id: 'agents',     icon: '🤖', name: 'Go to Agents',      desc: 'Agent registry and status',      tab: 'agents' },
  { id: 'workspaces', icon: '📦', name: 'Go to Workspaces',  desc: 'Connected codebases',            tab: 'workspaces' },
  { id: 'brain',      icon: '🧠', name: 'Go to Brain',       desc: 'Knowledge and observations',     tab: 'brain' },
  { id: 'graph',      icon: '🕸️', name: 'Go to Graph',       desc: 'Knowledge visualization',       tab: 'graph' },
  { id: 'settings',   icon: '⚙️', name: 'Go to Settings',    desc: 'API keys and account',           tab: 'settings' },
];

export const TAB_TITLES = {
  overview:   'Overview',
  agents:     'Agent Registry',
  workspaces: 'Workspaces',
  brain:      'Knowledge Brain',
  graph:      'Knowledge Graph',
  traces:     'Agent Traces',
  workflows:  'Workflows',
  settings:   'Settings',
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
