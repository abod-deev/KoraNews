import crypto from 'crypto';

// 14 days session duration in milliseconds
export const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

// Dynamic in-memory fallback secret generated on process start for local dev/testing only
let _devFallbackSecret: string | null = null;

// Track explicitly revoked token IDs (jti)
const _revokedJtis = new Set<string>();

// Track user-level session invalidation timestamps (e.g. after logout, account deletion, deactivation, role change)
// Key: uid or normalized email -> timestamp in ms (all tokens issued with iat <= this timestamp are invalidated)
const _userInvalidationTimestamps = new Map<string, number>();

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 16) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Security Alert] SESSION_SECRET environment variable is missing or shorter than 16 characters in production. Sessions cannot be initialized safely.'
    );
  }

  // Development/Testing fallback generated per process instance
  if (!_devFallbackSecret) {
    _devFallbackSecret = crypto.randomBytes(32).toString('hex');
  }
  return _devFallbackSecret;
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
 * Revokes a specific session by its unique token ID (jti).
 */
export function revokeSession(jti: string): void {
  if (jti && typeof jti === 'string') {
    _revokedJtis.add(jti);
  }
}

/**
 * Invalidates all active sessions for a specific user (by UID or email) issued up to current time.
 */
export function revokeAllUserSessions(userIdentifier: string): void {
  if (!userIdentifier || typeof userIdentifier !== 'string') return;
  const key = userIdentifier.trim().toLowerCase();
  _userInvalidationTimestamps.set(key, Date.now());
}

/**
 * Checks if a session payload has been revoked individually or at user level.
 */
export function isSessionRevoked(payload: SessionPayload): boolean {
  if (!payload || !payload.jti) return true;

  // 1. Check individual jti revocation
  if (_revokedJtis.has(payload.jti)) {
    return true;
  }

  // 2. Check user-level invalidation by UID
  if (payload.uid) {
    const invalidAfterByUid = _userInvalidationTimestamps.get(payload.uid.trim().toLowerCase());
    if (invalidAfterByUid && payload.iat <= invalidAfterByUid) {
      return true;
    }
  }

  // 3. Check user-level invalidation by Email
  if (payload.email) {
    const invalidAfterByEmail = _userInvalidationTimestamps.get(payload.email.trim().toLowerCase());
    if (invalidAfterByEmail && payload.iat <= invalidAfterByEmail) {
      return true;
    }
  }

  return false;
}

/**
 * Reset all revocation state (useful for test isolation).
 */
export function clearAllRevocations(): void {
  _revokedJtis.clear();
  _userInvalidationTimestamps.clear();
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
 * Verifies a server session token cryptographically:
 * 1. Checks HMAC signature with timing-safe comparison
 * 2. Checks expiration timestamp
 * 3. Checks revocation status (jti and user invalidation timestamps)
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

    if (!payload || !payload.uid || !payload.email || typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      return null;
    }

    // Check expiration timestamp
    if (Date.now() > payload.exp) {
      return null; // Expired session
    }

    // Check if session has been revoked
    if (isSessionRevoked(payload)) {
      return null; // Revoked session
    }

    return payload;
  } catch {
    return null;
  }
}

