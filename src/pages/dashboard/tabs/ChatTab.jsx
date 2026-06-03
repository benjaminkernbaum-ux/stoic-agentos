import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

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
        <div className="comms-msg-text" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
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
  const [suggestions, setSuggestions] = useState(['Review PR #142', 'Summarize Slack', 'Write API docs', 'Monitor deploys']);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const modelPickerRef = useRef(null);
  
  const activeThreadRef = useRef(activeThread);
  const modelRef = useRef(model);
  const modeRef = useRef(mode);
  const loadedThreadsRef = useRef(new Set());

  activeThreadRef.current = activeThread;
  modelRef.current = model;
  modeRef.current = mode;

  const thread = threads.find(t => t.id === activeThread) || threads[0];
  const messages = thread?.messages || [];

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_BASE}/api/v1/chat/history`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setThreads(prev => {
            const existingDefault = prev.find(t => t.id === 'default');
            const backendThreads = data.conversations.map(c => ({
              id: c.conv_id,
              name: c.title || 'Conversation',
              messages: prev.find(t => t.id === c.conv_id)?.messages || [],
              createdAt: new Date(c.updated_at).getTime(),
            }));
            if (existingDefault && (existingDefault.messages.length > 0 || activeThreadRef.current === 'default')) {
              return [existingDefault, ...backendThreads];
            }
            return backendThreads.length > 0 ? backendThreads : [{ id: 'default', name: 'New Mission', messages: [], createdAt: Date.now() }];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_BASE}/api/v1/chat/suggestions?mode=${mode}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions) {
          setSuggestions(data.suggestions.map(s => s.text));
        }
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  }, [mode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (activeThread === 'default') return;
    if (loadedThreadsRef.current.has(activeThread)) return;

    // Mark as loading/loaded immediately to prevent parallel duplicate fetches
    loadedThreadsRef.current.add(activeThread);

    const loadThreadMessages = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          loadedThreadsRef.current.delete(activeThread);
          return;
        }
        const res = await fetch(`${API_BASE}/api/v1/chat/${activeThread}`, {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setThreads(prev => prev.map(t =>
              t.id === activeThread
                ? { ...t, messages: data.messages.map((m, idx) => ({ id: idx, role: m.role, content: m.content, ts: Date.now() })) }
                : t
            ));
          }
        } else {
          // If fetch fails (non-2xx response), clear it from loaded set to allow retry
          loadedThreadsRef.current.delete(activeThread);
        }
      } catch (err) {
        console.error('Failed to load thread messages:', err);
        // If request fails (network error), clear from loaded set to allow retry
        loadedThreadsRef.current.delete(activeThread);
      }
    };

    loadThreadMessages();
  }, [activeThread]);

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

  const handleDeleteThread = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this mission?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${API_BASE}/api/v1/chat/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        loadedThreadsRef.current.delete(id);
        setThreads(prev => prev.filter(t => t.id !== id));
        if (activeThreadRef.current === id) {
          setActiveThread('default');
        }
        fetchHistory();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const messageText = input.trim();
    const userMsg = { id: Date.now(), role: 'user', content: messageText, ts: Date.now() };
    const threadId = activeThreadRef.current;
    
    setThreads(prev => prev.map(t =>
      t.id === threadId
        ? { ...t, name: t.messages.length === 0 ? messageText.slice(0, 40) : t.name, messages: [...t.messages, userMsg] }
        : t
    ));
    setInput('');
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const modelLabel = MODELS.find(m => m.id === modelRef.current)?.label || 'Auto';

      const response = await fetch(`${API_BASE}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: messageText,
          conversation_id: threadId === 'default' ? undefined : threadId,
          mode: modeRef.current,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let textBuffer = '';
      
      const agentMsgId = Date.now() + 1;
      let streamStarted = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          textBuffer += chunk;

          const lines = textBuffer.split('\n');
          textBuffer = lines.pop() || '';

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine || !cleanLine.startsWith('data: ')) continue;
            
            const dataStr = cleanLine.substring(6).trim();
            if (dataStr === '[DONE]') {
              done = true;
              break;
            }

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'text_delta' && data.text) {
                if (!streamStarted) {
                  streamStarted = true;
                  setIsTyping(false);
                  setThreads(prev => prev.map(t => {
                    if (t.id === threadId) {
                      return {
                        ...t,
                        messages: [...t.messages, {
                          id: agentMsgId,
                          role: 'assistant',
                          content: data.text,
                          ts: Date.now(),
                          model: data.model || modelLabel
                        }]
                      };
                    }
                    return t;
                  }));
                } else {
                  setThreads(prev => prev.map(t => {
                    if (t.id === threadId) {
                      return {
                        ...t,
                        messages: t.messages.map(m =>
                          m.id === agentMsgId ? { ...m, content: m.content + data.text } : m
                        )
                      };
                    }
                    return t;
                  }));
                }
              } else if (data.type === 'message_stop') {
                const serverConvId = data.conversation_id;
                if (serverConvId && threadId === 'default') {
                  setThreads(prev => prev.map(t =>
                    t.id === 'default' ? { ...t, id: serverConvId } : t
                  ));
                  setActiveThread(serverConvId);
                }
              }
            } catch (e) {
              // Ignore partial chunk parse
            }
          }
        }
      }

      setIsTyping(false);
      fetchHistory();

    } catch (err) {
      console.error('Chat error:', err);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw err;
        
        const res = await fetch(`${API_BASE}/api/v1/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: messageText,
            conversation_id: threadId === 'default' ? undefined : threadId,
            mode: modeRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setIsTyping(false);
          setThreads(prev => prev.map(t => {
            if (t.id === threadId) {
              return {
                ...t,
                messages: [...t.messages, {
                  id: Date.now() + 2,
                  role: 'assistant',
                  content: data.response,
                  ts: Date.now(),
                  model: data.model
                }]
              };
            }
            return t;
          }));

          const serverConvId = data.conversation_id;
          if (serverConvId && threadId === 'default') {
            setThreads(prev => prev.map(t =>
              t.id === 'default' ? { ...t, id: serverConvId } : t
            ));
            setActiveThread(serverConvId);
          }
          fetchHistory();
        } else {
          throw new Error('Fallback failed', { cause: err });
        }
      } catch (fallbackErr) {
        console.error('Chat fallback error:', fallbackErr);
        setIsTyping(false);
        setThreads(prev => prev.map(t => {
          if (t.id === threadId) {
            return {
              ...t,
              messages: [...t.messages, {
                id: Date.now() + 3,
                role: 'assistant',
                content: `⚠️ **Connection Error**: Unable to reach the Stoic AgentOS AI Brain. Please verify your internet connection or check if the API server is online.`,
                ts: Date.now()
              }]
            };
          }
          return t;
        }));
      }
    }
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
                style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}
              >
                <span className="comms-thread-dot" />
                <span className="comms-thread-name" style={{ paddingRight: t.id !== 'default' ? '24px' : '0' }}>{t.name}</span>
                {t.id !== 'default' && (
                  <span
                    onClick={(e) => handleDeleteThread(e, t.id)}
                    style={{
                      position: 'absolute', right: '10px', opacity: 0.5, cursor: 'pointer',
                      fontSize: '11px', transition: 'opacity 0.15s', zIndex: 5
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                    title="Delete Mission"
                  >
                    🗑️
                  </span>
                )}
                {t.id === 'default' && <span className="comms-thread-count">{t.messages.length}</span>}
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
                {suggestions.map(s => (
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
