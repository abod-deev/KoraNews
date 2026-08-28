import crypto from 'crypto';

// 14 days session duration in milliseconds
export const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// Deterministic stable fallback secret if none provided in env (ensures restarts don't invalidate tokens)
const STABLE_FALLBACK_SECRET = 'koranews-secure-session-auth-token-secret-fallback-key-2026-sha256';

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }
  return STABLE_FALLBACK_SECRET;
}

export interface SessionPayload {
  uid: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Creates a cryptographically signed, expiration-backed server session token.
 */
export function createServerSessionToken(user: { uid: string; email: string; name?: string }): string {
  const secret = getSessionSecret();
  const now = Date.now();
  const payload: SessionPayload = {
    uid: user.uid,
    email: user.email.toLowerCase().trim(),
    name: user.name,
    iat: now,
    exp: now + SESSION_DURATION_MS,
    jti: crypto.randomBytes(16).toString('hex'),
  };

  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr, 'utf-8').toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(base64Data).digest('base64url');

  return `srv_${base64Data}.${signature}`;
}

/**
 * Verifies a server session token cryptographically, checking HMAC signature and expiration timestamp.
 */
export function verifyServerSessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.startsWith('srv_')) {
    return null;
  }

  const raw = token.slice(4);
  const parts = raw.split('.');
  if (parts.length !== 2) {
    return null;
  }

  const [base64Data, signature] = parts;
  const secret = getSessionSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(base64Data).digest('base64url');

  const sigBuf = Buffer.from(signature, 'utf-8');
  const expBuf = Buffer.from(expectedSignature, 'utf-8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null; // Tampered or invalid signature
  }

  try {
    const payloadStr = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload: SessionPayload = JSON.parse(payloadStr);

    if (!payload || !payload.uid || !payload.email || typeof payload.exp !== 'number') {
      return null;
    }

    // Check expiration timestamp
    if (Date.now() > payload.exp) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}
