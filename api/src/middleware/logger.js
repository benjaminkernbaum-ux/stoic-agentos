/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Structured Logger (pino-compatible)
 * ═══════════════════════════════════════════════════════
 *  Zero-dependency structured logger that outputs JSON
 *  in production and pretty-prints in development.
 *
 *  Drop-in replacement for console.log with:
 *    - JSON structured output (machine-parseable)
 *    - Log levels (trace, debug, info, warn, error, fatal)
 *    - Request context (requestId, org, method, path)
 *    - Duration tracking
 *    - Child loggers for per-module context
 */

const LOG_LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const LEVEL_NAMES = Object.fromEntries(Object.entries(LOG_LEVELS).map(([k, v]) => [v, k]));
const isProd = process.env.NODE_ENV === 'production';
const minLevel = LOG_LEVELS[process.env.LOG_LEVEL || (isProd ? 'info' : 'debug')] || 30;

function formatTimestamp() {
  return new Date().toISOString();
}

function createLogger(baseContext = {}) {
  function log(level, msgOrObj, ...args) {
    const numLevel = LOG_LEVELS[level] || 30;
    if (numLevel < minLevel) return;

    const entry = {
      level,
      time: formatTimestamp(),
      ...baseContext,
    };

    if (typeof msgOrObj === 'string') {
      entry.msg = args.length > 0 ? `${msgOrObj} ${args.join(' ')}` : msgOrObj;
    } else if (typeof msgOrObj === 'object' && msgOrObj !== null) {
      Object.assign(entry, msgOrObj);
      if (args.length > 0 && typeof args[0] === 'string') {
        entry.msg = args.join(' ');
      }
    }

    if (isProd) {
      // JSON structured output — one line per log
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      // Pretty print for development
      const color = level === 'error' || level === 'fatal' ? '\x1b[31m'
        : level === 'warn' ? '\x1b[33m'
        : level === 'debug' ? '\x1b[36m'
        : level === 'trace' ? '\x1b[90m'
        : '\x1b[32m';
      const reset = '\x1b[0m';
      const prefix = `${color}[${level.toUpperCase().padEnd(5)}]${reset}`;
      const msg = entry.msg || '';
      const ctx = { ...entry };
      delete ctx.level; delete ctx.time; delete ctx.msg;
      const ctxStr = Object.keys(ctx).length > 0 ? ` ${JSON.stringify(ctx)}` : '';
      console.log(`${prefix} ${msg}${ctxStr}`);
    }
  }

  const logger = {
    trace: (msgOrObj, ...args) => log('trace', msgOrObj, ...args),
    debug: (msgOrObj, ...args) => log('debug', msgOrObj, ...args),
    info:  (msgOrObj, ...args) => log('info', msgOrObj, ...args),
    warn:  (msgOrObj, ...args) => log('warn', msgOrObj, ...args),
    error: (msgOrObj, ...args) => log('error', msgOrObj, ...args),
    fatal: (msgOrObj, ...args) => log('fatal', msgOrObj, ...args),

    /**
     * Create a child logger with additional context
     * @param {Object} context - Additional fields merged into every log entry
     */
    child: (context) => createLogger({ ...baseContext, ...context }),
  };

  return logger;
}

// ── Root Logger ────────────────────────────────────
export const logger = createLogger({ service: 'stoic-agentos-api' });

/**
 * Express request logging middleware
 * Logs every non-health request with method, path, status, duration.
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const reqLogger = logger.child({
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl || req.url,
  });

  // Attach logger to request for use in route handlers
  req.log = reqLogger;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = req.originalUrl || req.url;

    // Skip health check noise
    if (path.includes('/health')) return;

    const logData = {
      status: res.statusCode,
      duration_ms: duration,
      org_id: req.org?.id,
      user_id: req.user?.id,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      reqLogger.error(logData, `${req.method} ${path} ${res.statusCode} ${duration}ms`);
    } else if (res.statusCode >= 400) {
      reqLogger.warn(logData, `${req.method} ${path} ${res.statusCode} ${duration}ms`);
    } else {
      reqLogger.info(logData, `${req.method} ${path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
}

export default logger;
