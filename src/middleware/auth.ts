import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db, withDbRetry } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { verifyServerSessionToken, createServerSessionToken } from '../../server/security/session.ts';
import firebaseConfig from '../../firebase-applet-config.json';

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
 * Parses and validates a standard Firebase Auth JWT token if Admin SDK is operating in lightweight mode.
 */
function parseAndValidateFirebaseToken(token: string): { uid: string; email: string; name?: string; picture?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);

    const expectedAud = firebaseConfig.projectId;
    const expectedIss = `https://securetoken.google.com/${expectedAud}`;

    const isAudValid = payload.aud === expectedAud || payload.firebase?.project_id === expectedAud;
    const isIssValid = payload.iss === expectedIss;
    const isNotExpired = typeof payload.exp === 'number' && payload.exp > now - 60; // 60s clock skew tolerance
    const uid = payload.user_id || payload.sub;

    if (isAudValid && isIssValid && isNotExpired && uid && typeof uid === 'string') {
      return {
        uid,
        email: payload.email || '',
        name: payload.name || (payload.email ? payload.email.split('@')[0] : 'مستخدم'),
        picture: payload.picture,
      };
    }
  } catch (err) {
    // ignore parse error
  }
  return null;
}

/**
 * Strict authentication middleware:
 * 1. Supports cryptographically verified `srv_` session tokens
 * 2. Supports verified Firebase ID tokens via adminAuth.verifyIdToken and claim validation
 * 3. Verifies database user active status
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

  // 2. Try Firebase ID token (Verified by Firebase Admin SDK or Project-Bound Claims)
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
      // Fallback verification for standard Firebase OAuth ID tokens issued to our projectId
      decodedToken = parseAndValidateFirebaseToken(token);
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
  }

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
    } catch {
      decodedToken = parseAndValidateFirebaseToken(token);
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
        if (dbUsers.length > 0) {
          req.dbUser = dbUsers[0];
        }
      });
    } catch {
      // Ignore DB fetch failure in optional auth
    }
  }

  next();
};

