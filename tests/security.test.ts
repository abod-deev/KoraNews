import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashPassword, verifyPassword } from '../server/security/passwords.ts';
import {
  createServerSessionToken,
  verifyServerSessionToken,
  revokeSession,
  revokeAllUserSessions,
  clearAllRevocations,
  isSessionRevoked,
} from '../server/security/session.ts';
import { escapeHtml, sanitizeContent, toSafeUser } from '../server/security/sanitizer.ts';
import { requireAuth, requirePermission, requireSuperAdmin } from '../src/middleware/auth.ts';

describe('Password Security (scrypt)', () => {
  it('should hash and verify passwords correctly using scrypt', async () => {
    const rawPassword = 'SecurePassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain('scrypt:');

    const result = await verifyPassword(rawPassword, hash);
    expect(result.isValid).toBe(true);
    expect(result.needsMigration).toBe(false);

    const wrongResult = await verifyPassword('WrongPassword', hash);
    expect(wrongResult.isValid).toBe(false);
  });

  it('should verify legacy plaintext passwords and flag for migration', async () => {
    const plain = 'LegacyPassword99';
    const result = await verifyPassword(plain, plain);

    expect(result.isValid).toBe(true);
    expect(result.needsMigration).toBe(true);
  });
});

describe('Session Lifecycle & Revocation Management (HMAC-SHA256)', () => {
  beforeEach(() => {
    clearAllRevocations();
  });

  it('should generate and verify valid cryptographic session tokens', () => {
    const payload = {
      uid: 'user_test_123',
      email: 'tester@koranews.com',
      name: 'مستخدم تجريبي',
    };

    const token = createServerSessionToken(payload);
    expect(typeof token).toBe('string');
    expect(token.startsWith('srv_')).toBe(true);

    const verified = verifyServerSessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.uid).toBe(payload.uid);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.name).toBe(payload.name);
    expect(typeof verified?.jti).toBe('string');
  });

  it('should reject tampered session tokens', () => {
    const token = createServerSessionToken({ uid: 'user_1', email: 'test@test.com' });
    const tampered = token.slice(0, -4) + 'abcd';

    const verified = verifyServerSessionToken(tampered);
    expect(verified).toBeNull();
  });

  it('should revoke a session by its specific jti (Logout)', () => {
    const token = createServerSessionToken({ uid: 'user_logout', email: 'logout@test.com' });
    const verified = verifyServerSessionToken(token);
    expect(verified).not.toBeNull();

    // Revoke the specific token
    revokeSession(verified!.jti);

    const checkAfter = verifyServerSessionToken(token);
    expect(checkAfter).toBeNull();
  });

  it('should invalidate all active user sessions by UID or Email (Deactivation / Account Deletion / Role Change)', () => {
    const token1 = createServerSessionToken({ uid: 'user_target_456', email: 'target@test.com' });
    const token2 = createServerSessionToken({ uid: 'user_other_789', email: 'other@test.com' });

    expect(verifyServerSessionToken(token1)).not.toBeNull();
    expect(verifyServerSessionToken(token2)).not.toBeNull();

    // Revoke all sessions for target user by UID
    revokeAllUserSessions('user_target_456');

    expect(verifyServerSessionToken(token1)).toBeNull();
    // Other user must remain unaffected
    expect(verifyServerSessionToken(token2)).not.toBeNull();
  });
});

describe('Sanitizer & Safe User DTO', () => {
  it('should escape HTML special characters to prevent XSS', () => {
    const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const escaped = escapeHtml(malicious);

    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&lt;img');
  });

  it('should sanitize markdown and remove javascript: links', () => {
    const content = 'Check this [link](javascript:alert(1)) and <script>bad()</script>';
    const sanitized = sanitizeContent(content);

    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('<script>');
  });

  it('should strip passwords and sensitive attributes in toSafeUser', () => {
    const dbUser = {
      id: 42,
      uid: 'uid_secret_123',
      email: 'admin@koranews.com',
      name: 'Admin User',
      password: 'plain_password_leak',
      passwordHash: 'scrypt:salt:hash',
      avatar: '/avatar.jpg',
      role: 'admin',
      isAdmin: true,
      isActive: true,
      permissions: ['news_add', 'news_edit'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const safe = toSafeUser(dbUser);

    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe.id).toBe(42);
    expect(safe.email).toBe('admin@koranews.com');
    expect(safe.role).toBe('admin');
  });
});

describe('Authentication & Authorization Guards', () => {
  function createMockResponse() {
    const res: any = {
      statusCode: 200,
      jsonData: null,
      headersSent: false,
    };
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.jsonData = data;
      res.headersSent = true;
      return res;
    };
    return res;
  }

  it('requireAuth should reject missing Authorization header with 401', async () => {
    const req: any = { headers: {} };
    const res = createMockResponse();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('requireAuth should reject invalid or forged Firebase tokens without fallback', async () => {
    const fakeFirebaseToken = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJmb3JnZWRfdXNlciIsImF1ZCI6ImtvcmFuZXdzIn0.';
    const req: any = { headers: { authorization: `Bearer ${fakeFirebaseToken}` } };
    const res = createMockResponse();
    let nextCalled = false;

    await requireAuth(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('requireSuperAdmin should reject non-superadmin users with 403', async () => {
    const req: any = {
      user: { uid: 'regular_admin_1', email: 'editor@koranews.com' },
      dbUser: { id: 10, role: 'admin', isAdmin: true, isActive: true, permissions: ['news_add'] },
    };
    const res = createMockResponse();
    let nextCalled = false;

    await requireSuperAdmin(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toContain('Super Admin privileges required');
  });

  it('requirePermission should allow users with matching permissions', async () => {
    const req: any = {
      user: { uid: 'editor_1', email: 'editor@koranews.com' },
      dbUser: { id: 11, role: 'admin', isAdmin: true, isActive: true, permissions: ['news_add', 'news_edit'] },
    };
    const res = createMockResponse();
    let nextCalled = false;

    const middleware = requirePermission('news_add');
    await middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it('requirePermission should block users missing the required permission with 403', async () => {
    const req: any = {
      user: { uid: 'editor_1', email: 'editor@koranews.com' },
      dbUser: { id: 11, role: 'admin', isAdmin: true, isActive: true, permissions: ['news_add'] },
    };
    const res = createMockResponse();
    let nextCalled = false;

    const middleware = requirePermission('admin_manage');
    await middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toContain('Missing required permission');
  });

  it('requireAuth should reject deactivated users with 403', async () => {
    const req: any = {
      user: { uid: 'deactivated_user', email: 'blocked@koranews.com' },
      dbUser: { id: 99, role: 'user', isActive: false },
    };
    const res = createMockResponse();

    // Direct check of deactivated status through requirePermission / requireSuperAdmin
    const middleware = requirePermission();
    let nextCalled = false;
    await middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.jsonData.error).toContain('الحساب معطل');
  });
});

