import { supabase } from './db.js';

export async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = auth.slice(7);

  // API key auth (sk_live_xxx or sk_test_xxx)
  if (token.startsWith('sk_')) {
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const { data: apiKey } = await supabase
      .from('api_keys')
      .select('*, organizations(*)')
      .eq('key', token)
      .eq('active', true)
      .single();
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });
    req.org = apiKey.organizations;
    req.apiKey = apiKey;
    // Update last_used_at
    await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
    return next();
  }

  // JWT auth (Supabase session token)
  if (!supabase) return res.status(500).json({ error: 'Database not configured' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  // Get user's org — try org_id from query first for multi-org support
  const orgId = req.query.org_id || req.body?.org_id;
  let membership;

  if (orgId) {
    const { data } = await supabase
      .from('org_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)
      .eq('org_id', orgId)
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

  if (!membership) return res.status(403).json({ error: 'No organization found' });

  req.user = user;
  req.org = membership.organizations;
  req.role = membership.role;
  next();
}
