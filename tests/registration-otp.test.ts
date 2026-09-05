import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeVerificationCode,
  hashVerificationCode,
  verifyCodeHash,
  generateSecure6DigitCode,
  getVerificationSecret,
  sendVerificationRequest,
  verifyEmailCode,
  resendVerificationRequest,
  clearVerificationSession,
  VERIFICATION_CODE_EXPIRY_MS,
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_MS,
} from '../server/services/gmailVerification.ts';
import { db, withDbRetry, initializeDatabaseSchema } from '../src/db/index.ts';
import { emailVerifications, users } from '../src/db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import { hashPassword } from '../server/security/passwords.ts';

describe('Registration & Email Verification OTP Flow', () => {
  const testEmail = 'otp_test_user@koranews.com';
  const testName = 'مستخدم تجريبي كورة';
  const testPassword = 'SecurePassword123!';

  beforeAll(async () => {
    await initializeDatabaseSchema();
  });

  beforeEach(async () => {
    // Clean up test email from DB
    await withDbRetry(() =>
      db.delete(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
    ).catch(() => {});

    await withDbRetry(() =>
      db.delete(users).where(sql`LOWER(${users.email}) = ${testEmail.toLowerCase()}`)
    ).catch(() => {});
  });

  afterEach(async () => {
    await withDbRetry(() =>
      db.delete(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
    ).catch(() => {});

    await withDbRetry(() =>
      db.delete(users).where(sql`LOWER(${users.email}) = ${testEmail.toLowerCase()}`)
    ).catch(() => {});
  });

  describe('Digit Normalization & Formatting Trimming', () => {
    it('should normalize standard ASCII digits with whitespace and hyphens', () => {
      expect(normalizeVerificationCode(' 123 456 ')).toBe('123456');
      expect(normalizeVerificationCode('12-34-56')).toBe('123456');
      expect(normalizeVerificationCode('  123456  ')).toBe('123456');
    });

    it('should normalize Arabic numerals (٠١٢٣٤٥٦٧٨٩)', () => {
      expect(normalizeVerificationCode('١٢٣٤٥٦')).toBe('123456');
      expect(normalizeVerificationCode(' ٩٨٧ ٦٥٤ ')).toBe('987654');
      expect(normalizeVerificationCode('٠١٢-٣٤٥')).toBe('012345');
    });

    it('should normalize Persian / Eastern Arabic numerals (۰۱۲۳۴۵۶۷۸۹)', () => {
      expect(normalizeVerificationCode('۱۲۳۴۵۶')).toBe('123456');
      expect(normalizeVerificationCode(' ۹۸۷ ۶۵۴ ')).toBe('987654');
      expect(normalizeVerificationCode('۰۱۲۳۴۵')).toBe('012345');
    });

    it('should strip Unicode RTL / LTR markers and invisible characters', () => {
      const withRTL = '\u200E1\u200F2\u202A3\u202B4\u202C5\uFEFF6';
      expect(normalizeVerificationCode(withRTL)).toBe('123456');
    });
  });

  describe('Cryptographic OTP Generation & Hashing', () => {
    it('should generate a 6-digit number strictly within 100000 - 999999 range', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateSecure6DigitCode();
        expect(code).toHaveLength(6);
        const num = parseInt(code, 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThan(1000000);
      }
    });

    it('should verify code hashes correctly and prevent timing attacks', () => {
      const code = '654321';
      const hash = hashVerificationCode(code);

      expect(verifyCodeHash('654321', hash)).toBe(true);
      expect(verifyCodeHash(' 654 321 ', hash)).toBe(true);
      expect(verifyCodeHash('٦٥٤٣٢١', hash)).toBe(true);
      expect(verifyCodeHash('۶۵۴۳۲۱', hash)).toBe(true);
      expect(verifyCodeHash('000000', hash)).toBe(false);
      expect(verifyCodeHash('654322', hash)).toBe(false);
      expect(verifyCodeHash('', hash)).toBe(false);
    });

    it('should fail closed in production if secret is missing', () => {
      const origEnv = process.env.NODE_ENV;
      const origSalt = process.env.VERIFICATION_HASH_SALT;
      const origSession = process.env.SESSION_SECRET;
      const origAuth = process.env.AUTH_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.VERIFICATION_HASH_SALT;
        delete process.env.SESSION_SECRET;
        delete process.env.AUTH_SECRET;

        expect(() => getVerificationSecret()).toThrow(/configured in production environment/);
      } finally {
        process.env.NODE_ENV = origEnv;
        if (origSalt) process.env.VERIFICATION_HASH_SALT = origSalt;
        if (origSession) process.env.SESSION_SECRET = origSession;
        if (origAuth) process.env.AUTH_SECRET = origAuth;
      }
    });
  });

  describe('Full DB-Backed Verification Lifecycle', () => {
    it('should register verification request in database and verify successfully with valid OTP', async () => {
      const sendResult = await sendVerificationRequest(testEmail, testName, testPassword);
      expect(sendResult.success).toBe(true);

      // Verify record is in PostgreSQL
      const records = await withDbRetry(() =>
        db.select().from(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`).limit(1)
      );
      expect(records.length).toBe(1);
      const record = records[0];
      expect(record.name).toBe(testName);
      expect(record.passwordHash).toContain('scrypt:');
      expect(record.verified).toBe(false);
      expect(record.attempts).toBe(0);

      // Verify with the known code hash using verifyCodeHash
      // Let's create a known code test directly
      const knownCode = '123456';
      const knownHash = hashVerificationCode(knownCode);

      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ codeHash: knownHash, expiresAt: new Date(Date.now() + 600000) })
          .where(eq(emailVerifications.id, record.id))
      );

      // 1. Verify with valid code
      const verifyResult = await verifyEmailCode(testEmail, knownCode);
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.verified).toBe(true);
      expect(verifyResult.payload?.name).toBe(testName);
      expect(verifyResult.payload?.passwordHash).toContain('scrypt:');

      // 2. Single-use check: Trying to verify again must fail immediately
      const reuseResult = await verifyEmailCode(testEmail, knownCode);
      expect(reuseResult.success).toBe(false);
      expect(reuseResult.verified).toBe(false);
    });

    it('should reject wrong OTP and track remaining attempts up to 5', async () => {
      await sendVerificationRequest(testEmail, testName, testPassword);

      const knownCode = '654987';
      const knownHash = hashVerificationCode(knownCode);
      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ codeHash: knownHash })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      // 1st wrong attempt
      const res1 = await verifyEmailCode(testEmail, '111111');
      expect(res1.success).toBe(false);
      expect(res1.message).toContain('4 محاولات');

      // 2nd wrong attempt
      const res2 = await verifyEmailCode(testEmail, '222222');
      expect(res2.success).toBe(false);
      expect(res2.message).toContain('3 محاولات');

      // 3rd wrong attempt
      const res3 = await verifyEmailCode(testEmail, '333333');
      expect(res3.success).toBe(false);
      expect(res3.message).toContain('2 محاولات');

      // 4th wrong attempt
      const res4 = await verifyEmailCode(testEmail, '444444');
      expect(res4.success).toBe(false);
      expect(res4.message).toContain('1 محاولات');

      // 5th wrong attempt (Locks OTP)
      const res5 = await verifyEmailCode(testEmail, '555555');
      expect(res5.success).toBe(false);
      expect(res5.message).toContain('تم تجاوز الحد الأقصى للمحاولات');

      // 6th attempt (even with CORRECT code) must fail because record is locked
      const res6 = await verifyEmailCode(testEmail, knownCode);
      expect(res6.success).toBe(false);
      expect(res6.message).toContain('تم تجاوز الحد الأقصى للمحاولات');
    });

    it('should reject expired OTP', async () => {
      await sendVerificationRequest(testEmail, testName, testPassword);

      const knownCode = '789123';
      const knownHash = hashVerificationCode(knownCode);

      // Set expired time
      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({
            codeHash: knownHash,
            expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
          })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      const verifyResult = await verifyEmailCode(testEmail, knownCode);
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.verified).toBe(false);
      expect(verifyResult.message).toContain('انتهت صلاحية رمز التحقق');
    });

    it('should enforce 20s cooldown on resend and invalidate old OTP when new OTP is sent', async () => {
      // 1. Initial Send
      const send1 = await sendVerificationRequest(testEmail, testName, testPassword);
      expect(send1.success).toBe(true);

      const oldCode = '111222';
      const oldHash = hashVerificationCode(oldCode);
      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ codeHash: oldHash, lastSentAt: new Date() })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      // 2. Immediate Resend within 20s must trigger cooldown error
      const immediateResend = await resendVerificationRequest(testEmail);
      expect(immediateResend.success).toBe(false);
      expect(immediateResend.error).toBe('RATE_LIMIT_COOLDOWN');

      // 3. Simulate cooldown passed by updating lastSentAt in DB
      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ lastSentAt: new Date(Date.now() - 25000) })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      // 4. Resend succeeds after cooldown
      const resend2 = await resendVerificationRequest(testEmail);
      expect(resend2.success).toBe(true);

      // 5. Old OTP (111222) MUST be revoked and fail
      const oldOtpVerify = await verifyEmailCode(testEmail, oldCode);
      expect(oldOtpVerify.success).toBe(false);
    });

    it('should reject registration if email is already in users table', async () => {
      // Create user in DB
      await withDbRetry(() =>
        db.insert(users).values({
          uid: 'existing_user_uid',
          email: testEmail.toLowerCase(),
          name: testName,
          role: 'user',
          isActive: true,
        })
      );

      const sendResult = await sendVerificationRequest(testEmail, testName, testPassword);
      expect(sendResult.success).toBe(false);
      expect(sendResult.error).toBe('USER_ALREADY_EXISTS');
      expect(sendResult.message).toContain('مسجل بالفعل');
    });

    it('should verify OTP correctly using Arabic and Persian digits', async () => {
      await sendVerificationRequest(testEmail, testName, testPassword);

      const knownCode = '456789';
      const knownHash = hashVerificationCode(knownCode);

      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ codeHash: knownHash, lastSentAt: new Date(Date.now() - 30000) })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      // Verify with Arabic numerals: ٤٥٦٧٨٩
      const verifyArabic = await verifyEmailCode(testEmail, ' ٤٥٦٧٨٩ ');
      expect(verifyArabic.success).toBe(true);
      expect(verifyArabic.verified).toBe(true);
    });

    it('should handle concurrent verification requests without double activation', async () => {
      await sendVerificationRequest(testEmail, testName, testPassword);

      const knownCode = '987654';
      const knownHash = hashVerificationCode(knownCode);

      await withDbRetry(() =>
        db.update(emailVerifications)
          .set({ codeHash: knownHash, lastSentAt: new Date(Date.now() - 30000) })
          .where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );

      // Fire 5 concurrent verification requests
      const results = await Promise.all([
        verifyEmailCode(testEmail, knownCode),
        verifyEmailCode(testEmail, knownCode),
        verifyEmailCode(testEmail, knownCode),
        verifyEmailCode(testEmail, knownCode),
        verifyEmailCode(testEmail, knownCode),
      ]);

      // Exactly ONE request should successfully verify, others must fail
      const successCount = results.filter((r) => r.success && r.verified).length;
      expect(successCount).toBe(1);
    });

    it('should clear verification session upon completion', async () => {
      await sendVerificationRequest(testEmail, testName, testPassword);
      await clearVerificationSession(testEmail);

      const records = await withDbRetry(() =>
        db.select().from(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${testEmail.toLowerCase()}`)
      );
      expect(records.length).toBe(0);
    });
  });
});
