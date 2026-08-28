import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../server/security/passwords.ts';
import { createServerSessionToken, verifyServerSessionToken } from '../server/security/session.ts';
import { escapeHtml, sanitizeContent, toSafeUser } from '../server/security/sanitizer.ts';

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

describe('Session Management (HMAC-SHA256)', () => {
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
  });

  it('should reject tampered session tokens', () => {
    const token = createServerSessionToken({ uid: 'user_1', email: 'test@test.com' });
    const tampered = token.slice(0, -4) + 'abcd';

    const verified = verifyServerSessionToken(tampered);
    expect(verified).toBeNull();
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
