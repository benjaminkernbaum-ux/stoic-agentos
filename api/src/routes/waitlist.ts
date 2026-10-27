/**
 * Public waitlist capture for the landing page.
 *
 *   POST /api/v1/waitlist   { email, source? }  (no auth)
 *
 * Duplicates return the same 201 as new sign-ups, so the endpoint can't be
 * used to check whether an address is already on the list.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import { supabase } from '../middleware/db.js';
import { waitlistLimiter } from '../middleware/rateLimiter.js';
import { isTableMissing } from '../lib/utils.js';
import { safeError } from '../lib/safeError.js';

const router = Router();
const V = 'v1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post(`/api/${V}/waitlist`, waitlistLimiter, async (req: Request, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  const source = typeof req.body?.source === 'string' ? req.body.source.slice(0, 64) : null;

  if (!supabase) return res.status(503).json({ error: 'Waitlist unavailable' });

  try {
    const { error } = await supabase
      .from('waitlist')
      .upsert({ email, source }, { onConflict: 'email', ignoreDuplicates: true });
    if (error) {
      // PGRST205: PostgREST can't find the table in its schema cache.
      if (isTableMissing(error) || error.code === 'PGRST205') {
        console.warn('[waitlist] table missing — run migration 032_waitlist.sql');
        return res.status(503).json({ error: 'Waitlist unavailable' });
      }
      throw error;
    }
    res.status(201).json({ ok: true });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
