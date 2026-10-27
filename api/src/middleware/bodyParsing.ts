import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { IncomingMessage } from 'node:http';

// Routes that verify a signature over the exact request bytes. They must not
// pass through the JSON parser: once it consumes the stream, a route-level
// express.raw() is a no-op and req.body is an object, not the raw Buffer.
export const RAW_BODY_PATHS = new Set(['/webhooks/stripe']);

// Routes that want parsed JSON *and* the exact bytes, to check an HMAC over
// what the client actually sent (re-serializing req.body changes key order
// and whitespace, so the signature would never match).
export const SIGNED_JSON_PATHS = new Set(['/api/v1/webhooks/git']);

export type RawBodyRequest = Request & { rawBody?: Buffer };

const jsonParser = express.json({
  limit: '1mb',
  verify: (req: IncomingMessage, _res, buf) => {
    const path = (req.url || '').split('?')[0];
    if (SIGNED_JSON_PATHS.has(path)) (req as RawBodyRequest).rawBody = buf;
  },
});

export function jsonBodyParser(req: Request, res: Response, next: NextFunction): void {
  if (RAW_BODY_PATHS.has(req.path)) return next();
  jsonParser(req, res, next);
}
