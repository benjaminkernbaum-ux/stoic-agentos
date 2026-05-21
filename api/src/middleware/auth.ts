import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types.js';
import { supabase } from './db.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }
  const token = auth.slice(7);

  // API key auth (sk_live_xxx or sk_test_xxx)
  if (token.startsWith('sk_')) {
    if (!supabase) { res.status(500).json({ error: 'Database not configured' }); return; }
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('*, organizations(*)')
      .eq('key', token)
      .eq('active', true)
      .single();
    if (!apiKey) { res.status(401).json({ error: 'Invalid API key' }); return; }
    (req as AuthenticatedRequest).org = apiKey.organizations;
    (req as AuthenticatedRequest).apiKey = apiKey;
    // Update last_used_at
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
    return next();
  }

  // JWT auth (Supabase session token)
  if (!supabase) { res.status(500).json({ error: 'Database not configured' }); return; }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { res.status(401).json({ error: 'Invalid token' }); return; }

  // Get user's org — try org_id from query first for multi-org support
  const orgId = req.query.org_id || req.body?.org_id;
  let membership: Record<string, unknown> | null = null;

  if (orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('org_id', orgId as string)
      .single();
    membership = data;
  } else {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .limit(1)
      .single();
    membership = data;
  }

  if (!membership) { res.status(403).json({ error: 'No organization found' }); return; }

  (req as AuthenticatedRequest).user = user as { id: string; email: string };
  (req as AuthenticatedRequest).org = (membership as Record<string, unknown>).organizations as AuthenticatedRequest['org'];
  (req as AuthenticatedRequest).role = (membership as Record<string, unknown>).role as string;
  next();
}
