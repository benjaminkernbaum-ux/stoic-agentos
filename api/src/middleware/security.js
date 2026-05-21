/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Security Headers Middleware
 * ═══════════════════════════════════════════════════════
 *  Production security headers without external deps.
 *  Covers OWASP top-10 header recommendations.
 */

// ── Allowed Origins ─────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://stoic-saas-hub.vercel.app',
  'https://stoic-agentos.vercel.app',
  'https://stoicagentos.com',
  'https://www.stoicagentos.com',
];

// Allow localhost in development
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) {
  ALLOWED_ORIGINS.push('http://localhost:5173');
  ALLOWED_ORIGINS.push('http://localhost:3000');
  ALLOWED_ORIGINS.push('http://localhost:4444');
  ALLOWED_ORIGINS.push('http://localhost:8888');
}

/**
 * Security headers middleware
 * Sets all recommended production security headers.
 */
export function securityHeaders(req, res, next) {
  // ── CORS ──
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || isDev)) {
    res.set('Access-Control-Allow-Origin', origin);
  }
  res.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '86400'); // Cache preflight 24h

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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

  // Server identification (obscure)
  res.set('X-Powered-By', 'Stoic AgentOS');
  res.removeHeader('X-Powered-By'); // Actually remove it

  next();
}

/**
 * Request ID middleware
 * Assigns a unique ID to every request for tracing.
 */
export function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = id;
  res.set('X-Request-ID', id);
  next();
}

export default { securityHeaders, requestId };
