import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../middleware/db.js';

const router = Router();
const API_VERSION = 'v1';

// ── Auth: Setup Org (called after first signup) ──
router.post(`/api/${API_VERSION}/auth/setup-org`, async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const token = auth.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // Check if user already has an org
    const { data: existing } = await supabase
      .from('org_members')
      .select('org_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (existing?.organizations) {
      return res.json(existing.organizations);
    }

    const { name, slug } = req.body;
    const orgName = name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Organization';
    const orgSlug = slug || orgName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);

    // Create org
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: orgName, slug: orgSlug, plan: 'free' })
      .select()
      .single();
    if (orgErr) throw orgErr;

    // Add user as owner
    const { error: memberErr } = await supabase
      .from('org_members')
      .insert({ org_id: org.id, user_id: user.id, role: 'owner' });
    if (memberErr) throw memberErr;

    // Generate initial API key
    const apiKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    await supabase.from('api_keys').insert({
      org_id: org.id,
      key: apiKey,
      name: 'Default',
    });

    res.json({ ...org, api_key: apiKey });
  } catch (err: unknown) {
    console.error('Setup org error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

// ── Auth: Get current user's org membership ──
router.get(`/api/${API_VERSION}/auth/me`, async (req: Request, res: Response) => {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing auth' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const token = auth.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: membership, error: memberErr } = await supabase
      .from('org_members')
      .select('org_id, role, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (memberErr || !membership) {
      return res.status(404).json({ error: 'No organization found', user_id: user.id });
    }

    res.json({
      org_id: membership.org_id,
      role: membership.role,
      organization: membership.organizations,
    });
  } catch (err: unknown) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
