/**
 * Independent Gmail SMTP Email Verification Service for KoraNews
 * 
 * STRICT SPECIFICATION:
 * - SMTP Client: Nodemailer
 * - SMTP Host: smtp.gmail.com
 * - SMTP Port: 465 (SSL / secure: true)
 * - Username: process.env.GMAIL_SMTP_USER
 * - Password: process.env.GMAIL_SMTP_APP_PASSWORD
 * - From: process.env.GMAIL_SMTP_USER
 * - To: The recipient email entered by the user
 * 
 * SECURITY & CONSTRAINTS:
 * - Single source of truth: PostgreSQL database (email_verifications table)
 * - 6-digit cryptographically secure code via `crypto.randomInt(100000, 1000000)`
 * - HMAC-SHA256 hashing with verification secret before persistence
 * - Fail-closed: Throws error in production if verification secret is missing
 * - Code validity: 10 minutes (600,000 ms)
 * - Max attempts: 5 (invalidated after 5 failed attempts)
 * - Rate limiting: 20 seconds cooldown before resend
 * - Single-use: Invalidated immediately upon successful verification
 * - Resend generates a fresh code and revokes previous code
 * - Zero Secrets/Codes in API responses, Frontend, or production logs
 * - Multi-language digit normalization (Arabic, Persian, Unicode)
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db, withDbRetry } from '../../src/db/index.ts';
import { emailVerifications, users } from '../../src/db/schema.ts';
import { eq, lt, sql } from 'drizzle-orm';
import { hashPassword } from '../security/passwords.ts';

export const VERIFICATION_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_VERIFICATION_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 20 * 1000; // 20 seconds cooldown

// Cached Nodemailer transporter
let cachedTransporter: nodemailer.Transporter | null = null;

// Periodic cleanup of expired entries in DB (every 30 minutes)
setInterval(() => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  withDbRetry(() => 
    db.delete(emailVerifications).where(lt(emailVerifications.expiresAt, cutoff))
  ).catch(() => {});
}, 30 * 60 * 1000);

/**
 * Retrieves the verification hashing secret.
 * In production, this fails closed (throws an error) if no secret is configured.
 */
export function getVerificationSecret(): string {
  const secret =
    process.env.VERIFICATION_HASH_SALT ||
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET;

  if (!secret || secret.trim().length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('VERIFICATION_HASH_SALT or SESSION_SECRET must be configured in production environment.');
    }
    return 'koranews_ephemeral_verification_secret_2026_secure';
  }

  return secret.trim();
}

/**
 * Creates or retrieves the singleton Nodemailer transporter configured for Gmail SMTP (Port 465 SSL).
 */
export function getGmailTransporter(): nodemailer.Transporter {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpUser = (process.env.GMAIL_SMTP_USER || '').trim();
  const smtpPass = (process.env.GMAIL_SMTP_APP_PASSWORD || '').trim().replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Gmail SMTP] Notice: GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD is not set. Emails cannot be sent without configuration.');
    }
  }

  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: true,
    },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  });

  return cachedTransporter;
}

/**
 * Verifies the Gmail SMTP connection without logging credentials.
 */
export async function verifyGmailSmtpConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getGmailTransporter();
    await transporter.verify();
    console.log('[Gmail SMTP] Transporter connection verified successfully.');
    return { success: true };
  } catch (error: any) {
    const safeError = error?.message || 'SMTP Connection Error';
    console.error('[Gmail SMTP Error] Connection verification failed:', safeError);
    return { success: false, error: safeError };
  }
}

/**
 * Normalizes verification code input by converting Arabic/Persian numerals to standard ASCII digits
 * and removing RTL markers, whitespace, hyphens, and invisible Unicode characters.
 */
export function normalizeVerificationCode(input: any): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let res = str.replace(/[\u200E\u200F\u202A-\u202E\uFEFF\s\-_]/g, '');
  for (let i = 0; i < 10; i++) {
    res = res.split(arabicDigits[i]).join(i.toString());
    res = res.split(persianDigits[i]).join(i.toString());
  }
  return res.replace(/\D/g, '');
}

/**
 * Computes HMAC-SHA256 hash of a verification code with server secret.
 */
export function hashVerificationCode(code: string): string {
  const normalized = normalizeVerificationCode(code);
  const secret = getVerificationSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(normalized)
    .digest('hex');
}

/**
 * Generates a cryptographically random 6-digit verification code using `crypto.randomInt(100000, 1000000)`.
 */
export function generateSecure6DigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Compares a candidate verification code with stored code hash using constant-time comparison.
 */
export function verifyCodeHash(candidateCode: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.trim()) return false;
  try {
    const candidateHash = hashVerificationCode(candidateCode);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generates an Arabic RTL HTML email template for KoraNews email verification.
 */
function generateVerificationHtml(code: string, userName?: string): string {
  const safeName = userName ? userName.replace(/[<>]/g, '') : 'عزيزي المستخدم';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تأكيد البريد الإلكتروني - KoraNews</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1320; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, Arial, sans-serif; direction: rtl; text-align: right;">
  <div style="display: none; font-size: 1px; color: #0b1320; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    رمز تأكيد حسابك في كورة نيوز هو: ${code} - صالح لمدة 10 دقائق فقط.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b1320; width: 100%; margin: 0; padding: 30px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 35px rgba(0, 0, 0, 0.35); border: 1px solid #1e293b; margin: 0 auto;">
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #059669 100%); padding: 40px 24px 34px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 50px; padding: 8px 20px; text-align: center;">
                    <span style="font-size: 15px; font-weight: 800; color: #34d399; letter-spacing: 0.5px;">
                      ⚽ KoraNews | كورة نيوز
                    </span>
                  </td>
                </tr>
              </table>
              <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 900; color: #ffffff; line-height: 1.3;">
                تأكيد البريد الإلكتروني
              </h1>
              <p style="margin: 0; font-size: 14px; color: #a7f3d0; font-weight: 500;">
                بوابتك الأولى لمتابعة أحدث أخبار ومباريات كرة القدم
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 28px; background-color: #ffffff; text-align: right; direction: rtl;">
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 14px;">
                مرحباً ${safeName}، 👋
              </div>
              <p style="font-size: 15px; line-height: 1.8; color: #475569; margin: 0 0 24px;">
                شكراً لانضمامك إلى مجتمع <strong>كورة نيوز (KoraNews)</strong>. لإتمام تفعيل حسابك وضمان أمان بياناتك، يُرجى استخدام رمز التحقق التالي:
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0; background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #059669; border-radius: 16px; text-align: center;">
                <tr>
                  <td style="padding: 26px 18px; text-align: center;">
                    <div style="font-size: 13px; font-weight: 800; color: #065f46; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase;">
                      رمز التحقق الخاص بك (OTP)
                    </div>
                    <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; color: #022c22; letter-spacing: 12px; margin: 0 0 14px; line-height: 1; direction: ltr; display: inline-block;">
                      ${code}
                    </div>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #065f46; border-radius: 20px; padding: 6px 14px; text-align: center;">
                          <span style="font-size: 12px; font-weight: 700; color: #ffffff;">
                            ⏱️ صالح لمدة 10 دقائق فقط
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-right: 4px solid #059669; border-radius: 10px; margin: 24px 0 12px; text-align: right;">
                <tr>
                  <td style="padding: 16px 18px; text-align: right; direction: rtl;">
                    <p style="margin: 0 0 8px; font-size: 13px; color: #334155; line-height: 1.6;">
                      🔒 <strong>حماية الحساب:</strong> لا تشارك هذا الرمز مع أي شخص، فريق كورة نيوز لن يطلب منك هذا الرمز أبداً.
                    </p>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #334155; line-height: 1.6;">
                      ⏳ <strong>صلاحية محدودة:</strong> ينتهي الرمز تلقائياً بعد 10 دقائق أو بمجرد إتمام التحقق.
                    </p>
                    <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; line-height: 1.6;">
                      ℹ️ <strong>تنبيه:</strong> إذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0f172a; padding: 26px 24px; text-align: center; border-top: 1px solid #1e293b;">
              <div style="font-size: 14px; font-weight: 800; color: #34d399; margin-bottom: 6px;">
                ⚽ KoraNews
              </div>
              <div style="font-size: 11px; color: #64748b; padding-top: 6px;">
                © ${new Date().getFullYear()} KoraNews. جميع الحقوق محفوظة.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Sends a verification email with a 6-digit code using Gmail SMTP (smtp.gmail.com:465).
 */
export async function sendGmailVerificationCode(
  toEmail: string,
  code: string,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = (process.env.GMAIL_SMTP_USER || '').trim().toLowerCase();
  const cleanEmail = toEmail.trim().toLowerCase();
  const safeName = userName?.trim() || cleanEmail.split('@')[0];

  if (!fromEmail || !process.env.GMAIL_SMTP_APP_PASSWORD) {
    const msg = 'GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD not configured in environment variables.';
    return { success: false, error: msg };
  }

  try {
    const transporter = getGmailTransporter();
    const htmlContent = generateVerificationHtml(code, safeName);
    const textContent = `KoraNews\n\nتأكيد البريد الإلكتروني\n\nمرحباً ${safeName}،\n\nرمز التحقق الخاص بك في موقع KoraNews هو: ${code}\n\nهذا الرمز صالح لمدة 10 دقائق.\nلا تشارك هذا الرمز مع أي شخص.`;

    const mailOptions = {
      from: `"KoraNews" <${fromEmail}>`,
      to: cleanEmail,
      subject: 'تأكيد البريد الإلكتروني - KoraNews',
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    const safeError = error?.message || 'SMTP Dispatch Failed';
    console.error(`[Gmail SMTP Error] Failed to send email to ${cleanEmail}:`, safeError);
    return {
      success: false,
      error: safeError,
    };
  }
}

/**
 * Generates a fresh 6-digit code, hashes it, reliably persists it in PostgreSQL, and dispatches via Gmail SMTP.
 */
export async function sendVerificationRequest(
  rawEmail: string,
  userName?: string,
  plainPassword?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const email = (rawEmail || '').trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return {
      success: false,
      message: 'يرجى إدخال بريد إلكتروني صحيح',
      error: 'INVALID_EMAIL',
    };
  }

  // 1. Check if user is already registered in users table
  const existingUser = await withDbRetry(() =>
    db.select({ id: users.id }).from(users).where(sql`LOWER(${users.email}) = ${email}`).limit(1)
  );

  if (existingUser.length > 0) {
    return {
      success: false,
      message: 'هذا البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول',
      error: 'USER_ALREADY_EXISTS',
    };
  }

  // 2. Check existing pending verification in DB
  const existingVerifications = await withDbRetry(() =>
    db.select().from(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${email}`).limit(1)
  );
  const existing = existingVerifications[0];
  const now = new Date();

  // 3. Cooldown check (20 seconds)
  if (existing && existing.lastSentAt) {
    const timeSinceLastSend = now.getTime() - new Date(existing.lastSentAt).getTime();
    if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
      return {
        success: false,
        message: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز تحقق جديد`,
        error: 'RATE_LIMIT_COOLDOWN',
      };
    }
  }

  // 4. Hash password if provided
  let passwordHash = existing?.passwordHash || null;
  if (plainPassword) {
    passwordHash = await hashPassword(plainPassword);
  }

  // 5. Generate secure 6-digit code and HMAC hash
  const code = generateSecure6DigitCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(now.getTime() + VERIFICATION_CODE_EXPIRY_MS);
  const candidateName = userName?.trim() || existing?.name || email.split('@')[0];

  // 6. Atomically persist/upsert into PostgreSQL database as the single source of truth
  if (existing) {
    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({
          name: candidateName,
          passwordHash: passwordHash || existing.passwordHash,
          codeHash,
          expiresAt,
          attempts: 0,
          lastSentAt: now,
          verified: false,
        })
        .where(eq(emailVerifications.id, existing.id))
    );
  } else {
    await withDbRetry(() =>
      db.insert(emailVerifications).values({
        email,
        name: candidateName,
        passwordHash,
        codeHash,
        expiresAt,
        attempts: 0,
        lastSentAt: now,
        verified: false,
      })
    );
  }

  // 7. Dispatch email via Gmail SMTP
  const emailResult = await sendGmailVerificationCode(
    email,
    code,
    candidateName
  );

  return {
    success: true,
    message: emailResult.success
      ? 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح'
      : 'تم إنشاء رمز التحقق بنجاح. (يرجى التحقق من إعدادات SMTP في حال عدم وصول الرسالة).',
  };
}

/**
 * Validates a user-entered 6-digit verification code strictly against the database record.
 */
export async function verifyEmailCode(
  rawEmail: string,
  rawCode: string
): Promise<{ success: boolean; verified: boolean; message: string; payload?: { name?: string | null; passwordHash?: string | null } }> {
  const email = (rawEmail || '').trim().toLowerCase();
  const code = normalizeVerificationCode(rawCode);

  if (!email || !code || code.length !== 6) {
    return {
      success: false,
      verified: false,
      message: 'رمز التحقق غير صحيح، يرجى إدخال 6 أرقام',
    };
  }

  // 1. Fetch verification record from PostgreSQL
  const existingRecords = await withDbRetry(() =>
    db.select().from(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${email}`).limit(1)
  );
  const record = existingRecords[0];

  if (!record || record.verified) {
    return {
      success: false,
      verified: false,
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد',
    };
  }

  // 2. Max attempts check (5 attempts)
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    return {
      success: false,
      verified: false,
      message: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). يرجى طلب رمز جديد',
    };
  }

  if (!record.codeHash) {
    return {
      success: false,
      verified: false,
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد',
    };
  }

  // 3. Expiration check (10 minutes)
  const now = new Date();
  if (now > new Date(record.expiresAt)) {
    // Delete expired record
    await withDbRetry(() => db.delete(emailVerifications).where(eq(emailVerifications.id, record.id))).catch(() => {});
    return {
      success: false,
      verified: false,
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد',
    };
  }

  // 4. Constant-time code verification
  const isValid = verifyCodeHash(code, record.codeHash);

  if (!isValid) {
    const newAttempts = record.attempts + 1;
    if (newAttempts >= MAX_VERIFICATION_ATTEMPTS) {
      await withDbRetry(() =>
        db
          .update(emailVerifications)
          .set({ attempts: newAttempts })
          .where(eq(emailVerifications.id, record.id))
      );
      return {
        success: false,
        verified: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). يرجى طلب رمز جديد',
      };
    }

    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({ attempts: newAttempts })
        .where(eq(emailVerifications.id, record.id))
    );

    const remaining = MAX_VERIFICATION_ATTEMPTS - newAttempts;
    return {
      success: false,
      verified: false,
      message: `رمز التحقق غير صحيح. المتبقي ${remaining} محاولات.`,
    };
  }

  // 5. Success: Single-use invalidation immediately in DB
  const payload = {
    name: record.name,
    passwordHash: record.passwordHash,
  };

  await withDbRetry(() =>
    db
      .update(emailVerifications)
      .set({ verified: true, codeHash: '' })
      .where(eq(emailVerifications.id, record.id))
  );

  return {
    success: true,
    verified: true,
    message: 'تم التحقق من البريد الإلكتروني بنجاح',
    payload,
  };
}

/**
 * Resends a new verification code for the email (revoking the old one).
 */
export async function resendVerificationRequest(
  rawEmail: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const email = (rawEmail || '').trim().toLowerCase();
  const existingRecords = await withDbRetry(() =>
    db.select().from(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${email}`).limit(1)
  );
  const existing = existingRecords[0];

  return sendVerificationRequest(email, existing?.name || undefined);
}

/**
 * Clears verification session after registration is completed.
 */
export async function clearVerificationSession(rawEmail: string): Promise<void> {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) return;
  await withDbRetry(() =>
    db.delete(emailVerifications).where(sql`LOWER(${emailVerifications.email}) = ${email}`)
  ).catch(() => {});
}

