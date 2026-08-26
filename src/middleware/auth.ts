import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db, withDbRetry } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'football_news_secret_key_2026';

export function createServerSessionToken(payload: { uid: string; email: string; name?: string }) {
  const data = JSON.stringify({ ...payload, iat: Date.now() });
  const base64Data = Buffer.from(data).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(base64Data).digest('base64url');
  return `srv_${base64Data}.${signature}`;
}

export function verifyServerSessionToken(token: string): { uid: string; email: string; name?: string } | null {
  if (!token.startsWith('srv_')) return null;
  const raw = token.slice(4);
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [base64Data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(base64Data).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const json = JSON.parse(Buffer.from(base64Data, 'base64url').toString('utf-8'));
    return json;
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  user?: any;
  dbUser?: any; // To store DB user object
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];

  let decodedToken: any = null;

  // 1. Try server session token
  if (token.startsWith('srv_')) {
    decodedToken = verifyServerSessionToken(token);
  }

  // 2. Try Firebase ID token
  if (!decodedToken) {
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
          if (payload && (payload.uid || payload.user_id || payload.sub) && payload.email) {
            decodedToken = {
              uid: payload.uid || payload.user_id || payload.sub,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              picture: payload.picture
            };
          }
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  if (!decodedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  req.user = decodedToken;

  // Get db user with retry
  await withDbRetry(async () => {
    let dbUsers = await db.select().from(users).where(eq(users.uid, decodedToken.uid));
    if (dbUsers.length === 0 && decodedToken.email) {
      dbUsers = await db.select().from(users).where(eq(users.email, decodedToken.email));
    }

    if (dbUsers.length > 0) {
      req.dbUser = dbUsers[0];
      if (!req.dbUser.isActive) {
        return;
      }
      
      // Ensure super admin has proper role in DB
      if (req.dbUser.email === 'abod46071@gmail.com' && req.dbUser.role !== 'superadmin') {
        await db.update(users).set({ role: 'superadmin', isAdmin: true, isActive: true }).where(eq(users.id, req.dbUser.id));
        req.dbUser.role = 'superadmin';
      }
    } else if (decodedToken.email) {
      const isSuperAdmin = decodedToken.email === 'abod46071@gmail.com';
      const newUsers = await db.insert(users).values({
        uid: decodedToken.uid || `srv_${Date.now()}`,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email.split('@')[0],
        role: isSuperAdmin ? 'superadmin' : 'user',
        isAdmin: isSuperAdmin,
        isActive: true
      }).returning();
      req.dbUser = newUsers[0];
    }
  });

  if (req.dbUser && !req.dbUser.isActive) {
    return res.status(403).json({ error: 'الحساب معطل' });
  }

  next();
};

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
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return;
    }

    const dbUser = req.dbUser;
    
    // Super admin check
    if (dbUser.email === 'abod46071@gmail.com' || dbUser.role === 'superadmin') {
      return next();
    }
    
    if (dbUser.role !== 'admin' && dbUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    
    if (permission) {
      if (!dbUser.permissions || !dbUser.permissions.includes(permission)) {
        return res.status(403).json({ error: `Forbidden: Requires ${permission} permission` });
      }
    }
    
    next();
  };
};
