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
  RotateCcw
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';

const DEFAULT_AVATAR = '/default-avatar.svg';

export default function Profile() {
  useSEO('الملف الشخصي', 'إدارة حسابك وبياناتك الشخصية');
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
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfileStats({
            newsCount: data.newsCount || 0,
            createdAt: data.createdAt
          });
          if (data.name && !displayName) {
            setDisplayName(data.name);
            setTempName(data.name);
          }
          if (data.avatar) {
            setAvatarUrl(data.avatar);
          }
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
      // Reset input value so same file can be re-selected if needed
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
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-4 dir-rtl">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center justify-center text-gray-400 mb-4 shadow-sm">
          <User className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">يرجى تسجيل الدخول أولاً</h2>
        <p className="text-gray-500 max-w-sm mb-6 text-sm">
          تحتاج إلى تسجيل الدخول للوصول إلى ملفك الشخصي وإدارته
        </p>
        <Link
          to="/login"
          className="bg-brand text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-brand/20 active:scale-95"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  const isSuperAdmin = user.role === 'superadmin' || user.email === 'abod46071@gmail.com';
  const isAdmin = user.isAdmin || user.role === 'admin' || isSuperAdmin;
  const currentAvatarSrc = avatarUrl || DEFAULT_AVATAR;
  const hasCustomAvatar = avatarUrl && avatarUrl !== DEFAULT_AVATAR;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6 dir-rtl animate-in fade-in duration-300">
      {/* Hidden File Input for Gallery Selection */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleGalleryUpload}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
        id="profile-gallery-file-input"
      />

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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-brand/10 text-brand hover:bg-brand/20 font-bold text-xs sm:text-sm transition-colors border border-brand/20 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>لوحة التحكم</span>
          </Link>
        )}
      </div>

      {/* Alert message notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
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

      {/* Main Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-10 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          
          {/* Avatar with Gallery Icon Button */}
          <div className="relative group flex-shrink-0">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-800 shadow-md transition-transform group-hover:scale-[1.02]">
              <img
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
              className="absolute -bottom-2 -left-2 bg-brand text-white p-2.5 rounded-2xl shadow-lg hover:bg-emerald-600 active:scale-95 transition-all cursor-pointer border-2 border-white dark:border-gray-900"
              title="اختيار صورة من المعرض"
              aria-label="اختيار صورة من المعرض"
              id="upload-gallery-avatar-btn"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            {/* Remove / Reset Avatar Button (if custom avatar exists) */}
            {hasCustomAvatar && (
              <button
                type="button"
                onClick={handleResetAvatar}
                disabled={isUpdatingAvatar}
                className="absolute -top-2 -left-2 bg-gray-800/80 hover:bg-red-600 text-white p-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border-2 border-white dark:border-gray-900"
                title="استعادة الصورة الافتراضية"
                aria-label="استعادة الصورة الافتراضية"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* User Details with Inline Name Edit */}
          <div className="flex-1 w-full text-center sm:text-right space-y-3">
            
            {/* Name + Pencil Edit Icon */}
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
                    className="flex-1 px-3.5 py-1.5 rounded-xl border border-brand bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-base font-bold outline-none ring-2 ring-brand/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="p-2 rounded-xl bg-brand text-white hover:bg-emerald-600 transition-colors shadow-xs"
                    title="حفظ الاسم"
                  >
                    {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditName}
                    disabled={isSavingName}
                    className="p-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    title="إلغاء"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                    {displayName || 'مستخدم كورة نيوز'}
                  </h1>

                  {/* Pencil Edit Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(displayName);
                      setIsEditingName(true);
                    }}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer"
                    title="تعديل الاسم"
                    aria-label="تعديل الاسم"
                    id="edit-display-name-btn"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* SuperAdmin / Admin Badges (No member badge) */}
                  {isSuperAdmin && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mr-1">
                      <Shield className="w-3.5 h-3.5" /> مالك النظام والمدير العام
                    </span>
                  )}
                  {!isSuperAdmin && isAdmin && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-brand/10 text-brand border border-brand/20 mr-1">
                      <Shield className="w-3.5 h-3.5" /> مشرف الموقع
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Email Address directly below Name */}
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="dir-ltr select-all">{user.email}</span>
            </div>

            {/* Join Date (if available) */}
            {profileStats?.createdAt && (
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>انضم في {new Date(profileStats.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}</span>
              </div>
            )}

            {/* Admin News Stat Badge (if admin) */}
            {isAdmin && profileStats?.newsCount !== undefined && profileStats.newsCount > 0 && (
              <div className="pt-2 flex items-center justify-center sm:justify-start">
                <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-800/60 rounded-2xl px-4 py-1.5 border border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                  <FileText className="w-3.5 h-3.5 text-brand" />
                  <span>الأخبار المنشورة:</span>
                  <span className="font-black text-gray-900 dark:text-white">{profileStats.newsCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Action Buttons */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Logout Button */}
        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 border border-gray-200/80 dark:border-gray-700/80 transition-all active:scale-95 cursor-pointer shadow-xs"
          id="profile-logout-btn"
        >
          <LogOut className="w-4 h-4 text-gray-500" />
          <span>تسجيل الخروج</span>
        </button>

        {/* Delete Account Button */}
        {!isSuperAdmin && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all active:scale-95 cursor-pointer shadow-sm shadow-red-600/20"
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

