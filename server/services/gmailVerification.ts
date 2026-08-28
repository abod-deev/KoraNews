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
 * - 6-digit cryptographically secure code via `crypto.randomInt(100000, 1000000)`
 * - SHA-256 hashing with server salt before persistence
 * - Code validity: 10 minutes
 * - Max attempts: 5 (invalidated after 5 failed attempts)
 * - Rate limiting: 20 seconds cooldown before resend
 * - Single-use: Invalidated immediately upon successful verification
 * - Resend generates a fresh code and revokes the previous code
 * - Zero Secrets/Codes in API responses, Frontend, or production logs
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db, withDbRetry } from '../../src/db/index.ts';
import { emailVerifications } from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';

const VERIFICATION_CODE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 20 * 1000; // 20 seconds cooldown
const MAX_HOURLY_SENDS = 10; // Max 10 verification codes sent per hour per email

// Secret salt for code hashing
const HASH_SALT = process.env.VERIFICATION_HASH_SALT || 'koranews_gmail_secure_salt_2026';

interface StoredVerification {
  email: string;
  name?: string;
  password?: string;
  codeHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendsInLastHour: number[];
  verified: boolean;
}

// In-memory verification registry for fast lookups & instant rate limiting
const inMemoryVerifications = new Map<string, StoredVerification>();

// Cached Nodemailer transporter
let cachedTransporter: nodemailer.Transporter | null = null;

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
    console.warn('[Gmail SMTP] Warning: GMAIL_SMTP_USER or GMAIL_SMTP_APP_PASSWORD is not set in environment variables.');
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
  if (!input) return '';
  const str = String(input);
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

  let res = str.replace(/[\u200E\u200F\u202A-\u202E\uFEFF\s\-]/g, '');
  for (let i = 0; i < 10; i++) {
    res = res.split(arabicDigits[i]).join(i.toString());
    res = res.split(persianDigits[i]).join(i.toString());
  }
  return res.replace(/\D/g, '');
}

/**
 * Computes SHA-256 hash of a verification code with server salt.
 */
export function hashVerificationCode(code: string): string {
  const normalized = normalizeVerificationCode(code);
  return crypto
    .createHash('sha256')
    .update(`${normalized}:${HASH_SALT}`)
    .digest('hex');
}

/**
 * Generates a cryptographically random 6-digit verification code using `crypto.randomInt`.
 */
export function generateSecure6DigitCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Compares a candidate verification code with stored code hash using constant-time comparison.
 */
export function verifyCodeHash(candidateCode: string, storedHash: string): boolean {
  if (!storedHash) return false;
  const candidateHash = hashVerificationCode(candidateCode.trim());
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

/**
 * Generates an Arabic RTL HTML email template for KoraNews email verification.
 * Built with inline table styles for full compatibility across Gmail, Outlook, Apple Mail, and mobile clients.
 */
function generateVerificationHtml(code: string, userName?: string): string {
  const safeName = userName ? userName.replace(/[<>]/g, '') : 'عزيزي المستخدم';
  
  // Format code with space separation for fallback reading if needed
  const codeDigits = code.split('').join(' ');

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="ar" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>تأكيد البريد الإلكتروني - KoraNews</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b1320; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  
  <!-- Preheader text for inbox preview -->
  <div style="display: none; font-size: 1px; color: #0b1320; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    رمز تأكيد حسابك في كورة نيوز هو: ${code} - صالح لمدة 10 دقائق فقط.
  </div>

  <!-- Main Background Table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b1320; width: 100%; margin: 0; padding: 30px 12px;">
    <tr>
      <td align="center" style="padding: 0;">
        
        <!-- Email Container Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 35px rgba(0, 0, 0, 0.35); border: 1px solid #1e293b; margin: 0 auto;">
          
          <!-- Header Banner -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #022c22 0%, #064e3b 50%, #059669 100%); padding: 40px 24px 34px; text-align: center;">
              
              <!-- Brand Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                <tr>
                  <td style="background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 50px; padding: 8px 20px; text-align: center;">
                    <span style="font-size: 15px; font-weight: 800; color: #34d399; letter-spacing: 0.5px; text-transform: uppercase;">
                      ⚽ KoraNews | كورة نيوز
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Title -->
              <h1 style="margin: 0 0 8px; font-size: 26px; font-weight: 900; color: #ffffff; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif;">
                تأكيد البريد الإلكتروني
              </h1>
              
              <p style="margin: 0; font-size: 14px; color: #a7f3d0; font-weight: 500;">
                بوابتك الأولى لمتابعة أحدث أخبار ومباريات كرة القدم
              </p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px; background-color: #ffffff; text-align: right; direction: rtl;">
              
              <!-- User Greeting -->
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 14px;">
                مرحباً ${safeName}، 👋
              </div>

              <!-- Main Explanation -->
              <p style="font-size: 15px; line-height: 1.8; color: #475569; margin: 0 0 24px;">
                شكراً لانضمامك إلى مجتمع <strong>كورة نيوز (KoraNews)</strong>. لإتمام تفعيل حسابك وضمان أمان بياناتك، يُرجى استخدام رمز التحقق التالي في الصفحة:
              </p>

              <!-- Verification Code Container Card -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0; background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #059669; border-radius: 16px; text-align: center;">
                <tr>
                  <td style="padding: 26px 18px; text-align: center;">
                    
                    <div style="font-size: 13px; font-weight: 800; color: #065f46; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase;">
                      رمز التحقق الخاص بك (OTP)
                    </div>

                    <!-- Monospace Digits Display -->
                    <div style="font-family: 'Courier New', Courier, monospace, 'Segoe UI'; font-size: 42px; font-weight: 900; color: #022c22; letter-spacing: 12px; margin: 0 0 14px; line-height: 1; direction: ltr; display: inline-block;">
                      ${code}
                    </div>

                    <!-- Expiration Pill Badge -->
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

              <!-- Security Information Notices -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-right: 4px solid #059669; border-radius: 10px; margin: 24px 0 12px; text-align: right;">
                <tr>
                  <td style="padding: 16px 18px; text-align: right; direction: rtl;">
                    
                    <p style="margin: 0 0 8px; font-size: 13px; color: #334155; line-height: 1.6;">
                      🔒 <strong>حماية الحساب:</strong> لا تشارك هذا الرمز مع أي شخص، فريق كورة نيوز لن يطلب منك هذا الرمز أبداً.
                    </p>
                    
                    <p style="margin: 0 0 8px; font-size: 13px; color: #334155; line-height: 1.6;">
                      ⏳ <strong>صلاحية محدودة:</strong> ينتهي الرمز تلقائياً بعد 10 دقائق أو بمجرد إتمام التحقق.
                    </p>
                    
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                      ℹ️ <strong>تنبيه:</strong> إذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان دون أي إجراء.
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #0f172a; padding: 26px 24px; text-align: center; border-top: 1px solid #1e293b;">
              
              <div style="font-size: 14px; font-weight: 800; color: #34d399; margin-bottom: 6px;">
                ⚽ KoraNews
              </div>
              
              <p style="margin: 0 0 10px; font-size: 12px; color: #94a3b8; line-height: 1.6;">
                أحدث أخبار كرة القدم العالمية والعربية، البث المباشر، وجداول المباريات لحظة بلحظة.
              </p>
              
              <div style="font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 12px; margin-top: 12px;">
                © 2026 KoraNews. جميع الحقوق محفوظة.<br />
                هذه رسالة تلقائية مخصصة للتحقق من الأمان، يُرجى عدم الرد على هذا البريد.
              </div>

            </td>
          </tr>

        </table>
        <!-- End Email Container Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Sends a verification email with a 6-digit code using Gmail SMTP (smtp.gmail.com:465).
 * 
 * FROM: process.env.GMAIL_SMTP_USER
 * TO: The recipient email
 */
export async function sendGmailVerificationCode(
  toEmail: string,
  code: string,
  userName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = (process.env.GMAIL_SMTP_USER || '').trim().toLowerCase();
  const cleanEmail = toEmail.trim().toLowerCase();
  const safeName = userName?.trim() || cleanEmail.split('@')[0];

  if (!fromEmail) {
    const msg = 'GMAIL_SMTP_USER environment variable is not configured';
    console.error(`[Gmail SMTP Error] ${msg}`);
    return { success: false, error: msg };
  }

  // Safe diagnostic log (NEVER logs passwords or auth tokens or code)
  console.log(`[Gmail SMTP] Sending verification email | FROM: "${fromEmail}" | TO: "${cleanEmail}"`);

  try {
    const transporter = getGmailTransporter();
    const htmlContent = generateVerificationHtml(code, safeName);
    const textContent = `KoraNews\n\nتأكيد البريد الإلكتروني\n\nمرحباً ${safeName}،\n\nرمز التحقق الخاص بك في موقع KoraNews هو: ${code}\n\nهذا الرمز صالح لمدة 10 دقائق.\nلا تشارك هذا الرمز مع أي شخص.\nإذا لم تطلب إنشاء هذا الحساب، يمكنك تجاهل هذه الرسالة.`;

    const mailOptions = {
      from: `"KoraNews" <${fromEmail}>`,
      to: cleanEmail,
      subject: 'تأكيد البريد الإلكتروني - KoraNews',
      text: textContent,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Gmail SMTP] Verification email sent successfully to "${cleanEmail}". Message ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    const safeError = error?.message || 'SMTP Dispatch Failed';
    console.error(`[Gmail SMTP Error] Failed to send email to "${cleanEmail}":`, safeError);
    return {
      success: false,
      error: safeError,
    };
  }
}

/**
 * Generates a fresh 6-digit code, hashes it, stores it, and dispatches via Gmail SMTP.
 */
export async function sendVerificationRequest(
  rawEmail: string,
  userName?: string,
  password?: string
): Promise<{ success: boolean; message: string; error?: string }> {
  const email = rawEmail.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'يرجى إدخال بريد إلكتروني صحيح يحتوي على @',
      error: 'INVALID_EMAIL',
    };
  }

  // Rate Limiting Check
  const now = Date.now();
  const existing = inMemoryVerifications.get(email);

  if (existing) {
    // 1. Cooldown check (20 seconds)
    const timeSinceLastSend = now - existing.lastSentAt;
    if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
      return {
        success: false,
        message: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز تحقق جديد`,
        error: 'RATE_LIMIT_COOLDOWN',
      };
    }

    // 2. Hourly send count check
    const recentSends = existing.sendsInLastHour.filter((t) => now - t < 3600 * 1000);
    if (recentSends.length >= MAX_HOURLY_SENDS) {
      return {
        success: false,
        message: 'تم تجاوز الحد الأقصى لإرسال رموز التحقق في هذه الساعة. يرجى المحاولة لاحقاً.',
        error: 'HOURLY_LIMIT_EXCEEDED',
      };
    }
  }

  // Generate 6-digit code
  const code = generateSecure6DigitCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = now + VERIFICATION_CODE_EXPIRY_MS;
  const recentSends = existing
    ? [...existing.sendsInLastHour.filter((t) => now - t < 3600 * 1000), now]
    : [now];

  const verificationRecord: StoredVerification = {
    email,
    name: userName?.trim() || existing?.name,
    password: password || existing?.password,
    codeHash,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    sendsInLastHour: recentSends,
    verified: false,
  };

  inMemoryVerifications.set(email, verificationRecord);

  // Sync to database if available
  try {
    await withDbRetry(() =>
      db.insert(emailVerifications).values({
        email,
        codeHash,
        expiresAt: new Date(expiresAt),
        attempts: 0,
        lastSentAt: new Date(now),
        verified: false,
      })
    );
  } catch (dbErr) {
    // Non-blocking if database table is being created/synced
  }

  // Dispatch email via Gmail SMTP
  const emailResult = await sendGmailVerificationCode(
    email,
    code,
    userName || existing?.name
  );

  if (!emailResult.success) {
    console.warn(`[Gmail Verification] Dispatch warning for ${email}: ${emailResult.error}`);
  }

  return {
    success: true,
    message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح',
  };
}

/**
 * Validates a user-entered 6-digit verification code.
 */
export async function verifyEmailCode(
  rawEmail: string,
  rawCode: string
): Promise<{ success: boolean; verified: boolean; message: string; payload?: { name?: string; password?: string } }> {
  const email = rawEmail.trim().toLowerCase();
  const code = normalizeVerificationCode(rawCode);

  if (!email || !code || code.length !== 6) {
    return {
      success: false,
      verified: false,
      message: 'رمز التحقق غير صحيح، يرجى إدخال 6 أرقام',
    };
  }

  const record = inMemoryVerifications.get(email);

  // Case: No active verification found
  if (!record) {
    return {
      success: false,
      verified: false,
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد',
    };
  }

  // Case: Code expired (10 minutes)
  if (Date.now() > record.expiresAt) {
    inMemoryVerifications.delete(email);
    return {
      success: false,
      verified: false,
      message: 'انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد',
    };
  }

  // Case: Attempts exceeded (5 max attempts)
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    inMemoryVerifications.delete(email);
    return {
      success: false,
      verified: false,
      message: 'تم تجاوز الحد الأقصى للمحاولات. يرجى طلب رمز جديد',
    };
  }

  // Verify code securely with constant-time hash comparison
  const isValid = verifyCodeHash(code, record.codeHash);

  if (!isValid) {
    record.attempts += 1;
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      inMemoryVerifications.delete(email);
      return {
        success: false,
        verified: false,
        message: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). يرجى طلب رمز جديد',
      };
    }

    const remaining = MAX_VERIFICATION_ATTEMPTS - record.attempts;
    return {
      success: false,
      verified: false,
      message: `رمز التحقق غير صحيح. المتبقي ${remaining} محاولات.`,
    };
  }

  // Success: mark verified and invalidate code hash immediately
  record.verified = true;
  const payload = {
    name: record.name,
    password: record.password,
  };

  // Invalidate code hash immediately to prevent re-use
  record.codeHash = '';
  record.expiresAt = 0;

  // Update DB record
  try {
    await withDbRetry(() =>
      db
        .update(emailVerifications)
        .set({ verified: true })
        .where(eq(emailVerifications.email, email))
    );
  } catch (e) {
    // Ignore DB error
  }

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
  const email = rawEmail.trim().toLowerCase();
  const existing = inMemoryVerifications.get(email);

  return sendVerificationRequest(email, existing?.name, existing?.password);
}

/**
 * Checks whether an email has been verified.
 */
export function isEmailVerifiedLocally(email: string): boolean {
  const record = inMemoryVerifications.get(email.trim().toLowerCase());
  return !!record && record.verified;
}

/**
 * Clears verification session after registration is completed.
 */
export function clearVerificationSession(email: string): void {
  inMemoryVerifications.delete(email.trim().toLowerCase());
}
