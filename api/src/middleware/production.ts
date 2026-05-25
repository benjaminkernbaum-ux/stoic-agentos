/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Production Middleware Stack
 * ═══════════════════════════════════════════════════════
 *  Centralized production middleware:
 *  - Request ID assignment (x-request-id)
 *  - Metrics collection per request
 *  - Structured JSON request logging
 *  - Global error handler (catch-all)
 *  - Uncaught rejection / exception handlers
 *
 *  All middleware is typed for Express 4.x + TypeScript.
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { recordRequest, connectionOpened, connectionClosed } from '../lib/metrics.js';

// ── Types ──

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// ── Request ID ──────────────────────────────────────

/**
 * Assigns a unique request ID from the x-request-id header
 * or generates one. Sets it on both req.requestId and the
 * response header for end-to-end tracing.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// ── Metrics + Structured Logging ────────────────────

/**
 * Captures start time, tracks active connections, and logs
 * request completion with structured JSON in production.
 * Also feeds the metrics collector.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.startTime = Date.now();
  connectionOpened();

  res.on('finish', () => {
    connectionClosed();
    const durationMs = Date.now() - (req.startTime || Date.now());
    const path = req.originalUrl || req.url;

    // Feed metrics collector
    recordRequest(req.method, path, res.statusCode, durationMs);

    // Skip health check logging noise
    if (path.includes('/health')) return;

    // Structured JSON log
    const logEntry = {
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      time: new Date().toISOString(),
      service: 'stoic-agentos-api',
      requestId: req.requestId,
      method: req.method,
      path,
      status: res.statusCode,
      duration_ms: durationMs,
      ip: req.ip,
      user_agent: req.headers['user-agent']?.slice(0, 100),
    };

    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else {
      const color = res.statusCode >= 500 ? '\x1b[31m'
        : res.statusCode >= 400 ? '\x1b[33m'
        : '\x1b[32m';
      console.log(`${color}${req.method}\x1b[0m ${path} ${res.statusCode} ${durationMs}ms`);
    }
  });

  next();
}

// ── Standardized Error Response ─────────────────────

interface ApiError {
  status?: number;
  statusCode?: number;
  code?: string;
  message: string;
  details?: unknown;
  expose?: boolean;
}

/**
 * Global error handler — catches any error thrown or passed via next(err).
 * Returns a standardized JSON error response:
 * { error: string, code: string, request_id: string, details?: any }
 */
export const globalErrorHandler: ErrorRequestHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = err.status || err.statusCode || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  const message = status >= 500 && !err.expose
    ? 'Internal server error'
    : err.message || 'Unknown error';

  // Log the full error for 5xx
  if (status >= 500) {
    const logEntry = {
      level: 'error',
      time: new Date().toISOString(),
      service: 'stoic-agentos-api',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      error: err.message,
      stack: (err as Error).stack,
      code,
    };

    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(JSON.stringify(logEntry) + '\n');
    } else {
      console.error(`\x1b[31m[ERROR]\x1b[0m ${req.method} ${req.originalUrl}:`, err.message);
      if ((err as Error).stack) console.error((err as Error).stack);
    }
  }

  res.status(status).json({
    error: message,
    code,
    request_id: req.requestId,
    ...(err.details ? { details: err.details } : {}),
  });
};

// ── Process-Level Safety Nets ───────────────────────

/**
 * Install handlers for uncaught exceptions and unhandled
 * promise rejections. Logs and optionally exits on fatal.
 */
export function installProcessHandlers(): void {
  process.on('unhandledRejection', (reason: unknown) => {
    const logEntry = {
      level: 'fatal',
      time: new Date().toISOString(),
      service: 'stoic-agentos-api',
      event: 'unhandled_rejection',
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    };
    process.stdout.write(JSON.stringify(logEntry) + '\n');
    // Don't crash — log and continue. Railway will restart if we die.
  });

  process.on('uncaughtException', (err: Error) => {
    const logEntry = {
      level: 'fatal',
      time: new Date().toISOString(),
      service: 'stoic-agentos-api',
      event: 'uncaught_exception',
      error: err.message,
      stack: err.stack,
    };
    process.stdout.write(JSON.stringify(logEntry) + '\n');
    // Give time for log to flush, then exit
    setTimeout(() => process.exit(1), 1000);
  });

  // Graceful shutdown on SIGTERM/SIGINT (Railway sends SIGTERM)
  const shutdown = (signal: string) => {
    console.log(`\n⚡ Received ${signal} — shutting down gracefully...`);
    // Allow in-flight requests to complete (5s grace)
    setTimeout(() => {
      console.log('⚡ Shutdown complete.');
      process.exit(0);
    }, 5000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
