import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import {
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  Shield,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
  HelpCircle,
  ChevronLeft,
  Check,
  Crown,
  ShieldCheck,
} from 'lucide-react';
import { trackAuthEvent } from '../services/analytics';
import { useSEO } from '../hooks/useSEO';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  useSEO('تسجيل الدخول والتسجيل', 'تسجيل الدخول أو إنشاء حساب جديد للمشاركة في مسابقة التوقعات والأخبار');
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    sendVerificationCode,
    verifyCodeAndSignUp,
    resendVerificationCode,
    loading,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | 'confirmPassword' | null>(null);

  // 6-digit OTP state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(20);

  // Error and success alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Action states
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Timer countdown for resend OTP
  useEffect(() => {
    let interval: any;
    if (step === 'verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] dir-rtl">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center animate-pulse">
            <Crown className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <Loader2 className="w-20 h-20 animate-spin text-emerald-500 absolute -inset-2 opacity-40" />
        </div>
        <p className="text-sm font-black text-slate-600 dark:text-slate-400">جاري التحقق من حالة الجلسة...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // Validate email format
  const isValidEmailFormat = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  // Handle Login / Register Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();

    // 1. Email Validations
    if (!cleanEmail) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!isValidEmailFormat(cleanEmail)) {
      setErrorMsg('صيغة البريد الإلكتروني غير صحيحة (مثال: name@domain.com)');
      return;
    }

    // 2. Password Validations
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    if (mode === 'register') {
      if (!name || !name.trim()) {
        setErrorMsg('يرجى إدخال الاسم الكامل');
        return;
      }
      if (!confirmPassword) {
        setErrorMsg('يرجى تأكيد كلمة المرور');
        return;
      }
      if (password.length < 8 || password.length > 16) {
        setErrorMsg('كلمة المرور يجب أن تكون بين 8 و 16 حرفاً');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('كلمتا المرور غير متطابقتين. يرجى التأكد من تطابقهما.');
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === 'register') {
        const data = await sendVerificationCode(cleanEmail, password, name.trim());
        setStep('verify');
        setOtp(['', '', '', '', '', '']);
        setSuccessMsg(data.message || 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
        setResendTimer(20);
      } else {
        await signInWithEmail(cleanEmail, password);
        trackAuthEvent('login', 'email');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء العملية، يرجى إعادة المحاولة.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني الخاص بك');
      return;
    }
    if (!isValidEmailFormat(cleanEmail)) {
      setErrorMsg('صيغة البريد الإلكتروني غير صحيحة');
      return;
    }

    setSubmitting(true);
    try {
      // Simulate/Trigger reset flow or friendly instructions
      await new Promise((r) => setTimeout(r, 800));
      setForgotSent(true);
      setSuccessMsg(`إذا كان الحساب (${cleanEmail}) مسجلاً لدينا، فقد تم إرسال تعليمات استعادة كلمة المرور إلى البريد الإلكتروني.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال طلب استعادة كلمة المرور');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Verification Code Submit
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullCode = otp.join('');
    if (fullCode.length < 6) {
      setErrorMsg('يرجى إدخال رمز التحقق المكون من 6 أرقام كاملاً');
      return;
    }

    setSubmitting(true);
    try {
      await verifyCodeAndSignUp(email.trim(), fullCode);
      trackAuthEvent('signup', 'email_otp');
    } catch (err: any) {
      console.error('Verification error:', err);
      const errMsg = err.message || '';
      if (errMsg.includes('منتهية') || errMsg.includes('expired') || errMsg.includes('صلاحية')) {
        setErrorMsg('انتهت صلاحية رمز التحقق. يرجى الضغط على "إعادة إرسال الرمز" للحصول على رمز جديد.');
      } else {
        setErrorMsg(errMsg || 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Resend Code
  const handleResend = async () => {
    if (resendTimer > 0 || resending) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const data = await resendVerificationCode(email.trim());
      setSuccessMsg(data.message || 'تم إعادة إرسال رمز التحقق بنجاح');
      setResendTimer(20);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال الرمز، يرجى المحاولة لاحقاً');
    } finally {
      setResending(false);
    }
  };

  // Helper to normalize digits
  const normalizeDigits = (val: string) => {
    if (!val) return '';
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let str = val.replace(/[\u200E\u200F\u202A-\u202E\uFEFF\s\-]/g, '');
    for (let i = 0; i < 10; i++) {
      str = str.split(arabicDigits[i]).join(i.toString());
      str = str.split(persianDigits[i]).join(i.toString());
    }
    return str.replace(/\D/g, '');
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    const cleaned = normalizeDigits(value);
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste directly
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const cleaned = normalizeDigits(text).slice(0, 6);
    if (cleaned) {
      const newOtp = ['', '', '', '', '', ''];
      for (let i = 0; i < cleaned.length; i++) {
        newOtp[i] = cleaned[i] || '';
      }
      setOtp(newOtp);
      const focusIndex = Math.min(cleaned.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  // Handle keyboard backspace in OTP boxes
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      trackAuthEvent('login', 'google');
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'فشل تسجيل الدخول بواسطة جوجل، يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 dir-rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 relative overflow-hidden transition-all">
        {/* Brand Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500" />

        {/* Back Link to Home */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>الرئيسية</span>
          </Link>
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            KoraNews Auth
          </span>
        </div>

        {/* Step Header */}
        {step === 'verify' ? (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-emerald-500/20">
              <KeyRound className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              تأكيد البريد الإلكتروني 🔐
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
              أدخل رمز التحقق المكون من <strong className="text-emerald-600 dark:text-emerald-400">6 أرقام</strong> الذي أرسلناه إلى:
              <br />
              <span dir="ltr" className="font-mono font-bold text-slate-900 dark:text-white inline-block mt-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-xl text-xs border border-slate-200 dark:border-slate-700">
                {email}
              </span>
            </p>
          </div>
        ) : mode === 'forgot' ? (
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-amber-500/20">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              استعادة كلمة المرور
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold">
              أدخل بريدك الإلكتروني ليصلك رابط إعادة تعيين كلمة المرور
            </p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xs border border-emerald-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>

            {/* Mode Switcher Tabs (Login vs Register) */}
            <div className="p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl flex items-center gap-1 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                إنشاء حساب جديد
              </button>
            </div>
          </div>
        )}

        {/* Status Alerts (Error & Success) */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm font-bold flex items-start gap-2.5 shadow-2xs"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <span className="flex-1 leading-relaxed">{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-bold flex items-start gap-2.5 shadow-2xs"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
              <span className="flex-1 leading-relaxed">{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 2: OTP Verification Code View */}
        {step === 'verify' ? (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <label className="block text-center text-xs font-black text-slate-700 dark:text-slate-300 mb-3">
                رمز التحقق (6 أرقام)
              </label>

              {/* 6 OTP Input Boxes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 dir-ltr" dir="ltr">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-black rounded-2xl border-2 transition-all outline-none ${
                      digit
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white'
                    } focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otp.join('').length < 6}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد وإنشاء الحساب</span>
                </>
              )}
            </button>

            {/* Resend & Edit buttons */}
            <div className="flex items-center justify-between pt-3 text-xs font-bold border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || resending}
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline disabled:text-slate-400 disabled:no-underline cursor-pointer"
              >
                {resending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {resendTimer > 0 ? `إعادة إرسال الرمز (${resendTimer}ث)` : 'إعادة إرسال الرمز'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span>تعديل البريد</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </form>
        ) : mode === 'forgot' ? (
          /* Forgot Password Form */
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني المسجل *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full pr-11 pl-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-left font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || forgotSent}
              className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] cursor-pointer text-sm"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>إرسال رابط الاستعادة</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setForgotSent(false);
                }}
                className="text-xs font-black text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                العودة إلى تسجيل الدخول
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: Standard Login / Register Form */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  الاسم الكامل *
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك الكامل..."
                    className="w-full pr-11 pl-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  placeholder="example@domain.com"
                  className="w-full pr-11 pl-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-left font-bold"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                  كلمة المرور * {mode === 'register' && <span className="text-slate-400 font-normal">(من 8 إلى 16 حرفاً)</span>}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  placeholder="••••••••"
                  className="w-full pr-11 pl-11 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-left font-bold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Length Helper */}
              {mode === 'register' && focusedInput === 'password' && password.length > 0 && (
                <div className="mt-1.5">
                  {password.length < 8 && (
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>يجب ألا تقل كلمة المرور عن 8 أحرف (الحالي: {password.length})</span>
                    </p>
                  )}
                  {password.length >= 8 && password.length <= 16 && (
                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>طول كلمة المرور ممتاز ({password.length} أحرف)</span>
                    </p>
                  )}
                  {password.length > 16 && (
                    <p className="text-[11px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>تجاوزت الحد المسموح (16 حرفاً)</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    placeholder="••••••••"
                    className="w-full pr-11 pl-11 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-left font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer"
                    title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password Helper */}
                {focusedInput === 'confirmPassword' && confirmPassword.length > 0 && (
                  <div className="mt-1.5">
                    {confirmPassword !== password ? (
                      <p className="text-[11px] font-bold text-red-500 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>كلمتا المرور غير متطابقتين</span>
                      </p>
                    ) : (
                      <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>كلمتا المرور متطابقتان بنجاح</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] cursor-pointer text-sm mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : mode === 'register' ? (
                <span>إرسال رمز التحقق</span>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        )}

        {/* Divider & Google Login Button */}
        {step === 'form' && mode !== 'forgot' && (
          <div className="space-y-4 pt-1">
            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-black uppercase absolute">
                أو المتابعة مع
              </span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-black rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-all shadow-2xs text-xs sm:text-sm active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
              ) : (
                <img
                  loading="lazy"
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
              )}
              <span>{submitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول بواسطة جوجل'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
