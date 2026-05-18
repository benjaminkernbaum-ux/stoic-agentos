import { useEffect, useState } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

async function authToken() {
  return (await supabase.auth.getSession()).data.session?.access_token;
}

function AnthropicKeySection({ toast }) {
  const [status, setStatus] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const load = async () => {
    const token = await authToken();
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/v1/api-keys/anthropic`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setStatus(await res.json());
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!keyInput.startsWith('sk-ant-')) {
      toast('Key must start with sk-ant-', 'error');
      return;
    }
    setBusy(true);
    const token = await authToken();
    const res = await fetch(`${API_BASE}/api/v1/api-keys/anthropic`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyInput }),
    });
    setBusy(false);
    if (res.ok) {
      toast('Anthropic key saved', 'success');
      setKeyInput('');
      setShowInput(false);
      load();
    } else {
      const body = await res.json().catch(() => ({}));
      toast(body.error || 'Failed to save key', 'error');
    }
  };

  const remove = async () => {
    setBusy(true);
    const token = await authToken();
    const res = await fetch(`${API_BASE}/api/v1/api-keys/anthropic`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setBusy(false);
    if (res.ok) {
      toast('Anthropic key removed', 'success');
      load();
    }
  };

  return (
    <div className="dash-settings-section">
      <div className="dash-settings-section-head">Anthropic API Key (BYOK)</div>
      <div className="dash-settings-row">
        <div className="dash-settings-icon">🧠</div>
        <div className="dash-settings-info">
          <div className="dash-settings-label">Claude inference key</div>
          <div className="dash-settings-value">
            {status?.configured
              ? `Active — sk-ant-…${status.last4}`
              : 'Using platform default (your usage counts against ours)'}
          </div>
        </div>
        {status?.configured ? (
          <button className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>Remove</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setShowInput((v) => !v)}>
            {showInput ? 'Cancel' : 'Add key'}
          </button>
        )}
      </div>
      {showInput && !status?.configured && (
        <div className="dash-settings-row">
          <div className="dash-settings-icon">🔐</div>
          <div className="dash-settings-info" style={{ flex: 1 }}>
            <input
              type="password"
              placeholder="sk-ant-api03-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 6,
                fontFamily: 'monospace',
                fontSize: 13,
              }}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={busy || !keyInput}>
            {busy ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SettingsTab({ userName, user, orgName, planName, handleUpgrade, upgradeLoading, handleManageSubscription, apiKey, apiKeys, handleGenerateKey, handleRevokeKey, keyGenLoading, handleLogout, toast }) {
  return (
    <div className="dash-content">

      {/* Account */}
      <div className="dash-settings-section">
        <div className="dash-settings-section-head">Account</div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">👤</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Name</div>
            <div className="dash-settings-value">{userName}</div>
          </div>
        </div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">✉️</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Email</div>
            <div className="dash-settings-value">{user?.email || ''}</div>
          </div>
        </div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">🏢</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Organization</div>
            <div className="dash-settings-value">{orgName}</div>
          </div>
        </div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">⭐</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Plan</div>
            <div className="dash-settings-value">{planName}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {planName === 'FREE' && (
              <>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleUpgrade('pro')}
                  disabled={upgradeLoading}
                >
                  {upgradeLoading ? '...' : 'Pro — $49/mo'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleUpgrade('team')}
                  disabled={upgradeLoading}
                  style={{ borderColor: 'rgba(0,212,255,0.5)', color: '#00d4ff' }}
                >
                  {upgradeLoading ? '...' : 'Team — $299/mo'}
                </button>
              </>
            )}
            {planName === 'PRO' && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleUpgrade('team')}
                  disabled={upgradeLoading}
                  style={{ borderColor: 'rgba(0,212,255,0.5)', color: '#00d4ff' }}
                >
                  {upgradeLoading ? '...' : 'Upgrade to Team — $299/mo'}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleManageSubscription}
                >
                  Manage Subscription
                </button>
              </>
            )}
            {(planName === 'TEAM' || planName === 'ENTERPRISE') && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleManageSubscription}
              >
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="dash-settings-section">
        <div className="dash-settings-section-head">
          API Keys
          <button
            className="btn btn-primary btn-sm"
            disabled={keyGenLoading}
            onClick={() => handleGenerateKey()}
          >
            {keyGenLoading ? 'Generating...' : '+ Generate Key'}
          </button>
        </div>

        {apiKey && (
          <div className="dash-api-key-reveal">
            <code
              style={{ cursor: 'pointer' }}
              onClick={() => { navigator.clipboard.writeText(apiKey).catch(() => {}); toast('API key copied!', 'success'); }}
            >
              {apiKey}
            </code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { navigator.clipboard.writeText(apiKey).catch(() => {}); toast('API key copied!', 'success'); }}
            >
              Copy
            </button>
          </div>
        )}

        {apiKeys.length > 0 ? apiKeys.map(k => (
          <div key={k.id} className="dash-settings-row" style={{ opacity: k.active ? 1 : 0.4 }}>
            <div className="dash-settings-icon">🔑</div>
            <div className="dash-settings-info">
              <div className="dash-settings-label">{k.name}</div>
              <div className="dash-settings-value">{k.key}</div>
            </div>
            <span className={`dash-badge ${k.active ? 'green' : 'red'}`}>
              {k.active ? 'Active' : 'Revoked'}
            </span>
            {k.active && (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleRevokeKey(k)}
              >
                Revoke
              </button>
            )}
          </div>
        )) : (
          <div className="dash-empty">
            <div className="dash-empty-icon">🔑</div>
            <p>No API keys yet. Generate one to connect your agents.</p>
          </div>
        )}
      </div>

      {/* BYOK Anthropic key */}
      <AnthropicKeySection toast={toast} />

      {/* Danger zone */}
      <div className="dash-settings-section">
        <div className="dash-settings-section-head">Account Actions</div>
        <div className="dash-settings-row">
          <div className="dash-settings-icon">🚪</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Sign out</div>
            <div className="dash-settings-value">End your current session</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    </div>
  );
}
