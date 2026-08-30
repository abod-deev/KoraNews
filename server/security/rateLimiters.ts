import rateLimit from 'express-rate-limit';

const baseLimiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    default: false,
  },
};

/**
 * General API Limiter (fallback for general read queries)
 */
export const generalLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1200,
  message: { error: true, message: 'تم تجاوز الحد الأقصى للطلبات، يرجى المحاولة بعد قليل' },
});

/**
 * Strict Login Rate Limiter (Brute-force protection)
 */
export const loginLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 12,
  message: { error: 'تم تجاوز عدد محاولات تسجيل الدخول المسموح بها، يرجى الانتظار 15 دقيقة قبل المحاولة مجدداً.' },
});

/**
 * Strict OTP Send / Resend Rate Limiter (Anti-Spam & Anti-Bombing)
 */
export const otpSendLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_OTP_SEND_MAX) || 8,
  message: { error: 'تم تجاوز الحد المسموح به لإرسال رموز التحقق، يرجى الانتظار بضع دقائق.' },
});

/**
 * Strict OTP Code Verification Rate Limiter (Anti-Brute Force)
 */
export const otpVerifyLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_OTP_VERIFY_MAX) || 15,
  message: { error: 'تم تجاوز عدد محاولات التحقق، يرجى طلب رمز جديد والمحاولة بعد قليل.' },
});

/**
 * Comments Anti-Flood Rate Limiter
 */
export const commentsLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'يرجى التمهل، لا يمكن إضافة تعليقات متتالية بسرعة فائقة.' },
});

/**
 * Match Sync Rate Limiter
 */
export const matchSyncLimiter = rateLimit({
  ...baseLimiterOptions,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: { error: 'عملية مزامنة المباريات قيد التشغيل أو تمت مؤخراً، يرجى الانتظار.' },
});
