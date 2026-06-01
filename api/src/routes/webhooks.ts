/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Webhook Routes (Production)
 * ═══════════════════════════════════════════════════════
 *  Git webhook capture with:
 *  - Event logging and delivery tracking
 *  - HMAC-SHA256 signature verification (mandatory)
 *  - Retry logic for failed deliveries
 *  - Webhook event history endpoints
 */

import { Router } from 'express';
import type { Response } from 'express';
import { authenticate, hashApiKey } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';
import { safeError } from '../lib/safeError.js';
import {
  logWebhookEvent,
  markDelivered,
  markFailed,
  verifySignature,
  getWebhookEvents,
  getWebhookStats,
} from '../lib/webhookEngine.js';

const router = Router();
const API_VERSION = 'v1';

// ── Git Webhook (no auth — uses API key in body) ──
router.post(`/api/${API_VERSION}/webhooks/git`, async (req, res) => {
  try {
    const { api_key, repo, branch, commit_hash, commit_message, author } = req.body;
    if (!api_key || !repo) {
      return res.status(400).json({
        error: 'api_key and repo required',
        code: 'VALIDATION_ERROR',
        request_id: req.requestId,
      });
    }
    if (!api_key.startsWith('sk_')) {
      return res.status(400).json({
        error: 'Invalid API key format',
        code: 'INVALID_API_KEY_FORMAT',
        request_id: req.requestId,
      });
    }

    if (!supabase) {
      return res.status(500).json({
        error: 'Database not configured',
        code: 'DB_NOT_CONFIGURED',
        request_id: req.requestId,
      });
    }

    // Verify API key (hashed)
    const tokenHash = hashApiKey(api_key);
    const { data: key } = await supabase
      .from('api_keys')
      .select('*, organizations(*)')
      .eq('key_hash', tokenHash)
      .eq('active', true)
      .single();

    if (!key) {
      return res.status(401).json({
        error: 'Invalid API key',
        code: 'INVALID_API_KEY',
        request_id: req.requestId,
      });
    }

    const orgId = key.org_id;

    // Mandatory signature verification
    const signature = req.headers['x-webhook-signature'] as string | undefined;
    if (!signature) {
      return res.status(401).json({
        error: 'Missing X-Webhook-Signature header — signature verification is required',
        code: 'MISSING_SIGNATURE',
        request_id: req.requestId,
      });
    }
    const rawBody = JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature, api_key)) {
      return res.status(401).json({
        error: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE',
        request_id: req.requestId,
      });
    }

    // Log the webhook event
    const event = logWebhookEvent('git_commit', orgId, {
      repo, branch, commit_hash, commit_message, author,
    });

    // Attempt delivery (insert observation)
    try {
      await supabase.from('observations').insert({
        org_id: orgId,
        type: 'git_commit',
        title: `[${repo}] ${commit_hash?.slice(0, 7)}: ${commit_message}`,
        content: JSON.stringify({ repo, branch, commit_hash, author }),
        importance: 5,
        metadata: { source: 'git_hook', repo, branch, webhook_event_id: event.id },
      });

      markDelivered(event.id);
    } catch (deliveryErr: unknown) {
      markFailed(event.id, (deliveryErr as Error).message);

      // Log but don't fail the webhook response — we've logged the event
      const logEntry = {
        level: 'error',
        time: new Date().toISOString(),
        service: 'stoic-agentos-api',
        event: 'webhook_delivery_failed',
        webhook_event_id: event.id,
        org_id: orgId,
        error: (deliveryErr as Error).message,
      };

      if (process.env.NODE_ENV === 'production') {
        process.stdout.write(JSON.stringify(logEntry) + '\n');
      } else {
        console.error(`⚠️  Webhook delivery failed for ${event.id}:`, (deliveryErr as Error).message);
      }
    }

    res.status(201).json({
      captured: true,
      event_id: event.id,
      request_id: req.requestId,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Webhook Event History (authenticated) ──
router.get(`/api/${API_VERSION}/webhooks/events`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50', status } = req.query;
    const events = getWebhookEvents(req.org.id, {
      limit: Math.min(parseInt(limit as string, 10) || 50, 200),
      status: status as string | undefined,
    });

    res.json({
      events,
      count: events.length,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// ── Webhook Stats (authenticated) ──
router.get(`/api/${API_VERSION}/webhooks/stats`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = getWebhookStats(req.org.id);
    res.json(stats);
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
