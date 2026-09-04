import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Image as ImageIcon,
  Trash2,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Loader2,
  FileText,
  ShieldCheck,
  ChevronLeft,
  Pencil,
  Check,
  X,
  RotateCcw,
  Trophy,
  Crown,
  Target,
  Sparkles,
  Award,
  History,
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';
import { motion } from 'motion/react';

const DEFAULT_AVATAR = '/default-avatar.svg';

interface PredictionHistoryItem {
  id: number;
  predictionMatchId: number;
  pointsPerMatch: number;
  homeScore: number;
  awayScore: number;
  pointsEarned: number;
  isEvaluated: boolean;
  isGolden: boolean;
  goldenPoints: number;
  createdAt: string;
  displayStatus: 'upcoming' | 'predicted' | 'live' | 'pending_confirmation' | 'finished_correct' | 'finished_wrong';
  matchState: string;
  match: {
    id: string;
    leagueName: string;
    leagueLogo?: string;
    homeTeam: { name: string; logo?: string };
    awayTeam: { name: string; logo?: string };
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    matchTime: string;
    matchDate: string;
  };
}

interface UserPredictionStats {
  rank: number;
  totalPoints: number;
  totalPredictions: number;
  correctPredictions: number;
  goldenPredictions: number;
  goldenPoints: number;
  successRate: number;
  pendingPredictions: number;
}

export default function Profile() {
  useSEO('الملف الشخصي والإحصائيات', 'إدارة حسابك وبياناتك الشخصية وسجل توقعاتك');
  const { user, token, loading: authLoading, updateUserProfile, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  // Profile data states
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [profileStats, setProfileStats] = useState<{ newsCount: number; createdAt?: string } | null>(null);
  const [predStats, setPredStats] = useState<UserPredictionStats | null>(null);
  const [predHistory, setPredHistory] = useState<PredictionHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load user data into form
  useEffect(() => {
    if (user) {
      const currentName = user.name || user.displayName || '';
      setDisplayName(currentName);
      setTempName(currentName);
      setAvatarUrl(user.avatar || DEFAULT_AVATAR);
    }
  }, [user]);

  // Focus input when editing name begins
  useEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [isEditingName]);

  // Fetch complete profile info & stats from backend
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch User Profile
        const resProfile = await fetch('/api/user/profile', { headers });
        if (resProfile.ok) {
          const data = await resProfile.json();
          setProfileStats({
            newsCount: data.newsCount || 0,
            createdAt: data.createdAt,
          });
          if (data.name) {
            setDisplayName(data.name);
            setTempName(data.name);
          }
          if (data.avatar !== undefined) {
            setAvatarUrl(data.avatar || DEFAULT_AVATAR);
          }
        }

        // 2. Fetch Prediction Stats
        const resStats = await fetch('/api/predictions/stats', { headers });
        if (resStats.ok) {
          const statsData = await resStats.json();
          setPredStats(statsData);
        }

        // 3. Fetch Prediction History
        setIsHistoryLoading(true);
        const resHistory = await fetch('/api/predictions/my', { headers });
        if (resHistory.ok) {
          const historyData = await resHistory.json();
          setPredHistory(Array.isArray(historyData) ? historyData : []);
        }
      } catch (err) {
        console.error('Failed to fetch profile stats or prediction history:', err);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchProfileData();
  }, [token]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Save Name Change
  const handleSaveName = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) {
      showNotification('error', 'يرجى إدخال اسم مستخدم صحيح');
      return;
    }
    if (trimmed === displayName) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    try {
      await updateUserProfile(trimmed, avatarUrl === DEFAULT_AVATAR ? null : avatarUrl);
      setDisplayName(trimmed);
      setIsEditingName(false);
      showNotification('success', 'تم تعديل اسم المستخدم بنجاح');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل تعديل الاسم');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCancelEditName = () => {
    setTempName(displayName);
    setIsEditingName(false);
  };

  // Helper to resize, center-crop, and compress avatar images to clean 360x360 square data URL
  const processAvatarImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('صيغة الصورة غير مدعومة'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const targetSize = 360;
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(img.src);
              return;
            }

            // Calculate center-crop coordinates
            const minDim = Math.min(img.width, img.height);
            const startX = (img.width - minDim) / 2;
            const startY = (img.height - minDim) / 2;

            // Draw cropped & resized square
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

            // Export compressed JPEG
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            resolve(compressedDataUrl);
          } catch (e) {
            resolve(img.src);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload Avatar from Gallery / File
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'يرجى اختيار ملف صورة صالح من المعرض (PNG, JPG, WebP)');
      return;
    }

    setIsUpdatingAvatar(true);
    try {
      const optimizedAvatarDataUrl = await processAvatarImage(file);
      await updateUserProfile(displayName, optimizedAvatarDataUrl);
      setAvatarUrl(optimizedAvatarDataUrl);
      showNotification('success', 'تم حفظ وتحديث صورتك الشخصية بنجاح');
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      showNotification('error', err.message || 'فشل حفظ الصورة الشخصية');
    } finally {
      setIsUpdatingAvatar(false);
      e.target.value = '';
    }
  };

  // Reset Avatar to Default
  const handleResetAvatar = async () => {
    if (avatarUrl === DEFAULT_AVATAR) return;
    setIsUpdatingAvatar(true);
    try {
      await updateUserProfile(displayName, null);
      setAvatarUrl(DEFAULT_AVATAR);
      showNotification('success', 'تمت استعادة الصورة الافتراضية بنجاح');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل إزالة الصورة');
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      navigate('/', { replace: true });
    } catch (err: any) {
      showNotification('error', err.message || 'فشل حذف الحساب');
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4 dir-rtl">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 mb-4 shadow-xs">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">يرجى تسجيل الدخول أولاً</h2>
        <p className="text-slate-500 max-w-sm mb-6 text-sm">
          تحتاج إلى تسجيل الدخول للوصول إلى ملفك الشخصي وإدارته
        </p>
        <Link
          to="/login"
          className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'superadmin';
  const isAdmin = user.isAdmin || user.role === 'admin' || isSuperAdmin;
  const currentAvatarSrc = avatarUrl || DEFAULT_AVATAR;
  const hasCustomAvatar = avatarUrl && avatarUrl !== DEFAULT_AVATAR;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 dir-rtl animate-in fade-in duration-300">
      {/* Hidden File Input for Gallery Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleGalleryUpload}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        id="profile-gallery-file-input"
      />

      {/* Header Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-500">
          <Link to="/" className="hover:text-emerald-500 transition-colors">الرئيسية</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-emerald-600 dark:text-emerald-400 font-black">الملف الشخصي</span>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs sm:text-sm transition-colors border border-emerald-500/20 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة التحكم</span>
          </Link>
        )}
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-xs transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 1. Main User Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with Gallery Edit Button */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-800 shadow-md transition-transform group-hover:scale-[1.02]">
              <img loading="lazy"
                src={currentAvatarSrc}
                alt={displayName || 'المستخدم'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              {isUpdatingAvatar && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                </div>
              )}
            </div>

            {/* Gallery Upload Icon Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUpdatingAvatar}
              className="absolute -bottom-2 -left-2 bg-emerald-600 text-white p-2.5 rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-slate-900"
              title="اختيار صورة من المعرض"
              aria-label="اختيار صورة من المعرض"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Reset Avatar Button */}
            {hasCustomAvatar && (
              <button
                type="button"
                onClick={handleResetAvatar}
                disabled={isUpdatingAvatar}
                className="absolute -top-2 -left-2 bg-slate-800/80 hover:bg-red-600 text-white p-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border-2 border-white dark:border-slate-900"
                title="استعادة الصورة الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Details & Edit Form */}
          <div className="flex-1 w-full text-center sm:text-right space-y-3">
            <div className="flex items-center justify-center sm:justify-start gap-3">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                    placeholder="أدخل الاسم..."
                    className="flex-1 px-3.5 py-1.5 rounded-xl border border-emerald-500 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold outline-none ring-2 ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs"
                    title="حفظ الاسم"
                  >
                    {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditName}
                    disabled={isSavingName}
                    className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                    title="إلغاء"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {displayName || 'متسابق التوقعات'}
                  </h1>

                  <button
                    type="button"
                    onClick={() => {
                      setTempName(displayName);
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    title="تعديل الاسم"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Shield className="w-3.5 h-3.5" /> مالك النظام
                    </span>
                  )}
                  {!isSuperAdmin && isAdmin && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Shield className="w-3.5 h-3.5" /> مشرف الموقع
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="dir-ltr select-all">{user.email}</span>
            </div>

            {/* Join Date */}
            {profileStats?.createdAt && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 dark:text-slate-500 font-bold">
                <Calendar className="w-3.5 h-3.5" />
                <span>انضم في {new Date(profileStats.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. User Stats Cards Grid (Rank, Points, Correct Predictions, Golden Predictions) */}
      <div className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <span>إحصائيات مسابقة التوقعات</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Rank */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>الترتيب العام</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              #{predStats?.rank || '—'}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1">في لائحة المتسابقين</span>
          </div>

          {/* Points */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>إجمالي النقاط</span>
              <Award className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {predStats?.totalPoints || 0}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1">نقاط مسجلة</span>
          </div>

          {/* Correct Predictions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>توقعات صحيحة</span>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
              {predStats?.correctPredictions || 0}
            </div>
            <span className="text-[10px] text-slate-400 font-bold mt-1">
              من {predStats?.totalPredictions || 0} توقع (نسبة النجاح {predStats?.successRate || 0}%)
            </span>
          </div>

          {/* Golden Predictions */}
          <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 dark:from-amber-950/30 dark:to-slate-900 bg-white dark:bg-slate-900 rounded-3xl p-4 border border-amber-300 dark:border-amber-700/60 flex flex-col justify-between shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
              <span>توقعات ذهبية</span>
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              👑 {predStats?.goldenPredictions || 0}
            </div>
            <span className="text-[10px] text-amber-700/70 dark:text-amber-400/80 font-bold mt-1">
              +{predStats?.goldenPoints || 0} نقاط إضافية
            </span>
          </div>
        </div>
      </div>

      {/* 3. Prediction History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-500" />
            <span>سجل توقعاتي السابق</span>
          </h2>
          <span className="text-xs font-bold text-slate-400">
            إجمالي التوقعات: {predHistory.length}
          </span>
        </div>

        {isHistoryLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800/40 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : predHistory.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <Target className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="text-base font-black text-slate-700 dark:text-slate-300">
              لم تقم بإجراء أي توقعات بعد
            </h3>
            <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto">
              شارك في توقع نتائج المباريات القادمة لاكتساب النقاط وتصدر الترتيب العام!
            </p>
            <Link
              to="/predictions"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>توقع المباريات الآن</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {predHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
              >
                {/* Header: League & Status */}
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-slate-500 dark:text-slate-400">
                    {item.match.leagueLogo && (
                      <img loading="lazy" src={item.match.leagueLogo} alt="" className="w-4 h-4 object-contain" />
                    )}
                    <span>{item.match.leagueName}</span>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-1.5">
                    {item.isGolden && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-black border border-amber-500/30 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        <span>ذهبية</span>
                      </span>
                    )}

                    {item.displayStatus === 'finished_correct' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
                        ⭐ توقع صحيح (+{item.pointsEarned + item.goldenPoints} نقطة)
                      </span>
                    )}

                    {item.displayStatus === 'finished_wrong' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black border border-red-500/20">
                        ❌ توقع خاطئ (0 نقطة)
                      </span>
                    )}

                    {item.displayStatus === 'pending_confirmation' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/20">
                        ⏳ بانتظار التأكيد
                      </span>
                    )}

                    {(item.displayStatus === 'predicted' || item.displayStatus === 'upcoming') && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/20">
                        🎯 تم التوقع
                      </span>
                    )}

                    {item.displayStatus === 'live' && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                        LIVE جارية
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Teams & Prediction Comparison */}
                <div className="flex items-center justify-between gap-2">
                  {/* Home Team */}
                  <div className="flex-1 flex items-center gap-2 justify-start min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {item.match.homeTeam.logo ? (
                        <img loading="lazy" src={item.match.homeTeam.logo} alt="" className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold">{item.match.homeTeam.name.charAt(0)}</span>
                      )}
                    </div>
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.match.homeTeam.name}
                    </span>
                  </div>

                  {/* Prediction vs Actual Score Display */}
                  <div className="flex flex-col items-center shrink-0 px-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm sm:text-base">
                        {item.homeScore} - {item.awayScore}
                      </span>
                    </div>
                    <span className="text-[9px] font-extrabold text-slate-400 mt-0.5">توقعك</span>

                    {item.match.homeScore !== null && item.match.awayScore !== null && (
                      <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 mt-1">
                        النتيجة الفعلية: {item.match.homeScore} - {item.match.awayScore}
                      </div>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate text-left">
                      {item.match.awayTeam.name}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      {item.match.awayTeam.logo ? (
                        <img loading="lazy" src={item.match.awayTeam.logo} alt="" className="w-5 h-5 object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold">{item.match.awayTeam.name.charAt(0)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Account Action Buttons (Logout & Delete) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
          id="profile-logout-btn"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>تسجيل الخروج</span>
        </button>

        {!isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer shadow-2xs shadow-red-600/20"
            id="delete-account-btn"
          >
            <Trash2 className="w-4 h-4" />
            <span>حذف الحساب</span>
          </button>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف الحساب نهائياً"
        message="هل أنت متأكد تماماً من رغبتك في حذف حسابك؟ سيتم إزالة جميع بياناتك الشخصية بشكل نهائي ولا يمكن التراجع عن هذا الإجراء."
        confirmText={isDeleting ? 'جاري الحذف...' : 'نعم، احذف حسابي'}
        cancelText="إلغاء وتراجع"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteAccount}
        onClose={() => setIsDeleteModalOpen(false)}
      />

      {/* Confirm Logout Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="تسجيل الخروج"
        message="هل ترغب في تسجيل الخروج من حسابك الآن؟"
        confirmText="تسجيل الخروج"
        cancelText="البقاء"
        variant="info"
        onConfirm={handleLogout}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
}
