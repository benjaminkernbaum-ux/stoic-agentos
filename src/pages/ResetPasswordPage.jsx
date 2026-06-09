import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Auth.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  // Listen for the RECOVERY auth event (fired when user arrives via reset link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pw) => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must include an uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must include a lowercase letter';
    if (!/[0-9]/.test(pw)) return 'Password must include a number';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(updateError.message || 'Failed to update password. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setLoading(false);
      setError('Connection error. Please try again.');
      console.error('Password update error:', err);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card">
        <div className="auth-logo">⚡</div>
        <h1 className="auth-title">Set new password</h1>
        <p className="auth-subtitle">Enter your new password below</p>

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
            ✅ Password updated! Redirecting to login...
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
              required
              disabled={loading || success}
              autoComplete="new-password"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
              required
              disabled={loading || success}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-btn primary" disabled={loading || success}>
            {success ? '✅ Redirecting...' : loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        <p className="auth-footer-text">
          <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
