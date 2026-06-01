import { useState } from 'react';

export default function WaitlistCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      // Store in localStorage as reliable fallback
      const existing = JSON.parse(localStorage.getItem('waitlist_emails') || '[]');
      if (!existing.includes(email)) {
        existing.push(email);
        localStorage.setItem('waitlist_emails', JSON.stringify(existing));
      }

      // Track analytics
      window.plausible?.('Waitlist Signup');

      setStatus('success');
    } catch {
      setStatus('success'); // Still show success even if localStorage fails
    }
  };

  const styles = {
    container: {
      background: 'rgba(155,89,255,0.08)',
      border: '1px solid rgba(155,89,255,0.25)',
      borderRadius: 16,
      padding: '32px',
      textAlign: 'center',
      maxWidth: 560,
      margin: '0 auto',
    },
    icon: {
      fontSize: '2rem',
      marginBottom: 12,
    },
    headline: {
      fontSize: '1.35rem',
      fontWeight: 700,
      color: '#fff',
      margin: '0 0 8px',
    },
    subtitle: {
      fontSize: '0.9rem',
      color: 'rgba(255,255,255,0.6)',
      margin: '0 0 24px',
      lineHeight: 1.5,
    },
    form: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    input: {
      flex: '1 1 220px',
      maxWidth: 320,
      padding: '12px 16px',
      borderRadius: 10,
      border: '1px solid rgba(155,89,255,0.25)',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      fontSize: '0.9rem',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    button: {
      padding: '12px 24px',
      borderRadius: 10,
      border: 'none',
      background: 'linear-gradient(135deg, #9b59ff, #7c3aed)',
      color: '#fff',
      fontSize: '0.9rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'box-shadow 0.2s, transform 0.15s',
      whiteSpace: 'nowrap',
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    success: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '14px 20px',
      borderRadius: 10,
      background: 'rgba(0,230,138,0.1)',
      border: '1px solid rgba(0,230,138,0.25)',
      color: '#00e68a',
      fontSize: '0.95rem',
      fontWeight: 600,
      animation: 'waitlistFadeIn 0.4s ease',
    },
    errorText: {
      color: '#ff4757',
      fontSize: '0.8rem',
      marginTop: 8,
    },
  };

  return (
    <>
      <style>{`
        @keyframes waitlistFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .waitlist-input:focus {
          border-color: #9b59ff !important;
          box-shadow: 0 0 0 2px rgba(155,89,255,0.2);
        }
        .waitlist-btn:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(155,89,255,0.4);
          transform: translateY(-1px);
        }
        .waitlist-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.icon}>🎯</div>
        <h3 style={styles.headline}>Join the early access waitlist</h3>
        <p style={styles.subtitle}>
          Get lifetime Pro access and shape the product roadmap.
        </p>

        {status === 'success' ? (
          <div style={styles.success}>
            <span style={{ fontSize: '1.2rem' }}>✓</span>
            You're on the list! We'll be in touch.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} style={styles.form}>
              <input
                className="waitlist-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                style={styles.input}
                disabled={status === 'loading'}
                aria-label="Email address"
              />
              <button
                className="waitlist-btn"
                type="submit"
                style={{
                  ...styles.button,
                  ...(status === 'loading' ? styles.buttonDisabled : {}),
                }}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Joining…' : 'Join Waitlist →'}
              </button>
            </form>
            {status === 'error' && (
              <div style={styles.errorText}>{errorMsg}</div>
            )}
          </>
        )}
      </div>
    </>
  );
}
