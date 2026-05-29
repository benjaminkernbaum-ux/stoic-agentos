import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../lib/supabase';

// ── Markdown-lite renderer ──
function renderMarkdown(text) {
  if (!text) return '';

  // ── XML Pre-processing: convert semantic XML to styled HTML ──

  // <interface_spec name="...">...</interface_spec>
  text = text.replace(
    /<interface_spec\s+name="([^"]+)">(\s*[\s\S]*?)\s*<\/interface_spec>/gi,
    (_, name, content) => {
      const inner = content.trim()
        .replace(/\n/g, '<br/>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="stoic-chat-code"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="stoic-chat-inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      return `<div class="stoic-xml-card stoic-interface-spec"><div class="stoic-xml-card-header"><span class="stoic-xml-card-icon">📐</span><span class="stoic-xml-card-title">${name}</span><span class="stoic-xml-card-badge">Interface Spec</span></div><div class="stoic-xml-card-body">${inner}</div></div>`;
    }
  );

  // <metric_grid>...</metric_grid> containing <metric name="..." value="..." trend="..." />
  text = text.replace(
    /<metric_grid>([\s\S]*?)<\/metric_grid>/gi,
    (_, content) => {
      const metrics = [];
      content.replace(
        /<metric\s+name="([^"]+)"\s+value="([^"]+)"\s+trend="([^"]+)"\s*\/>/gi,
        (__, name, value, trend) => {
          const isPositive = trend.includes('+') || trend.toLowerCase().includes('growth') || trend.toLowerCase().includes('reduction');
          const trendClass = isPositive ? 'stoic-metric-trend-up' : 'stoic-metric-trend-neutral';
          metrics.push(`<div class="stoic-metric-card"><div class="stoic-metric-value">${value}</div><div class="stoic-metric-name">${name}</div><div class="stoic-metric-trend ${trendClass}">${trend}</div></div>`);
          return '';
        }
      );
      if (metrics.length === 0) return content;
      return `<div class="stoic-xml-card stoic-metric-grid-card"><div class="stoic-xml-card-header"><span class="stoic-xml-card-icon">📊</span><span class="stoic-xml-card-title">Metrics Dashboard</span></div><div class="stoic-metric-grid">${metrics.join('')}</div></div>`;
    }
  );

  // <roi_metrics>...</roi_metrics>
  text = text.replace(
    /<roi_metrics>([\s\S]*?)<\/roi_metrics>/gi,
    (_, content) => {
      const rows = content.trim().split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(':').map(s => s.trim());
        if (parts.length >= 2) {
          return `<div class="stoic-roi-row"><span class="stoic-roi-label">${parts[0]}</span><span class="stoic-roi-value">${parts.slice(1).join(':')}</span></div>`;
        }
        return `<div class="stoic-roi-row"><span class="stoic-roi-label">${line.trim()}</span></div>`;
      }).join('');
      return `<div class="stoic-xml-card stoic-roi-card"><div class="stoic-xml-card-header"><span class="stoic-xml-card-icon">🚀</span><span class="stoic-xml-card-title">ROI Analysis</span><span class="stoic-xml-card-badge">Growth</span></div><div class="stoic-xml-card-body">${rows}</div></div>`;
    }
  );

  // <diagnostic_checklist>...</diagnostic_checklist>
  text = text.replace(
    /<diagnostic_checklist>([\s\S]*?)<\/diagnostic_checklist>/gi,
    (_, content) => {
      const items = content.trim().split('\n').filter(l => l.trim()).map((line, i) => {
        const cleaned = line.replace(/^\d+\.\s*/, '').trim();
        return `<div class="stoic-check-item"><span class="stoic-check-num">${i + 1}</span><span class="stoic-check-text">${cleaned}</span></div>`;
      }).join('');
      return `<div class="stoic-xml-card stoic-checklist-card"><div class="stoic-xml-card-header"><span class="stoic-xml-card-icon">🔧</span><span class="stoic-xml-card-title">Diagnostic Checklist</span><span class="stoic-xml-card-badge">Support</span></div><div class="stoic-xml-card-body">${items}</div></div>`;
    }
  );

  // <prd_document feature="...">...</prd_document>
  text = text.replace(
    /<prd_document\s+feature="([^"]+)">(\s*[\s\S]*?)\s*<\/prd_document>/gi,
    (_, feature, content) => {
      const inner = content.trim()
        .replace(/\n/g, '<br/>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="stoic-chat-code"><code>$2</code></pre>')
        .replace(/`([^`]+)`/g, '<code class="stoic-chat-inline-code">$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/### (\d+\..*?)(<br\/>)/g, '<h4 class="stoic-chat-h4">$1</h4>');
      return `<div class="stoic-xml-card stoic-prd-card"><div class="stoic-xml-card-header"><span class="stoic-xml-card-icon">📋</span><span class="stoic-xml-card-title">${feature}</span><span class="stoic-xml-card-badge">PRD</span></div><div class="stoic-xml-card-body">${inner}</div></div>`;
    }
  );

  // ── Standard markdown processing (existing) ──
  return text
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="stoic-chat-code"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="stoic-chat-inline-code">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="stoic-chat-h4">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="stoic-chat-h3">$1</h3>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="stoic-chat-list">$&</ul>')
    // Tables (basic)
    .replace(/\|(.+)\|/g, (match) => {
      if (match.includes('---')) return '';
      const cells = match.split('|').filter(Boolean).map(c => c.trim());
      return `<div class="stoic-chat-table-row">${cells.map(c => `<span>${c}</span>`).join('')}</div>`;
    })
    // Line breaks
    .replace(/\n/g, '<br/>');
}

const SUGGESTIONS = [
  { icon: '🚀', text: 'How do I get started?' },
  { icon: '🤖', text: 'Analyze my agent fleet' },
  { icon: '📊', text: 'Summarize recent activity' },
  { icon: '⚡', text: 'What should I optimize?' },
  { icon: '🔧', text: 'Help me debug an issue' },
  { icon: '📈', text: 'Show performance insights' },
];

const MODE_DEFINITIONS = [
  { id: 'stoic', label: 'Stoic', icon: '🧘', desc: 'Calm SRE assistant' },
  { id: 'architect', label: 'Architect', icon: '📐', desc: 'Systems design' },
  { id: 'analyst', label: 'Analyst', icon: '📊', desc: 'Data analytics' },
  { id: 'growth', label: 'Growth', icon: '🚀', desc: 'ROI strategy' },
  { id: 'support', label: 'Support', icon: '🔧', desc: 'Troubleshooting' },
  { id: 'prd', label: 'PRD', icon: '📋', desc: 'Product specs' },
];

async function getToken() {
  return (await supabase.auth.getSession()).data.session?.access_token;
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [hasError, setHasError] = useState(null);
  const [activeMode, setActiveMode] = useState('stoic');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+J to toggle chat
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setHasError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationId,
          mode: activeMode,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setHasError('ai_key');
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: '⚠️ **AI not configured yet.**\n\nTo enable Stoic AI, add your Anthropic API key in **Settings → AI Configuration**.\n\nOnce configured, I can analyze your agents, summarize activity, help with debugging, and much more.',
            timestamp: Date.now(),
            isError: true,
          }]);
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `❌ ${body.error || 'Something went wrong. Try again.'}`,
            timestamp: Date.now(),
            isError: true,
          }]);
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setConversationId(data.conversation_id);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
        model: data.model,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Network error — check your connection and try again.',
        timestamp: Date.now(),
        isError: true,
      }]);
    }
    setLoading(false);
  }, [loading, conversationId, activeMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setHasError(null);
    setInput('');
    setActiveMode('stoic');
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        className="stoic-chat-trigger"
        onClick={() => setIsOpen(o => !o)}
        title="Stoic AI Assistant (Ctrl+J)"
        aria-label="Open AI Assistant"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6-4 7.5V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6 16 4 13.5 4 10a8 8 0 0 1 8-8z" />
            <circle cx="10" cy="10" r="1" fill="currentColor" />
            <circle cx="14" cy="10" r="1" fill="currentColor" />
            <path d="M9 22h6" strokeLinecap="round" />
          </svg>
        )}
        {!isOpen && <span className="stoic-chat-trigger-pulse" />}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="stoic-chat-panel">
          {/* Header */}
          <div className="stoic-chat-header">
            <div className="stoic-chat-header-left">
              <div className="stoic-chat-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6-4 7.5V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6 16 4 13.5 4 10a8 8 0 0 1 8-8z" />
                  <circle cx="10" cy="10" r="1" fill="currentColor" />
                  <circle cx="14" cy="10" r="1" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="stoic-chat-title">Stoic AI</div>
                <div className="stoic-chat-subtitle">
                  {loading ? 'Thinking...' : 'Your AI command center'}
                </div>
              </div>
            </div>
            <div className="stoic-chat-header-actions">
              {messages.length > 0 && (
                <button className="stoic-chat-header-btn" onClick={handleNewChat} title="New conversation">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
              <button className="stoic-chat-header-btn" onClick={() => setIsOpen(false)} title="Close">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="stoic-chat-modes">
            {MODE_DEFINITIONS.map(m => (
              <button
                key={m.id}
                className={`stoic-chat-mode-btn ${activeMode === m.id ? 'stoic-chat-mode-active' : ''}`}
                onClick={() => setActiveMode(m.id)}
                title={m.desc}
              >
                <span className="stoic-chat-mode-icon">{m.icon}</span>
                <span className="stoic-chat-mode-label">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Messages area */}
          <div className="stoic-chat-messages">
            {messages.length === 0 ? (
              <div className="stoic-chat-empty">
                <div className="stoic-chat-empty-icon">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="rgba(167,139,250,0.3)" strokeWidth="2" strokeDasharray="4 4">
                      <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="20s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="24" cy="20" r="8" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" fill="none" />
                    <circle cx="22" cy="19" r="1.5" fill="rgba(167,139,250,0.8)" />
                    <circle cx="26" cy="19" r="1.5" fill="rgba(167,139,250,0.8)" />
                    <path d="M20 38h8" stroke="rgba(167,139,250,0.4)" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M22 35h4" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="stoic-chat-empty-title">Stoic AI</h3>
                <p className="stoic-chat-empty-desc">
                  I have full context on your agents, observations, and knowledge base. Ask me anything.
                </p>
                <div className="stoic-chat-suggestions">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      className="stoic-chat-suggestion"
                      onClick={() => handleSuggestion(s.text)}
                    >
                      <span className="stoic-chat-suggestion-icon">{s.icon}</span>
                      <span>{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`stoic-chat-msg stoic-chat-msg-${msg.role} ${msg.isError ? 'stoic-chat-msg-error' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="stoic-chat-msg-avatar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6-4 7.5V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6 16 4 13.5 4 10a8 8 0 0 1 8-8z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className="stoic-chat-msg-content"
                    dangerouslySetInnerHTML={{ __html: msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content }}
                  />
                </div>
              ))
            )}

            {/* Typing indicator */}
            {loading && (
              <div className="stoic-chat-msg stoic-chat-msg-assistant">
                <div className="stoic-chat-msg-avatar">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a8 8 0 0 1 8 8c0 3.5-2 6-4 7.5V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.5C6 16 4 13.5 4 10a8 8 0 0 1 8-8z" />
                  </svg>
                </div>
                <div className="stoic-chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form className="stoic-chat-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="stoic-chat-input"
              placeholder="Ask Stoic AI anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              maxLength={2000}
            />
            <button
              type="submit"
              className="stoic-chat-send"
              disabled={!input.trim() || loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          {/* Footer */}
          <div className="stoic-chat-footer">
            <span>Ctrl+J to toggle</span>
            <span>Powered by Claude</span>
          </div>
        </div>
      )}
    </>
  );
}
