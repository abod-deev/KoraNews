import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import {
  User,
  Mail,
  Shield,
  Calendar,
  Camera,
  Trash2,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Save,
  FileText,
  MessageSquare,
  Sparkles,
  Upload,
  Link as LinkIcon,
  ShieldCheck,
  ChevronLeft,
  X
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';

// High quality preset avatars for sports/football enthusiasts
const PRESET_AVATARS = [
  { id: '1', name: 'لاعب كرة قدم 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200' },
  { id: '2', name: 'لاعب كرة قدم 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200' },
  { id: '3', name: 'مدرب تكتيكي', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200' },
  { id: '4', name: 'مشجع رياضي', url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200' },
  { id: '5', name: 'محلل كروي', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200' },
  { id: '6', name: 'نجم الملعب', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200' },
  { id: '7', name: 'رياضية محترفة', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200' },
  { id: '8', name: 'كابتن الفريق', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200' },
];

export default function Profile() {
  useSEO('الملف الشخصي', 'إدارة حسابك وبياناتك الشخصية');
  const { user, token, loading: authLoading, updateUserProfile, deleteAccount, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [profileStats, setProfileStats] = useState<{ newsCount: number; commentsCount: number; createdAt?: string } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Custom delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Avatar picker tab
  const [avatarInputMode, setAvatarInputMode] = useState<'preset' | 'url' | 'upload'>('preset');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || user.displayName || '');
      setAvatarUrl(user.avatar || '');
    }
  }, [user]);

  // Fetch complete profile info & stats from backend
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileStats({
            newsCount: data.newsCount || 0,
            commentsCount: data.commentsCount || 0,
            createdAt: data.createdAt
          });
          if (data.name && !displayName) setDisplayName(data.name);
          if (data.avatar && !avatarUrl) setAvatarUrl(data.avatar);
        }
      } catch (err) {
        console.error('Failed to fetch profile stats:', err);
      }
    };

    fetchProfileData();
  }, [token]);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      showNotification('error', 'يرجى إدخال اسم المستخدم');
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(displayName.trim(), avatarUrl.trim() || null);
      showNotification('success', 'تم تحديث الملف الشخصي والصورة بنجاح!');
    } catch (err: any) {
      showNotification('error', err.message || 'فشل تحديث الملف الشخصي');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'يرجى اختيار ملف صورة صالح (PNG, JPG, WebP)');
      return;
    }

    // Limit to 2MB to prevent large storage payloads
    if (file.size > 2 * 1024 * 1024) {
      showNotification('error', 'حجم الصورة كبير جداً، الحد الأقصى المسموح 2 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      showNotification('success', 'تم تحميل الصورة، اضغط "حفظ التغييرات" لتثبيتها.');
    };
    reader.readAsDataURL(file);
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
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4 dir-rtl">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-400 mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">يرجى تسجيل الدخول أولاً</h2>
        <p className="text-gray-500 max-w-sm mb-6 text-sm">
          تحتاج إلى تسجيل الدخول للوصول إلى ملفك الشخصي وإدارته
        </p>
        <Link
          to="/login"
          className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors shadow-md shadow-brand/20"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'superadmin' || user.email === 'abod46071@gmail.com';
  const isAdmin = user.isAdmin || user.role === 'admin' || isSuperAdmin;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 dir-rtl animate-in fade-in duration-300">
      {/* Header Breadcrumb / Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
          <Link to="/" className="hover:text-brand transition-colors">الرئيسية</Link>
          <ChevronLeft className="w-4 h-4" />
          <span className="text-brand font-black">الملف الشخصي</span>
        </div>

        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 font-bold text-xs sm:text-sm transition-colors border border-brand/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة التحكم</span>
          </Link>
        )}
      </div>

      {/* Alert message notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Profile Summary Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar with status indicator */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-gradient-to-br from-brand/20 to-brand/5 border-4 border-white dark:border-gray-800 shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName || 'المستخدم'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand font-black text-3xl">
                  {(displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('avatar-settings-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute -bottom-2 -left-2 bg-brand text-white p-2 rounded-xl shadow-md hover:bg-emerald-600 transition-transform active:scale-95"
              title="تغيير الصورة الشخصية"
              aria-label="تغيير الصورة الشخصية"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Details & Badges */}
          <div className="flex-1 text-center sm:text-right space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                {displayName || user.name || 'مستخدم كورة نيوز'}
              </h1>
              
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Shield className="w-3 h-3" /> مالك النظام والمدير العام
                </span>
              ) : isAdmin ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-brand/10 text-brand border border-brand/20">
                  <Shield className="w-3 h-3" /> مشرف الموقع
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  <User className="w-3 h-3" /> عضو مسجل
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="dir-ltr">{user.email}</span>
              </span>
              {profileStats?.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>انضم في {new Date(profileStats.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}</span>
                </span>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {isAdmin && (
                <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-2 border border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">الأخبار المنشورة:</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{profileStats?.newsCount ?? 0}</span>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-2 border border-gray-200/60 dark:border-gray-700/60 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">التعليقات:</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{profileStats?.commentsCount ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
            <User className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-black text-gray-900 dark:text-white">تعديل البيانات الأساسية</h2>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              الاسم الكامل / اسم العرض *
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="أدخل اسمك الكامل أو اسم العرض..."
                className="w-full pr-11 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">
              هذا الاسم سيظهر للجميع عند نشر الأخبار أو كتابة التعليقات.
            </p>
          </div>

          {/* Avatar Section */}
          <div id="avatar-settings-section" className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                صورة الملف الشخصي
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إزالة الصورة</span>
                </button>
              )}
            </div>

            {/* Avatar Tab Switcher */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl gap-1 max-w-md">
              <button
                type="button"
                onClick={() => setAvatarInputMode('preset')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  avatarInputMode === 'preset'
                    ? 'bg-white dark:bg-gray-900 text-brand shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>صور جاهزة</span>
              </button>

              <button
                type="button"
                onClick={() => setAvatarInputMode('upload')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  avatarInputMode === 'upload'
                    ? 'bg-white dark:bg-gray-900 text-brand shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>رفع من الجهاز</span>
              </button>

              <button
                type="button"
                onClick={() => setAvatarInputMode('url')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  avatarInputMode === 'url'
                    ? 'bg-white dark:bg-gray-900 text-brand shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>رابط مباشر</span>
              </button>
            </div>

            {/* 1. Presets Mode */}
            {avatarInputMode === 'preset' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  اختر من الصور الرمزية الرياضية المميزة:
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 pt-1">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all p-0.5 ${
                          isSelected
                            ? 'border-brand scale-105 shadow-md shadow-brand/20 ring-2 ring-brand/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-brand/60'
                        }`}
                        title={preset.name}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-brand/25 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-white drop-shadow-md" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Upload Mode */}
            {avatarInputMode === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                  id="avatar-file-input"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand dark:hover:border-brand rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-gray-800/40"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                    اضغط هنا لاختيار صورة من هاتفك أو جهازك
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    يدعم PNG, JPG, WebP بحجم أقصى 2 ميغابايت
                  </p>
                </div>
              </div>
            )}

            {/* 3. URL Mode */}
            {avatarInputMode === 'url' && (
              <div className="space-y-2">
                <div className="relative">
                  <LinkIcon className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full pr-11 pl-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-brand outline-none transition-all dir-ltr text-left"
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  الصق رابط صورة مباشر ينتهي بـ .jpg أو .png أو .webp
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-brand text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all shadow-md shadow-brand/20 active:scale-95 disabled:opacity-50"
              id="save-profile-btn"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Account Settings & Danger Zone */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-gray-800">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-black text-gray-900 dark:text-white">إجراءات الحساب</h2>
        </div>

        <div className="space-y-4">
          {/* Logout Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 gap-3">
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white">تسجيل الخروج من الحساب</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                إنهاء الجلسة الحالية والعودة للصفحة الرئيسية
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-colors cursor-pointer"
              id="profile-logout-btn"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
              <span>تسجيل الخروج</span>
            </button>
          </div>

          {/* Delete Account Danger Zone */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/70 dark:border-red-900/40 gap-3">
            <div>
              <h3 className="text-sm font-black text-red-700 dark:text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>حذف الحساب نهائياً</span>
              </h3>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                {isSuperAdmin
                  ? 'حساب مالك النظام والمدير العام الرئيسي محمي بالكامل ولا يمكن حذفه.'
                  : 'سيتم مسح بيانات حسابك بالكامل، ولا يمكن التراجع عن هذا الإجراء.'}
              </p>
            </div>

            {!isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                id="delete-account-btn"
              >
                <Trash2 className="w-4 h-4" />
                <span>حذف الحساب</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="تأكيد حذف الحساب نهائياً"
        message="هل أنت متأكد تماماً من رغبتك في حذف حسابك؟ سيتم إزالة جميع بياناتك الشخصية وتعليقاتك بشكل نهائي ولن تتمكن من استعادتها."
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
