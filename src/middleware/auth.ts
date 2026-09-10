import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db, withDbRetry } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyServerSessionToken, createServerSessionToken, revokeSession, revokeAllUserSessions } from '../../server/security/session.ts';
import { checkUserHasPermission, PERMISSIONS, ALL_PERMISSIONS_DEFINITIONS } from '../constants/permissions.ts';

export { createServerSessionToken, verifyServerSessionToken, revokeSession, revokeAllUserSessions };

export type DbUser = typeof users.$inferSelect;

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
  dbUser?: DbUser | null;
}

/**
 * Strict authentication middleware:
 * 1. Validates cryptographically signed `srv_` session tokens via HMAC-SHA256 & revocation checks
 * 2. Validates Firebase ID tokens ONLY via official Firebase Admin SDK cryptographic verification
 * 3. Enforces database user existence: if user is not in DB -> 401
 * 4. Enforces active status: if user isActive === false -> 403
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Empty token' });
  }

  let decodedToken: { uid: string; email: string; name?: string; picture?: string } | null = null;

  // 1. Try server session token (Cryptographically verified with HMAC, Expiry, and Revocation)
  if (token.startsWith('srv_')) {
    const payload = verifyServerSessionToken(token);
    if (payload) {
      decodedToken = {
        uid: payload.uid,
        email: payload.email,
        name: payload.name,
      };
    }
  } else {
    // 2. Try Firebase ID token (Strict Cryptographic Verification ONLY via Firebase Admin SDK)
    try {
      const fbDecoded = await adminAuth.verifyIdToken(token);
      if (fbDecoded && fbDecoded.uid) {
        decodedToken = {
          uid: fbDecoded.uid,
          email: fbDecoded.email || '',
          name: fbDecoded.name || (fbDecoded.email ? fbDecoded.email.split('@')[0] : 'مستخدم'),
          picture: fbDecoded.picture,
        };
      }
    } catch (fbErr) {
      // Cryptographic verification failed or invalid token - strictly reject
      decodedToken = null;
    }
  }

  if (!decodedToken || !decodedToken.uid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired authentication token' });
  }

  req.user = decodedToken;
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();

  // Retrieve user record from database
  try {
    await withDbRetry(async () => {
      let dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken!.uid));
      if (dbUsers.length === 0 && decodedToken!.email) {
        dbUsers = await db.select().from(users).where(eq(users.email, decodedToken!.email.toLowerCase().trim()));
      }

      if (dbUsers.length > 0) {
        req.dbUser = dbUsers[0];

        // Ensure system owner / superadmin status matches server environment configuration
        const role = (req.dbUser.role || '').toLowerCase();
        const isSuperAdminEnv = !!superAdminEmail && req.dbUser.email?.toLowerCase().trim() === superAdminEmail;
        
        if (isSuperAdminEnv && role !== 'owner' && role !== 'system_owner' && role !== 'superadmin') {
          const ownerPermissions = [
            'news_add', 'news_edit', 'news_delete', 'news_publish', 'news_featured', 'news_breaking',
            'categories_manage', 'matches_manage', 'predictions_manage', 'contests_manage',
            'users_view', 'users_manage', 'logs_view', 'admins_manage', 'managers_manage', 'settings_manage'
          ];
          await db.update(users)
            .set({ role: 'owner', isAdmin: true, isActive: true, permissions: ownerPermissions })
            .where(eq(users.id, req.dbUser.id));
          req.dbUser.role = 'owner';
          req.dbUser.isAdmin = true;
          req.dbUser.isActive = true;
          req.dbUser.permissions = ownerPermissions;
        }
      }
    });
  } catch (dbErr) {
    console.error('[Auth Middleware DB Error]:', dbErr);
  }

  // If user does not exist in the database -> reject with 401 (token alone cannot keep deleted user valid)
  if (!req.dbUser) {
    return res.status(401).json({ error: 'المستخدم غير موجود أو تم حذف الحساب' });
  }

  // If user exists in DB but is inactive/deactivated -> reject with 403
  if (!req.dbUser.isActive) {
    return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
  }

  next();
};

/**
 * Checks if a DB user object is System Owner
 */
export function isDbUserOwner(dbUser: Partial<DbUser> | null | undefined): boolean {
  if (!dbUser) return false;
  const role = (dbUser.role || '').toLowerCase();
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  return (
    role === 'owner' ||
    role === 'system_owner' ||
    role === 'superadmin' ||
    (!!superAdminEmail && dbUser.email?.toLowerCase().trim() === superAdminEmail)
  );
}

/**
 * Checks if a DB user object is System Manager or above
 */
export function isDbUserManager(dbUser: Partial<DbUser> | null | undefined): boolean {
  if (!dbUser) return false;
  if (isDbUserOwner(dbUser)) return true;
  const role = (dbUser.role || '').toLowerCase();
  return role === 'manager' || role === 'system_manager';
}

/**
 * Checks if a DB user object has any admin privilege
 */
export function isDbUserAdmin(dbUser: Partial<DbUser> | null | undefined): boolean {
  if (!dbUser) return false;
  if (isDbUserManager(dbUser)) return true;
  const role = (dbUser.role || '').toLowerCase();
  return Boolean(dbUser.isAdmin) || role === 'admin';
}

/**
 * Permission requirement middleware:
 * Enforces 3-tier hierarchy:
 * 1. System Owner: passes everything
 * 2. System Manager: passes all operational permissions (except managers_manage)
 * 3. Admin: checks explicit permissions array
 */
export const requirePermission = (permission?: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.dbUser) {
      await new Promise<void>((resolve) => {
        requireAuth(req, res, () => {
          resolve();
        });
      });
      if (res.headersSent) return;
    }

    if (!req.user || !req.dbUser) {
      if (!res.headersSent) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }
      return;
    }

    if (!req.dbUser.isActive) {
      if (!res.headersSent) {
        return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
      }
      return;
    }

    const dbUser = req.dbUser;

    // 1. If no specific permission specified, ensure user has at least some admin role
    if (!permission) {
      if (isDbUserOwner(dbUser) || isDbUserManager(dbUser) || isDbUserAdmin(dbUser)) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: صلاحيات إدارية مطلوبة' });
    }

    // 2. Check using centralized permission resolution engine
    const hasPerm = checkUserHasPermission(dbUser, permission);
    if (!hasPerm) {
      return res.status(403).json({ error: `Forbidden: لا تملك الصلاحية المطلوبة (Missing required permission: ${permission})` });
    }

    next();
  };
};

/**
 * System Manager strict guard (System Manager or System Owner)
 */
export const requireManager = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.dbUser) {
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => {
        resolve();
      });
    });
    if (res.headersSent) return;
  }

  if (!req.user || !req.dbUser) {
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    return;
  }

  if (!req.dbUser.isActive) {
    if (!res.headersSent) {
      return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
    }
    return;
  }

  if (!isDbUserManager(req.dbUser)) {
    return res.status(403).json({ error: 'Forbidden: يتطلب رتبة مدير النظام أو مالك النظام' });
  }

  next();
};

/**
 * System Owner strict guard (System Owner only)
 */
export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.dbUser) {
    await new Promise<void>((resolve) => {
      requireAuth(req, res, () => {
        resolve();
      });
    });
    if (res.headersSent) return;
  }

  if (!req.user || !req.dbUser) {
    if (!res.headersSent) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
    return;
  }

  if (!req.dbUser.isActive) {
    if (!res.headersSent) {
      return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
    }
    return;
  }

  if (!isDbUserOwner(req.dbUser)) {
    return res.status(403).json({ error: 'Forbidden: هذه العملية مخصصة لمالك النظام (Super Admin privileges required)' });
  }

  next();
};

export const requireOwner = requireSuperAdmin;

/**
 * Optional authentication middleware:
 * Populates req.user and req.dbUser if valid Bearer token exists, but does not block guests.
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return next();
  }

  let decodedToken: { uid: string; email: string; name?: string; picture?: string } | null = null;

  if (token.startsWith('srv_')) {
    const payload = verifyServerSessionToken(token);
    if (payload) {
      decodedToken = {
        uid: payload.uid,
        email: payload.email,
        name: payload.name,
      };
    }
  } else {
    try {
      const fbDecoded = await adminAuth.verifyIdToken(token);
      if (fbDecoded && fbDecoded.uid) {
        decodedToken = {
          uid: fbDecoded.uid,
          email: fbDecoded.email || '',
          name: fbDecoded.name || (fbDecoded.email ? fbDecoded.email.split('@')[0] : 'مستخدم'),
          picture: fbDecoded.picture,
        };
      }
    } catch {
      decodedToken = null;
    }
  }

  if (decodedToken && decodedToken.uid) {
    req.user = decodedToken;
    try {
      await withDbRetry(async () => {
        let dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken!.uid));
        if (dbUsers.length === 0 && decodedToken!.email) {
          dbUsers = await db.select().from(users).where(eq(users.email, decodedToken!.email.toLowerCase().trim()));
        }
        if (dbUsers.length > 0 && dbUsers[0].isActive) {
          req.dbUser = dbUsers[0];
        }
      });
    } catch {
      // Ignore DB fetch failure in optional auth
    }
  }

  next();
};


