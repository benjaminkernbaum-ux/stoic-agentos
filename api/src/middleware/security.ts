/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Security Headers Middleware (TypeScript)
 * ═══════════════════════════════════════════════════════
 *  Production security headers without external deps.
 *  Covers OWASP top-10 header recommendations.
 *
 *  NOTE: CORS is handled exclusively by the cors() middleware
 *  in server.ts. Do NOT duplicate CORS logic here.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware
 * Sets all recommended production security headers.
 * CORS is intentionally NOT handled here — see server.ts cors() config.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // ── Security Headers ──
  // Prevent MIME type sniffing
  res.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.set('X-Frame-Options', 'DENY');

  // XSS protection (legacy, but harmless)
  res.set('X-XSS-Protection', '0');

  // Don't leak referrer info
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy — restrict dangerous browser APIs
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // Strict Transport Security (HSTS) — enforce HTTPS
  res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Content Security Policy (API only — very strict)
  res.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

  // Remove server identification
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * Request ID middleware
 * Assigns a unique ID to every request for tracing.
 */
export function requestId(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
  const id = req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id as string;
  res.set('X-Request-ID', id);
  next();
}

export default { securityHeaders, requestId };
