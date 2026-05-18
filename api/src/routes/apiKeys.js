import { Router } from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import { invalidateOrgKeyCache } from '../lib/anthropic.js';

const router = Router();
const API_VERSION = 'v1';

// ── List API Keys ──
router.get(`/api/${API_VERSION}/api-keys`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key, active, created_at, last_used_at')
      .eq('org_id', req.org.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    // Mask keys for security
    const masked = (data || []).map(k => ({
      ...k,
      key: k.key.slice(0, 12) + '...' + k.key.slice(-4),
    }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Create API Key ──
router.post(`/api/${API_VERSION}/api-keys`, authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    const keyValue = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        org_id: req.org.id,
        key: keyValue,
        name: name || `Key ${Date.now().toString(36)}`,
      })
      .select()
      .single();
    if (error) throw error;
    // Return full key ONCE — client must save it
    res.status(201).json({ ...data, key: keyValue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Anthropic key status (masked) ──
router.get(`/api/${API_VERSION}/api-keys/anthropic`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('anthropic_key_last4, anthropic_key_updated_at')
      .eq('id', req.org.id)
      .single();
    if (error) throw error;
    res.json({
      configured: Boolean(data.anthropic_key_last4),
      last4: data.anthropic_key_last4,
      updated_at: data.anthropic_key_updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Set Anthropic key (BYOK) — stored encrypted in Supabase Vault ──
router.post(`/api/${API_VERSION}/api-keys/anthropic`, authenticate, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !key.startsWith('sk-ant-')) {
      return res.status(400).json({ error: 'Invalid Anthropic API key format (expected sk-ant-...)' });
    }
    const { data: last4, error } = await supabase.rpc('set_org_anthropic_key', {
      p_org_id: req.org.id,
      p_key: key,
    });
    if (error) throw error;
    invalidateOrgKeyCache(req.org.id);
    res.json({ configured: true, last4 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Remove Anthropic key ──
router.delete(`/api/${API_VERSION}/api-keys/anthropic`, authenticate, async (req, res) => {
  try {
    const { error } = await supabase.rpc('clear_org_anthropic_key', {
      p_org_id: req.org.id,
    });
    if (error) throw error;
    invalidateOrgKeyCache(req.org.id);
    res.json({ configured: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Revoke API Key ──
router.delete(`/api/${API_VERSION}/api-keys/:id`, authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', req.params.id)
      .eq('org_id', req.org.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ revoked: true, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
