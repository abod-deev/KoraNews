import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2, Mail, Lock, User as UserIcon, Shield, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, KeyRound, Sparkles, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, sendVerificationCode, verifyCodeAndSignUp, resendVerificationCode, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'password' | 'confirmPassword' | null>(null);

  // 6 digit code state
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendTimer, setResendTimer] = useState(20);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Countdown timer for resend code button
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
      <div className="flex flex-col items-center justify-center min-h-[65vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // Handle Form Submit (Login or Send Verification)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Common validations
    if (!email || !email.trim()) {
      setErrorMsg('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!email.includes('@')) {
      setErrorMsg('يرجى إدخال بريد إلكتروني صحيح يحتوي على "@"');
      return;
    }
    if (!password || !password.trim()) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    if (isSignUp) {
      if (!name || !name.trim()) {
        setErrorMsg('يرجى إدخال الاسم الكامل');
        return;
      }
      if (!confirmPassword || !confirmPassword.trim()) {
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
      if (isSignUp) {
        const data = await sendVerificationCode(email, password, name.trim());
        setStep('verify');
        setOtp(['', '', '', '', '', '']);
        setSuccessMsg(data.message || 'تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح.');
        setResendTimer(20);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء العملية.');
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
      await verifyCodeAndSignUp(email, fullCode);
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMsg(err.message || 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.');
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
      const data = await resendVerificationCode(email);
      setSuccessMsg(data.message || 'تم إعادة إرسال رمز التحقق بنجاح');
      setResendTimer(20);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إرسال الرمز، يرجى المحاولة لاحقاً');
    } finally {
      setResending(false);
    }
  };

  // Helper to convert Arabic/Persian digits and clean non-digit chars
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
      // Handle paste/multi-character input
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

    // Auto move focus to next input
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
        newOtp[i] = cleaned[i];
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

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 dir-rtl">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-8 space-y-6">
        
        {/* Verification Step Header */}
        {step === 'verify' ? (
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              تأكيد البريد الإلكتروني
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              أدخل رمز التحقق المكون من <strong className="text-emerald-600 dark:text-emerald-400 font-bold">6 أرقام</strong> الذي تم إرساله إلى:
              <br />
              <span dir="ltr" className="font-bold text-gray-900 dark:text-white inline-block mt-1 dir-ltr bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-lg text-xs">
                {email}
              </span>
            </p>
          </div>
        ) : (
          /* Form Step Header */
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-brand/10 text-brand rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
              {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h1>
            {!isSignUp && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                مرحباً بك مجدداً، أدخل بياناتك للمتابعة
              </p>
            )}
          </div>
        )}

        {/* Notifications */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm font-bold flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 2: 6-Digit Verification Code View */}
        {step === 'verify' ? (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <label className="block text-center text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">
                رمز التحقق (6 أرقام)
              </label>
              
              {/* 6 OTP Input Boxes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 dir-ltr" dir="ltr">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onPaste={handleOtpPaste}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-extrabold rounded-xl border-2 transition-all outline-none ${
                      digit
                        ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300 shadow-sm'
                        : 'border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white'
                    } focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || otp.join('').length < 6}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              تأكيد وإنشاء الحساب
            </button>

            {/* Resend & Edit buttons */}
            <div className="flex items-center justify-between pt-2 text-xs font-bold border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendTimer > 0 || resending}
                className="flex items-center gap-1.5 text-brand hover:underline disabled:text-gray-400 disabled:no-underline"
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
                className="flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                تعديل البريد
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: Standard Login / Sign-Up Form */
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  الاسم الكامل *
                </label>
                <div className="relative">
                  <UserIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك الكامل..."
                    className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand outline-none transition-all text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                كلمة المرور * {isSignUp && <span className="text-gray-400 font-normal">(من 8 إلى 16 حرفاً)</span>}
              </label>
              <div className="relative">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  placeholder="••••••••"
                  className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand outline-none transition-all text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Length Instant Alert - Small line, No Card, only when password focused */}
              {isSignUp && focusedInput === 'password' && password.length > 0 && (
                <>
                  {password.length < 8 && (
                    <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 leading-tight animate-fadeIn">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>كلمة المرور يجب ألا تقل عن 8 أحرف ولا تزيد عن 16 (الحالي: {password.length} أحرف)</span>
                    </p>
                  )}
                  {password.length > 16 && (
                    <p className="mt-1 text-[11px] font-medium text-red-500 dark:text-red-400 flex items-center gap-1 leading-tight animate-fadeIn">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>تجاوزت الحد المسموح (16 حرفاً)، يرجى اختصار كلمة المرور (الحالي: {password.length} أحرف)</span>
                    </p>
                  )}
                </>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  تأكيد كلمة المرور *
                </label>
                <div className="relative">
                  <input
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedInput('confirmPassword')}
                    placeholder="••••••••"
                    className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand outline-none transition-all text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                    title={showConfirmPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password Alert - Small line, No Card, only when confirmPassword focused */}
                {isSignUp && focusedInput === 'confirmPassword' && confirmPassword.length > 0 && (
                  <>
                    {(password.length < 8 || password.length > 16) ? (
                      <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1 leading-tight animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>يجب كتابة كلمة المرور بالشكل الصحيح (من 8 إلى 16 حرفاً) أولاً قبل تأكيدها</span>
                      </p>
                    ) : confirmPassword !== password ? (
                      <p className="mt-1 text-[11px] font-medium text-red-500 dark:text-red-400 flex items-center gap-1 leading-tight animate-fadeIn">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>كلمتا المرور غير متطابقتين</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 leading-tight animate-fadeIn">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>كلمتا المرور متطابقتان بنجاح</span>
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
            </button>
          </form>
        )}

        {/* Divider & Google Login (only on form step) */}
        {step === 'form' && (
          <>
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 dark:border-gray-800 w-full" />
              <span className="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400 font-bold uppercase absolute">
                أو
              </span>
            </div>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm"
            >
              <img loading="lazy" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              تسجيل الدخول بواسطة جوجل
            </button>

            {/* Toggle between Signin / Signup */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setConfirmPassword('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-sm font-bold text-brand hover:underline"
              >
                {isSignUp ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
