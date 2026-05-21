import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// ── Git Webhook (no auth — uses API key in body) ──
router.post(`/api/${API_VERSION}/webhooks/git`, async (req: Request, res: Response) => {
  try {
    const { api_key, repo, branch, commit_hash, commit_message, author } = req.body;
    if (!api_key || !repo) return res.status(400).json({ error: 'api_key and repo required' });
    if (!api_key.startsWith('sk_')) return res.status(400).json({ error: 'Invalid API key format' });

    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const { data: key } = await supabase
      .from('api_keys')
      .select('*, organizations(*)')
      .eq('key', api_key)
      .eq('active', true)
      .single();

    if (!key) return res.status(401).json({ error: 'Invalid API key' });

    await supabase.from('observations').insert({
      org_id: key.org_id,
      type: 'git_commit',
      title: `[${repo}] ${commit_hash?.slice(0, 7)}: ${commit_message}`,
      content: JSON.stringify({ repo, branch, commit_hash, author }),
      importance: 5,
      metadata: { source: 'git_hook', repo, branch },
    });

    res.status(201).json({ captured: true });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
