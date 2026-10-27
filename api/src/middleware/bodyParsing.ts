import express from 'express';
import type { Request, Response, NextFunction } from 'express';

// Routes that verify a signature over the exact request bytes. They must not
// pass through the JSON parser: once it consumes the stream, a route-level
// express.raw() is a no-op and req.body is an object, not the raw Buffer.
export const RAW_BODY_PATHS = new Set(['/webhooks/stripe']);

const jsonParser = express.json({ limit: '1mb' });

export function jsonBodyParser(req: Request, res: Response, next: NextFunction): void {
  if (RAW_BODY_PATHS.has(req.path)) return next();
  jsonParser(req, res, next);
}
