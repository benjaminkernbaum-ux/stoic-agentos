/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Safe Error Handler
 * ═══════════════════════════════════════════════════════
 *  Returns a generic error message in production to prevent
 *  leaking internal details (table names, constraints, etc.)
 */

import type { Response } from 'express';

export function safeError(res: Response, err: unknown, statusCode = 500): void {
  const message = (err as Error).message || 'Unknown error';
  
  // Log full error server-side for debugging
  console.error(`[${statusCode}]`, message);
  
  // In production, return generic message to prevent info leakage
  const clientMessage = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : message;

  res.status(statusCode).json({ error: clientMessage });
}
