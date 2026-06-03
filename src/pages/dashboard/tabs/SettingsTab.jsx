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
  const [migrationPending, setMigrationPending] = useState(false);

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
      setMigrationPending(false);
      load();
    } else if (res.status === 503) {
      setMigrationPending(true);
      toast('BYOK not yet enabled — backend migration is pending', 'error');
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
      {migrationPending && (
        <div style={{ fontSize: 12, padding: '10px 12px', background: 'rgba(255,193,7,0.08)', borderLeft: '2px solid #ffc107', borderRadius: 4, marginTop: 8, opacity: 0.85 }}>
          BYOK is not yet enabled on this deployment. Inference still works through the platform key — per-org keys will be available once the backend migration runs.
        </div>
      )}
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

function AnthropicUsagePanel() {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async (windowDays) => {
    setLoading(true);
    const token = await authToken();
    if (!token) { setLoading(false); return; }
    const res = await fetch(`${API_BASE}/api/v1/insights/usage?days=${windowDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(days); }, [days]);

  if (loading && !data) return null;

  const totals = data?.totals || {};
  const fmt = (n) => (n || 0).toLocaleString();

  return (
    <div className="dash-settings-section">
      <div className="dash-settings-section-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Claude Usage</span>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', padding: '4px 8px', borderRadius: 6, fontSize: 12 }}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.55 }}>Calls</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(totals.calls)}</div>
        </div>
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.55 }}>Input tokens</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(totals.input)}</div>
        </div>
        <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.55 }}>Output tokens</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{fmt(totals.output)}</div>
        </div>
        <div style={{ padding: 12, background: 'rgba(0,212,255,0.06)', borderRadius: 6, borderLeft: '2px solid #00d4ff' }}>
          <div style={{ fontSize: 11, opacity: 0.55 }}>Est. cost</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#00d4ff' }}>${(totals.cost_usd || 0).toFixed(2)}</div>
        </div>
      </div>

      {totals.cache_read > 0 && (
        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 12 }}>
          Cache hits saved {fmt(totals.cache_read)} tokens at ~90% off (cache reads cost ~10% of input).
        </div>
      )}

      {Object.keys(data?.by_endpoint || {}).length > 0 && (
        <div style={{ fontSize: 12 }}>
          <div style={{ opacity: 0.55, marginBottom: 6 }}>By endpoint:</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(data.by_endpoint).map(([k, v]) => (
              <span key={k}><code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{k}</code> {v}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsTab({ userName, user, orgName, planName, handleUpgrade, upgradeLoading, handleManageSubscription, apiKey, apiKeys, handleGenerateKey, handleRevokeKey, keyGenLoading, handleLogout, toast }) {
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // 'account' | 'org' | null

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const token = await authToken();
      const res = await fetch(`${API_BASE}/api/v1/gdpr/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stoic-agentos-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast('Data exported successfully', 'success');
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Export failed', 'error');
      }
    } catch {
      toast('Export failed — check your connection', 'error');
    }
    setExportLoading(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const token = await authToken();
      const res = await fetch(`${API_BASE}/api/v1/gdpr/delete-account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE MY ACCOUNT' }),
      });
      if (res.ok) {
        toast('Account deleted. Signing out...', 'success');
        setTimeout(() => handleLogout(), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || 'Deletion failed', 'error');
      }
    } catch {
      toast('Deletion failed — check your connection', 'error');
    }
    setDeleteLoading(false);
    setShowDeleteConfirm(null);
  };

  const handleDeleteOrg = async () => {
    setDeleteLoading(true);
    try {
      const token = await authToken();
      const res = await fetch(`${API_BASE}/api/v1/gdpr/delete-org`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE MY DATA', org_slug: orgName?.toLowerCase().replace(/\s+/g, '-') }),
      });
      if (res.ok) {
        toast('Organization deleted. Signing out...', 'success');
        setTimeout(() => handleLogout(), 2000);
      } else {
        const body = await res.json().catch(() => ({}));
        toast(body.error || body.hint || 'Deletion failed', 'error');
      }
    } catch {
      toast('Deletion failed — check your connection', 'error');
    }
    setDeleteLoading(false);
    setShowDeleteConfirm(null);
  };

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
                  {upgradeLoading ? '...' : 'Pro — $29/mo'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleUpgrade('team')}
                  disabled={upgradeLoading}
                  style={{ borderColor: 'rgba(0,212,255,0.5)', color: '#00d4ff' }}
                >
                  {upgradeLoading ? '...' : 'Team — $79/mo'}
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
                  {upgradeLoading ? '...' : 'Upgrade to Team — $79/mo'}
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

      {/* Claude usage */}
      <AnthropicUsagePanel />

      {/* Data & Privacy (GDPR) */}
      <div className="dash-settings-section">
        <div className="dash-settings-section-head">Data & Privacy</div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">📦</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Export Your Data</div>
            <div className="dash-settings-value">Download a JSON archive of all your organization data (GDPR Art. 15/20)</div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleExportData}
            disabled={exportLoading}
          >
            {exportLoading ? 'Exporting...' : '⬇ Export'}
          </button>
        </div>

        <div className="dash-settings-row">
          <div className="dash-settings-icon">📋</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label">Data Retention</div>
            <div className="dash-settings-value">Traces: 90 days · Observations: 6 months · Chat: 6 months · Audit: 3 years</div>
          </div>
          <a href="/privacy" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View Policy</a>
        </div>

        <div className="dash-settings-row" style={{ borderLeft: '2px solid rgba(255,100,100,0.3)', paddingLeft: 12 }}>
          <div className="dash-settings-icon">⚠️</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label" style={{ color: '#ff6b6b' }}>Delete Account</div>
            <div className="dash-settings-value">Remove your personal data and leave this organization (GDPR Art. 17)</div>
          </div>
          {showDeleteConfirm === 'account' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteAccount} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm('account')}>Delete Account</button>
          )}
        </div>

        <div className="dash-settings-row" style={{ borderLeft: '2px solid rgba(255,50,50,0.5)', paddingLeft: 12 }}>
          <div className="dash-settings-icon">🗑️</div>
          <div className="dash-settings-info">
            <div className="dash-settings-label" style={{ color: '#ff4444' }}>Delete Organization</div>
            <div className="dash-settings-value">Permanently delete all org data: agents, traces, memory, and billing (irreversible)</div>
          </div>
          {showDeleteConfirm === 'org' ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteOrg} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : '⚠ Confirm Delete Org'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
            </div>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm('org')}>Delete Org</button>
          )}
        </div>
      </div>

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
