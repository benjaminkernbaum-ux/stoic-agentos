import { useState, useRef, useEffect } from 'react';

const MODELS = [
  { id: 'default', label: '✦ Auto', desc: 'Best model for the task', badge: 'SMART' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI flagship', badge: null },
  { id: 'claude-3.5', label: 'Claude 3.5', desc: 'Anthropic Sonnet', badge: null },
  { id: 'gemini-pro', label: 'Gemini Pro', desc: 'Google DeepMind', badge: null },
];

const MODES = [
  { id: 'chat', label: '💬 Chat', desc: 'General conversation' },
  { id: 'research', label: '🔬 Research', desc: 'Deep web search & analysis' },
  { id: 'code', label: '⚡ Code', desc: 'Write, review & debug' },
  { id: 'automate', label: '🔄 Automate', desc: 'Create workflows' },
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`comms-msg ${isUser ? 'comms-msg-user' : 'comms-msg-agent'}`}>
      {!isUser && (
        <div className="comms-msg-avatar">
          <span className="comms-msg-avatar-icon">⚡</span>
          <span className="comms-msg-avatar-pulse" />
        </div>
      )}
      <div className={`comms-msg-bubble ${isUser ? 'user' : 'agent'}`}>
        <div className="comms-msg-text">{msg.content}</div>
        <div className="comms-msg-meta">
          <span className="comms-msg-time">
            {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.model && <span className="comms-msg-model">via {msg.model}</span>}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="comms-msg comms-msg-agent">
      <div className="comms-msg-avatar">
        <span className="comms-msg-avatar-icon">⚡</span>
        <span className="comms-msg-avatar-pulse" />
      </div>
      <div className="comms-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function ChatTab({ agents }) {
  const [threads, setThreads] = useState([
    { id: 'default', name: 'New Mission', messages: [], createdAt: Date.now() },
  ]);
  const [activeThread, setActiveThread] = useState('default');
  const [input, setInput] = useState('');
  const [model, setModel] = useState('default');
  const [mode, setMode] = useState('chat');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [threadSidebar, setThreadSidebar] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const modelPickerRef = useRef(null);
  const activeThreadRef = useRef(activeThread);
  const modelRef = useRef(model);
  const modeRef = useRef(mode);

  activeThreadRef.current = activeThread;
  modelRef.current = model;
  modeRef.current = mode;

  const thread = threads.find(t => t.id === activeThread) || threads[0];
  const messages = thread?.messages || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (!showModelPicker) return;
    const handler = (e) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target)) {
        setShowModelPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModelPicker]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', content: input.trim(), ts: Date.now() };
    setThreads(prev => prev.map(t =>
      t.id === activeThread
        ? { ...t, name: t.messages.length === 0 ? input.trim().slice(0, 40) : t.name, messages: [...t.messages, userMsg] }
        : t
    ));
    setInput('');
    setIsTyping(true);

    const threadId = activeThreadRef.current;
    const modelId = modelRef.current;
    const modeId = modeRef.current;
    const modelLabel = MODELS.find(m => m.id === modelId)?.label || 'Auto';
    const modeLabel = MODES.find(m => m.id === modeId)?.label || 'Chat';

    setTimeout(() => {
      setIsTyping(false);
      const responses = {
        chat: `I'll help you with that. Processing with ${modelLabel}...`,
        research: `🔬 Initiating deep research pipeline. Scanning sources with ${modelLabel}. Stand by for findings...`,
        code: `⚡ Analyzing your request in code mode. Spinning up ${modelLabel} for code generation...`,
        automate: `🔄 Designing automation workflow. ${modelLabel} is mapping the execution graph...`,
      };
      const agentMsg = {
        id: Date.now() + 1, role: 'agent',
        content: responses[modeId] || responses.chat,
        ts: Date.now(), model: modelLabel,
      };
      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, messages: [...t.messages, agentMsg] } : t
      ));
    }, 1500);
  };

  const newThread = () => {
    const id = `thread-${Date.now()}`;
    setThreads(prev => [...prev, { id, name: 'New Mission', messages: [], createdAt: Date.now() }]);
    setActiveThread(id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];
  const selectedMode = MODES.find(m => m.id === mode) || MODES[0];

  return (
    <div className="dash-content comms-layout">
      {/* Thread sidebar */}
      {threadSidebar && (
        <div className="comms-threads">
          <div className="comms-threads-header">
            <span className="comms-threads-title">🛰️ Missions</span>
            <button className="comms-threads-new" onClick={newThread}>+ New</button>
          </div>
          <div className="comms-threads-list">
            {threads.map(t => (
              <button
                key={t.id}
                className={`comms-thread ${t.id === activeThread ? 'active' : ''}`}
                onClick={() => setActiveThread(t.id)}
              >
                <span className="comms-thread-dot" />
                <span className="comms-thread-name">{t.name}</span>
                <span className="comms-thread-count">{t.messages.length}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main chat */}
      <div className="comms-main">
        {/* Top bar with mode selector */}
        <div className="comms-topbar">
          <button className="comms-toggle" onClick={() => setThreadSidebar(s => !s)}>☰</button>
          <div className="comms-modes">
            {MODES.map(m => (
              <button
                key={m.id}
                className={`comms-mode ${mode === m.id ? 'active' : ''}`}
                onClick={() => setMode(m.id)}
                title={m.desc}
              >{m.label}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <button className="comms-new-mission" onClick={newThread}>+ New Mission</button>
        </div>

        {/* Messages */}
        <div className="comms-messages">
          {messages.length === 0 ? (
            <div className="comms-empty">
              <div className="comms-hero-icon">🛰️</div>
              <h2 className="comms-hero-title">Mission Comms</h2>
              <p className="comms-hero-sub">Brief your agents. Deploy tasks. Get results.</p>
              <div className="comms-hero-chips">
                {['Review PR #142', 'Summarize Slack', 'Write API docs', 'Monitor deploys'].map(s => (
                  <button key={s} className="comms-suggestion" onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
          )}
          {isTyping && <TypingIndicator />}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="comms-input-area">
          <div className="comms-input-box">
            <input
              ref={inputRef}
              className="comms-input"
              placeholder={`${selectedMode.label.replace(/^[^\s]+\s/, '')} mode — describe your mission...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <div className="comms-input-controls">
              <button className="comms-attach" title="Attach files">📎</button>
              <div className="comms-model-wrap" ref={modelPickerRef}>
                <button className="comms-model-btn" onClick={() => setShowModelPicker(s => !s)}>
                  <span className="comms-model-icon">✦</span>
                  <span>{selectedModel.label}</span>
                  {selectedModel.badge && <span className="comms-model-badge">{selectedModel.badge}</span>}
                  <span className="comms-model-chevron">▾</span>
                </button>
                {showModelPicker && (
                  <div className="comms-model-dropdown">
                    <div className="comms-model-dropdown-title">Select Model</div>
                    {MODELS.map(m => (
                      <button
                        key={m.id}
                        className={`comms-model-option ${m.id === model ? 'active' : ''}`}
                        onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                      >
                        <div className="comms-model-opt-row">
                          <span className="comms-model-opt-name">{m.label}</span>
                          {m.badge && <span className="comms-model-opt-badge">{m.badge}</span>}
                        </div>
                        <span className="comms-model-opt-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="comms-send" onClick={handleSend} disabled={!input.trim()}>
                <span className="comms-send-arrow">↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
