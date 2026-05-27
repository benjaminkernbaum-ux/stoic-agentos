import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../lib/supabase';

// ── Markdown-lite renderer ──
function renderMarkdown(text) {
  if (!text) return '';
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
  }, [loading, conversationId]);

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
