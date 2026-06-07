import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Turnstile from '../components/Turnstile';
import './Auth.css';

export default function SignupPage() {
  const { signUp, signInWithOAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [consent, setConsent] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleChange = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consent) { setError('Please accept the Privacy Policy and Terms of Service'); return; }
    setError('');

    if (!turnstileToken) {
      setError('Please complete the human verification challenge.');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError('Password must include uppercase, lowercase, and a number');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await signUp(form.email, form.password, form.name, new Date().toISOString(), turnstileToken);
      setLoading(false);

      if (authError) {
        setError('Account creation failed. Please try again.');
      } else {
        setSuccess(true);
      }
    } catch {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  const handleOAuth = async (provider) => {
    if (!consent) { setError('Please accept the Privacy Policy and Terms of Service'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: oauthError } = await signInWithOAuth(provider);
      if (oauthError) {
        setLoading(false);
        setError('Could not sign in with this provider. Please try again.');
      }
      // OAuth redirects away — loading stays true until redirect
    } catch {
      setLoading(false);
      setError('Connection error. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-bg-glow" />
        <div className="auth-card">
          <div className="auth-logo">⚡</div>
          <h1 className="auth-title">Check your email</h1>
          <p className="auth-subtitle">
            We sent a confirmation link to <strong>{form.email}</strong>. 
            Click it to activate your account and start building.
          </p>
          <button className="auth-btn primary" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-logo">⚡</div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Start monitoring your AI agents in 30 seconds</p>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <div className="auth-oauth-buttons">
          <button className="auth-btn oauth" onClick={() => handleOAuth('github')} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </button>
          <button className="auth-btn oauth" onClick={() => handleOAuth('google')} disabled={loading}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>

        <div className="auth-divider"><span>or</span></div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              type="text"
              placeholder="Benjamin Kernbaum"
              value={form.name}
              onChange={handleChange('name')}
              required
              autoComplete="name"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-email">Work email</label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange('email')}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              placeholder="Min 8 chars, upper + lower + number"
              value={form.password}
              onChange={handleChange('password')}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {/* Cloudflare Turnstile — "I'm not a robot" */}
          <Turnstile
            onVerify={(token) => setTurnstileToken(token)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
          />

          <label className="signup-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              required
            />
            <span>I agree to the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener">Terms of Service</a></span>
          </label>

          <button type="submit" className="auth-btn primary" disabled={loading || !turnstileToken}>
            {loading ? 'Creating account...' : !turnstileToken ? 'Complete verification above' : 'Create Account — Free'}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
