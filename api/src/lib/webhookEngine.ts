/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Webhook Delivery System
 * ═══════════════════════════════════════════════════════
 *  In-memory webhook event log + retry queue for production
 *  webhook delivery reliability.
 *
 *  Features:
 *  - Event logging with delivery status tracking
 *  - Exponential backoff retries (max 5 attempts)
 *  - HMAC-SHA256 signature verification
 *  - Webhook delivery history endpoint
 *  - Auto-cleanup of old events
 */

import crypto from 'crypto';

// ── Types ──

export interface WebhookEvent {
  id: string;
  type: string;                    // e.g. 'git_commit', 'observation.created'
  org_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  error: string | null;
  created_at: string;
  delivered_at: string | null;
}

interface DeliveryTarget {
  url: string;
  secret?: string;
}

// ── Constants ──

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [
  5_000,      // 5s
  30_000,     // 30s
  120_000,    // 2m
  600_000,    // 10m
  3600_000,   // 1h
];
const MAX_EVENT_STORE_SIZE = 10_000;
const EVENT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── In-memory event store ──

const eventStore: WebhookEvent[] = [];
const retryQueue: Map<string, NodeJS.Timeout> = new Map();

// ── Helpers ──

function generateEventId(): string {
  return `whevt_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Generate HMAC-SHA256 signature for webhook payload verification.
 * Returns: sha256=<hex>
 */
export function signPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload, 'utf8');
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify a webhook signature from the X-Webhook-Signature header.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ── Event Lifecycle ──

/**
 * Log a new webhook event. Returns the event for tracking.
 */
export function logWebhookEvent(
  type: string,
  orgId: string,
  payload: Record<string, unknown>,
): WebhookEvent {
  const event: WebhookEvent = {
    id: generateEventId(),
    type,
    org_id: orgId,
    payload,
    status: 'pending',
    attempts: 0,
    max_attempts: MAX_RETRY_ATTEMPTS,
    last_attempt_at: null,
    next_retry_at: null,
    error: null,
    created_at: new Date().toISOString(),
    delivered_at: null,
  };

  eventStore.push(event);

  // Cap store size
  if (eventStore.length > MAX_EVENT_STORE_SIZE) {
    eventStore.splice(0, eventStore.length - MAX_EVENT_STORE_SIZE);
  }

  return event;
}

/**
 * Mark an event as successfully delivered.
 */
export function markDelivered(eventId: string): void {
  const event = eventStore.find(e => e.id === eventId);
  if (event) {
    event.status = 'delivered';
    event.delivered_at = new Date().toISOString();
  }
  // Cancel any pending retry
  const timer = retryQueue.get(eventId);
  if (timer) {
    clearTimeout(timer);
    retryQueue.delete(eventId);
  }
}

/**
 * Mark an event as failed and optionally schedule a retry.
 */
export function markFailed(eventId: string, error: string): void {
  const event = eventStore.find(e => e.id === eventId);
  if (!event) return;

  event.attempts++;
  event.last_attempt_at = new Date().toISOString();
  event.error = error;

  if (event.attempts >= event.max_attempts) {
    event.status = 'failed';
    event.next_retry_at = null;
  } else {
    event.status = 'retrying';
    const delayMs = RETRY_DELAYS_MS[Math.min(event.attempts - 1, RETRY_DELAYS_MS.length - 1)];
    event.next_retry_at = new Date(Date.now() + delayMs).toISOString();
  }
}

/**
 * Schedule a retry for a webhook delivery.
 * Calls the deliverFn after the backoff delay.
 */
export function scheduleRetry(
  eventId: string,
  deliverFn: () => Promise<void>,
): void {
  const event = eventStore.find(e => e.id === eventId);
  if (!event || event.status !== 'retrying') return;

  const delayMs = RETRY_DELAYS_MS[Math.min(event.attempts - 1, RETRY_DELAYS_MS.length - 1)];

  const timer = setTimeout(async () => {
    retryQueue.delete(eventId);
    try {
      await deliverFn();
      markDelivered(eventId);
    } catch (err: unknown) {
      markFailed(eventId, (err as Error).message);
      // Recursive retry if still retrying
      if (event.status === 'retrying') {
        scheduleRetry(eventId, deliverFn);
      }
    }
  }, delayMs);

  retryQueue.set(eventId, timer);
}

// ── Query Events ──

/**
 * Get webhook events for an org, newest first.
 */
export function getWebhookEvents(
  orgId: string,
  options: { limit?: number; status?: string } = {},
): WebhookEvent[] {
  const { limit = 50, status } = options;
  let filtered = eventStore.filter(e => e.org_id === orgId);
  if (status) filtered = filtered.filter(e => e.status === status);
  return filtered
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

/**
 * Get summary stats for an org's webhook events.
 */
export function getWebhookStats(orgId: string): {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  retrying: number;
} {
  const events = eventStore.filter(e => e.org_id === orgId);
  return {
    total: events.length,
    delivered: events.filter(e => e.status === 'delivered').length,
    failed: events.filter(e => e.status === 'failed').length,
    pending: events.filter(e => e.status === 'pending').length,
    retrying: events.filter(e => e.status === 'retrying').length,
  };
}

// ── Cleanup old events every hour ──

setInterval(() => {
  const cutoff = Date.now() - EVENT_TTL_MS;
  let i = 0;
  while (i < eventStore.length && new Date(eventStore[i].created_at).getTime() < cutoff) {
    i++;
  }
  if (i > 0) {
    eventStore.splice(0, i);
  }
}, 3600_000);

export default {
  logWebhookEvent,
  markDelivered,
  markFailed,
  scheduleRetry,
  signPayload,
  verifySignature,
  getWebhookEvents,
  getWebhookStats,
};
