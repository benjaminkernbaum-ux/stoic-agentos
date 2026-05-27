/**
 * Stoic AgentOS — Event Bus
 *
 * Central event dispatcher for memory and compliance events.
 * Fires webhook events, in-memory subscribers, and future integrations.
 *
 * Usage:
 *   import { eventBus } from '../lib/eventBus.js';
 *   eventBus.emit('memory.episode.created', orgId, payload);
 *   eventBus.on('compliance.circuit_breaker', handler);
 */

import { logWebhookEvent } from './webhookEngine.js';

// ── Event Types ──

export type EventType =
  // Memory events
  | 'memory.working.set'
  | 'memory.working.cleared'
  | 'memory.episode.created'
  | 'memory.episode.invalidated'
  | 'memory.triple.created'
  | 'memory.triple.strengthened'
  | 'memory.triple.deleted'
  | 'memory.recall.executed'
  | 'memory.reflection.completed'
  | 'memory.decay.executed'
  // Compliance events
  | 'compliance.audit.logged'
  | 'compliance.audit.batch'
  | 'compliance.circuit_breaker'
  | 'compliance.export.requested';

type EventHandler = (orgId: string, payload: Record<string, unknown>) => void | Promise<void>;

// ── Event Bus ──

class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private globalHandlers: EventHandler[] = [];

  /**
   * Subscribe to a specific event type.
   */
  on(event: EventType | '*', handler: EventHandler): () => void {
    if (event === '*') {
      this.globalHandlers.push(handler);
      return () => {
        this.globalHandlers = this.globalHandlers.filter(h => h !== handler);
      };
    }

    const list = this.handlers.get(event) || [];
    list.push(handler);
    this.handlers.set(event, list);

    return () => {
      const updated = (this.handlers.get(event) || []).filter(h => h !== handler);
      this.handlers.set(event, updated);
    };
  }

  /**
   * Emit an event to all subscribers + log as webhook event.
   */
  async emit(event: EventType, orgId: string, payload: Record<string, unknown> = {}): Promise<void> {
    const eventPayload = {
      event,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    // Log to webhook engine for delivery tracking
    logWebhookEvent(event, orgId, eventPayload);

    // Fire specific handlers
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(orgId, eventPayload);
      } catch (err) {
        console.error(`[EventBus] Handler error for ${event}:`, (err as Error).message);
      }
    }

    // Fire global handlers
    for (const handler of this.globalHandlers) {
      try {
        await handler(orgId, eventPayload);
      } catch (err) {
        console.error(`[EventBus] Global handler error for ${event}:`, (err as Error).message);
      }
    }
  }

  /**
   * Get registered event count for debugging.
   */
  stats(): Record<string, number> {
    const result: Record<string, number> = { '*': this.globalHandlers.length };
    for (const [event, handlers] of this.handlers) {
      result[event] = handlers.length;
    }
    return result;
  }
}

// Singleton
export const eventBus = new EventBus();
export default eventBus;
