import { useState, useRef, useEffect } from 'react';

const MODELS = [
  { id: 'default', label: '✦ Default', desc: 'Auto-select best model' },
  { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI flagship' },
  { id: 'claude-3.5', label: 'Claude 3.5', desc: 'Anthropic Sonnet' },
  { id: 'gemini-pro', label: 'Gemini Pro', desc: 'Google DeepMind' },
];

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`fleet-msg ${isUser ? 'fleet-msg-user' : 'fleet-msg-agent'}`}>
      {!isUser && <div className="fleet-msg-avatar">⚡</div>}
      <div className={`fleet-msg-bubble ${isUser ? 'user' : 'agent'}`}>
        <div className="fleet-msg-text">{msg.content}</div>
        <div className="fleet-msg-time">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

export default function ChatTab({ agents }) {
  const [threads, setThreads] = useState([
    { id: 'default', name: 'New Thread', messages: [], createdAt: Date.now() },
  ]);
  const [activeThread, setActiveThread] = useState('default');
  const [input, setInput] = useState('');
  const [model, setModel] = useState('default');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [threadSidebar, setThreadSidebar] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const thread = threads.find(t => t.id === activeThread) || threads[0];
  const messages = thread?.messages || [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), role: 'user', content: input.trim(), ts: Date.now() };
    setThreads(prev => prev.map(t =>
      t.id === activeThread
        ? { ...t, name: t.messages.length === 0 ? input.trim().slice(0, 40) : t.name, messages: [...t.messages, userMsg] }
        : t
    ));
    setInput('');

    // Simulate agent response
    setTimeout(() => {
      const agentMsg = {
        id: Date.now() + 1, role: 'agent',
        content: `I'll help you with that. Let me process your request using the ${MODELS.find(m => m.id === model)?.label || 'Default'} model...`,
        ts: Date.now(),
      };
      setThreads(prev => prev.map(t =>
        t.id === activeThread ? { ...t, messages: [...t.messages, agentMsg] } : t
      ));
    }, 1200);
  };

  const newThread = () => {
    const id = `thread-${Date.now()}`;
    setThreads(prev => [...prev, { id, name: 'New Thread', messages: [], createdAt: Date.now() }]);
    setActiveThread(id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];

  return (
    <div className="dash-content fleet-chat-layout">
      {/* Thread sidebar */}
      {threadSidebar && (
        <div className="fleet-thread-sidebar">
          <div className="fleet-thread-header">
            <span className="fleet-thread-title">Threads</span>
            <button className="fleet-thread-new" onClick={newThread}>+ New</button>
          </div>
          <div className="fleet-thread-list">
            {threads.map(t => (
              <button
                key={t.id}
                className={`fleet-thread-item ${t.id === activeThread ? 'active' : ''}`}
                onClick={() => setActiveThread(t.id)}
              >
                <span className="fleet-thread-icon">💬</span>
                <span className="fleet-thread-name">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat area */}
      <div className="fleet-chat-main">
        {/* Top bar */}
        <div className="fleet-chat-topbar">
          <button className="fleet-chat-toggle" onClick={() => setThreadSidebar(s => !s)}>
            ☰
          </button>
          <span className="fleet-chat-thread-name">{thread?.name}</span>
          <div style={{ flex: 1 }} />
          <button className="fleet-chat-new-thread" onClick={newThread}>
            + New Thread
          </button>
        </div>

        {/* Messages */}
        <div className="fleet-chat-messages">
          {messages.length === 0 ? (
            <div className="fleet-chat-empty">
              <h2 className="fleet-chat-hero">Ask anything</h2>
              <p className="fleet-chat-hero-sub">Chat with your agents, create new ones, or explore your workspace</p>
            </div>
          ) : (
            messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="fleet-chat-input-area">
          <div className="fleet-chat-input-box">
            <input
              ref={inputRef}
              className="fleet-chat-input"
              placeholder="Create an agent that..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <div className="fleet-chat-input-controls">
              <button className="fleet-chat-attach">+</button>
              <div className="fleet-model-picker-wrap">
                <button className="fleet-model-btn" onClick={() => setShowModelPicker(s => !s)}>
                  <span className="fleet-model-icon">✦</span>
                  <span>{selectedModel.label}</span>
                  <span className="fleet-model-chevron">▾</span>
                </button>
                {showModelPicker && (
                  <div className="fleet-model-dropdown">
                    {MODELS.map(m => (
                      <button
                        key={m.id}
                        className={`fleet-model-option ${m.id === model ? 'active' : ''}`}
                        onClick={() => { setModel(m.id); setShowModelPicker(false); }}
                      >
                        <span className="fleet-model-opt-name">{m.label}</span>
                        <span className="fleet-model-opt-desc">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="fleet-chat-send"
                onClick={handleSend}
                disabled={!input.trim()}
              >
                ⬆
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
