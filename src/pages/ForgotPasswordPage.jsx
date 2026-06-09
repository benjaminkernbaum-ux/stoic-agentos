import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });

      if (resetError) {
        setError(resetError.message || 'Failed to send reset link. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError('Connection error. Please try again.');
      console.error('Password reset error:', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-logo">⚡</div>
        <h1 className="auth-title">Reset your password</h1>
        <p className="auth-subtitle">Enter your email and we&apos;ll send you a reset link</p>

        {error && <div className="auth-error" role="alert">{error}</div>}
        {success && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '8px',
            color: '#22c55e',
            fontSize: '13px',
            marginBottom: '4px',
          }}>
            ✅ Check your email for a password reset link
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }}
              required
              disabled={loading || success}
              autoComplete="email"
            />
          </div>

          <button type="submit" className="auth-btn primary" disabled={loading || success}>
            {success ? '✅ Email sent' : loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-footer-text">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
