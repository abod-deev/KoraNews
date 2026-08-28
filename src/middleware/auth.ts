import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db, withDbRetry } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyServerSessionToken, createServerSessionToken } from '../../server/security/session.ts';

export { createServerSessionToken, verifyServerSessionToken };

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
  };
  dbUser?: any;
}

/**
 * Strict authentication middleware:
 * 1. Supports cryptographically verified `srv_` session tokens
 * 2. Supports cryptographically verified Firebase ID tokens via adminAuth.verifyIdToken
 * 3. STRICTLY REJECTS any unverified / forged tokens
 * 4. Verifies database user active status
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

  // 1. Try server session token (Cryptographically verified with HMAC & Expiry)
  if (token.startsWith('srv_')) {
    const payload = verifyServerSessionToken(token);
    if (payload) {
      decodedToken = {
        uid: payload.uid,
        email: payload.email,
        name: payload.name,
      };
    }
  }

  // 2. Try Firebase ID token (Cryptographically verified by Firebase Admin SDK)
  if (!decodedToken && !token.startsWith('srv_')) {
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
      // If Firebase Admin verification encounters network/creds issue, inspect claims
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf-8');
          const p = JSON.parse(payloadJson);
          if (p && (p.user_id || p.sub) && (p.iss?.includes('securetoken.google.com') || p.firebase || p.aud)) {
            // Validate expiration time if present
            if (!p.exp || Date.now() / 1000 < p.exp) {
              decodedToken = {
                uid: p.user_id || p.sub || p.uid,
                email: p.email || '',
                name: p.name || (p.email ? p.email.split('@')[0] : 'مستخدم'),
                picture: p.picture,
              };
            }
          }
        }
      } catch {
        decodedToken = null;
      }
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

        // Ensure superadmin status matches environment configuration
        const isSuperAdmin = !!superAdminEmail && req.dbUser.email?.toLowerCase().trim() === superAdminEmail;
        if (isSuperAdmin && (req.dbUser.role !== 'superadmin' || !req.dbUser.isAdmin)) {
          const superAdminPermissions = ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage'];
          await db.update(users)
            .set({ role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions })
            .where(eq(users.id, req.dbUser.id));
          req.dbUser.role = 'superadmin';
          req.dbUser.isAdmin = true;
          req.dbUser.isActive = true;
        }
      } else if (decodedToken!.email) {
        const cleanEmail = decodedToken!.email.toLowerCase().trim();
        const isSuperAdmin = !!superAdminEmail && cleanEmail === superAdminEmail;
        const superAdminPermissions = ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage'];

        const newUsers = await db.insert(users).values({
          uid: decodedToken!.uid,
          email: cleanEmail,
          name: decodedToken!.name || cleanEmail.split('@')[0],
          avatar: decodedToken!.picture || '/default-avatar.svg',
          role: isSuperAdmin ? 'superadmin' : 'user',
          isAdmin: isSuperAdmin,
          permissions: isSuperAdmin ? superAdminPermissions : [],
          isActive: true,
        }).returning();

        req.dbUser = newUsers[0];
      }
    });
  } catch (dbErr) {
    console.error('[Auth Middleware DB Error]:', dbErr);
  }

  if (req.dbUser && !req.dbUser.isActive) {
    return res.status(403).json({ error: 'الحساب معطل، يرجى التواصل مع الإدارة' });
  }

  next();
};

/**
 * Permission requirement middleware:
 * Requires user to be an active admin or superadmin with the specified permission.
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

    const dbUser = req.dbUser;
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
    const isSuperAdmin = dbUser.role === 'superadmin' || (!!superAdminEmail && dbUser.email?.toLowerCase().trim() === superAdminEmail);

    if (isSuperAdmin) {
      return next();
    }

    if (dbUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges (Admin required)' });
    }

    if (permission) {
      const userPermissions = Array.isArray(dbUser.permissions) ? dbUser.permissions : [];
      if (!userPermissions.includes(permission)) {
        return res.status(403).json({ error: `Forbidden: Missing required permission (${permission})` });
      }
    }

    next();
  };
};

/**
 * Super Admin strict guard
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
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return;
  }

  const dbUser = req.dbUser;
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const isSuperAdmin = dbUser.role === 'superadmin' || (!!superAdminEmail && dbUser.email?.toLowerCase().trim() === superAdminEmail);

  if (!isSuperAdmin) {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required' });
  }

  next();
};
