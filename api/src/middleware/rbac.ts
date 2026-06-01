/**
 * ═══════════════════════════════════════════════════════
 *  Stoic AgentOS — Role-Based Access Control (RBAC)
 * ═══════════════════════════════════════════════════════
 *  Middleware to enforce role-based permissions on routes.
 *  Roles: owner > admin > member
 */

import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types.js';

/** Role hierarchy — higher index = more permissions */
const ROLE_HIERARCHY: Record<string, number> = {
  member: 0,
  admin: 1,
  owner: 2,
};

/**
 * Middleware factory: require the calling user to have one of the specified roles.
 * For API key auth (no user/role), defaults to 'owner' level access.
 *
 * @example
 * router.post('/api-keys', authenticate, requireRole('owner', 'admin'), handler);
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // API key auth — keys implicitly have full org access (owner-level)
    if (req.apiKey) {
      return next();
    }

    const userRole = req.role;
    if (!userRole) {
      res.status(403).json({
        error: 'Forbidden — no role assigned',
        code: 'RBAC_NO_ROLE',
        request_id: (req as any).requestId,
      });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Forbidden — requires role: ${allowedRoles.join(' or ')}`,
        code: 'RBAC_INSUFFICIENT_ROLE',
        your_role: userRole,
        required: allowedRoles,
        request_id: (req as any).requestId,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: require minimum role level.
 * Uses the role hierarchy to check if user has at least the minimum role.
 *
 * @example
 * router.delete('/agents/:id', authenticate, requireMinRole('admin'), handler);
 */
export function requireMinRole(minRole: string) {
  const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // API key auth — owner-level
    if (req.apiKey) return next();

    const userLevel = ROLE_HIERARCHY[req.role || ''] ?? -1;
    if (userLevel < minLevel) {
      res.status(403).json({
        error: `Forbidden — requires at least '${minRole}' role`,
        code: 'RBAC_INSUFFICIENT_LEVEL',
        your_role: req.role,
        required_minimum: minRole,
        request_id: (req as any).requestId,
      });
      return;
    }
    next();
  };
}
