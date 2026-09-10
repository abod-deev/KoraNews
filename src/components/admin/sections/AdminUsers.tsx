import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Edit2, Trash2, Loader2, Search, Users, RefreshCw, 
  CheckCircle2, XCircle, ShieldCheck, UserCheck, UserX, AlertTriangle, X, Check, Lock, User,
  Crown, Zap, Sparkles, Layers, Sliders, CheckSquare, Square, Info
} from 'lucide-react';
import ConfirmModal from '../../common/ConfirmModal';
import { useAuth } from '../../../contexts/AuthContext';
import { getRoleBadgeInfo, isSystemOwner, isSystemManager } from '../../../utils/authHelpers';
import { UserRole, PermissionKey } from '../../../types';
import { ALL_PERMISSIONS_DEFINITIONS, PERMISSION_PRESETS, PERMISSION_SECTIONS, checkUserHasPermission, PERMISSIONS } from '../../../constants/permissions';

interface AdminUsersProps {
  token: string | null;
  showMsg: (type: 'success' | 'error', text: string) => void;
}

export default function AdminUsers({ token, showMsg }: AdminUsersProps) {
  const { user: currentUser, isOwner: callerIsOwner, isManager: callerIsManager } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteUserModal, setDeleteUserModal] = useState<{ isOpen: boolean; user: any | null }>({
    isOpen: false,
    user: null
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingUser && !isActionLoading) {
        setEditingUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingUser, isActionLoading]);

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          role: editingUser.role, 
          isActive: editingUser.isActive !== false,
          permissions: editingUser.permissions || []
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل تحديث بيانات المستخدم');
      }
      showMsg('success', 'تم تحديث صلاحيات وحالة المستخدم بنجاح وفق نظام المستويات المعتمد');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ أثناء تحديث بيانات المستخدم');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteUser = (targetUser: any) => {
    setDeleteUserModal({ isOpen: true, user: targetUser });
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserModal.user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMsg('success', 'تم حذف حساب المستخدم نهائياً');
        setUsers(prev => prev.filter(u => u.id !== deleteUserModal.user?.id));
        setDeleteUserModal({ isOpen: false, user: null });
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل حذف المستخدم');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ أثناء حذف المستخدم');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Check if a target user can be modified by current logged-in user
  const canModifyTargetUser = (targetUser: any): boolean => {
    if (!currentUser) return false;
    const targetIsOwner = isSystemOwner(targetUser);
    const targetIsManager = isSystemManager(targetUser) && !targetIsOwner;
    const targetIsAdmin = targetUser.role === 'admin' || targetUser.isAdmin;

    // Only an owner can modify an owner
    if (targetIsOwner) return callerIsOwner;

    // Only an owner can modify a manager
    if (targetIsManager) return callerIsOwner;

    // Only owner, manager, or admin with admins_manage can modify an admin
    const callerHasAdminsManage = checkUserHasPermission(currentUser, 'admins_manage');
    if (targetIsAdmin) return callerIsOwner || callerIsManager || callerHasAdminsManage;

    // Owner, manager, or admin with users_manage can modify regular users
    const callerHasUsersManage = checkUserHasPermission(currentUser, 'users_manage');
    return callerIsOwner || callerIsManager || callerHasUsersManage || callerHasAdminsManage;
  };

  // Toggle permission helper for editing modal
  const handleTogglePermission = (permKey: string) => {
    if (!editingUser) return;
    const currentPerms: string[] = Array.isArray(editingUser.permissions) ? editingUser.permissions : [];
    let updated: string[];
    if (currentPerms.includes(permKey)) {
      updated = currentPerms.filter(p => p !== permKey);
    } else {
      updated = [...currentPerms, permKey];
    }
    setEditingUser({ ...editingUser, permissions: updated });
  };

  // Preset permission assigners
  const applyPreset = (presetId: string) => {
    if (!editingUser) return;
    const preset = PERMISSION_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setEditingUser({
        ...editingUser,
        permissions: preset.permissions
      });
    }
  };

  // Stats Counters
  const userStats = useMemo(() => {
    let total = users.length;
    let owners = 0;
    let managers = 0;
    let admins = 0;
    let standardUsers = 0;
    let inactive = 0;

    users.forEach(u => {
      if (u.isActive === false) inactive++;
      if (isSystemOwner(u)) {
        owners++;
      } else if (isSystemManager(u)) {
        managers++;
      } else if (u.role === 'admin' || u.isAdmin) {
        admins++;
      } else {
        standardUsers++;
      }
    });

    return { total, owners, managers, admins, standardUsers, inactive };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmail) return false;
      }

      // 2. Role Filter
      if (roleFilter) {
        if (roleFilter === 'owner' && !isSystemOwner(u)) return false;
        if (roleFilter === 'manager' && (!isSystemManager(u) || isSystemOwner(u))) return false;
        if (roleFilter === 'admin' && (u.role !== 'admin' || isSystemOwner(u) || isSystemManager(u))) return false;
        if (roleFilter === 'user' && (u.role === 'admin' || isSystemOwner(u) || isSystemManager(u))) return false;
      }

      // 3. Status Filter
      if (statusFilter) {
        if (statusFilter === 'active' && u.isActive === false) return false;
        if (statusFilter === 'inactive' && u.isActive !== false) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Stats */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                إدارة المستخدمين والأدوار
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              التحكم بمستويات الصلاحيات الإدارية (مالك النظام، مدير النظام، المشرف) وتعيين الصلاحيات المخصصة
            </p>
          </div>

          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">إجمالي الحسابات</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{userStats.total}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> مالك النظام
            </div>
            <div className="text-xl font-black text-amber-900 dark:text-amber-300 mt-1">{userStats.owners}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/30">
            <div className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5" /> مدير النظام
            </div>
            <div className="text-xl font-black text-purple-900 dark:text-purple-300 mt-1">{userStats.managers}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30">
            <div className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> المشرفون (Admins)
            </div>
            <div className="text-xl font-black text-blue-900 dark:text-blue-300 mt-1">{userStats.admins}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30">
            <div className="text-xs font-bold text-rose-700 dark:text-rose-400">حسابات معطلة</div>
            <div className="text-xl font-black text-rose-900 dark:text-rose-300 mt-1">{userStats.inactive}</div>
          </div>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-3">
          
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">جميع المستويات والأدوار</option>
            <option value="owner" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">👑 مالك النظام (System Owner)</option>
            <option value="manager" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">⚡ مدير النظام (System Manager)</option>
            <option value="admin" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">🛡️ مشرف / أدمن (Admin)</option>
            <option value="user" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">👤 مستخدم عادي (User)</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">جميع الحالات</option>
            <option value="active" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">حساب نشط فقط</option>
            <option value="inactive" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">حساب معطل فقط</option>
          </select>

        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto mt-4">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4 rounded-r-2xl">المستخدم</th>
                <th className="py-3.5 px-4">البريد الإلكتروني</th>
                <th className="py-3.5 px-4">مستوى الصلاحية (الدور)</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-left rounded-l-2xl">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">جاري تحميل سجل المستخدمين...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Users className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300">لم يتم العثور على نتائج</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">جرّب تعديل كلمة البحث أو فلتر الأدوار.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const badge = getRoleBadgeInfo(u.role);
                  const canEdit = canModifyTargetUser(u);
                  const isTargetOwner = isSystemOwner(u);

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              u.name ? u.name.charAt(0).toUpperCase() : 'U'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name || 'بدون اسم'}</span>
                              {isTargetOwner && (
                                <Crown className="w-3.5 h-3.5 text-amber-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {u.email}
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.badgeClass}`}>
                          {badge.rank === 4 ? (
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                          ) : badge.rank === 3 ? (
                            <Zap className="w-3.5 h-3.5 text-purple-500" />
                          ) : badge.rank === 2 ? (
                            <Shield className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {u.isActive !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            <span>نشط</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                            <span>معطل</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left">
                        {canEdit ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                // Default role to 'user' if empty
                                const userRole = u.role || 'user';
                                const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
                                setEditingUser({ ...u, role: userRole, permissions: userPerms });
                              }}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 rounded-xl transition-colors cursor-pointer"
                              title="تعديل المستوى والصلاحيات"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            
                            {canModifyTargetUser(u) && u.id !== currentUser.id && !isTargetOwner && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 rounded-xl transition-colors cursor-pointer"
                                title="حذف المستخدم نهائياً"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>محمي</span>
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 mt-3">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
              <span className="text-xs text-slate-400 font-bold">جاري تحميل سجل المستخدمين...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">لم يتم العثور على نتائج</div>
            </div>
          ) : (
            filteredUsers.map((u) => {
              const badge = getRoleBadgeInfo(u.role);
              const canEdit = canModifyTargetUser(u);
              const isTargetOwner = isSystemOwner(u);

              return (
                <div key={u.id} className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          u.name ? u.name.charAt(0).toUpperCase() : 'U'
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.name || 'بدون اسم'}</span>
                          {isTargetOwner && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="text-xs text-slate-500 font-mono" dir="ltr">{u.email}</div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.badgeClass}`}>
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>معطل</span>
                        </span>
                      )}
                    </div>

                    {canEdit ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const userRole = u.role || 'user';
                            const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
                            setEditingUser({ ...u, role: userRole, permissions: userPerms });
                          }}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>تعديل الصلاحيات</span>
                        </button>
                        {canModifyTargetUser(u) && u.id !== currentUser.id && !isTargetOwner && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> محمي
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteUserModal.isOpen}
        onClose={() => setDeleteUserModal({ isOpen: false, user: null })}
        onConfirm={confirmDeleteUser}
        title="حذف حساب المستخدم نهائياً"
        message={`هل أنت متأكد من رغبتك في حذف حساب "${deleteUserModal.user?.name || deleteUserModal.user?.email}"؟ سيتم مسح بيانات المستخدم وسجلاته بالكامل.`}
        confirmText="حذف نهائي"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* Edit Role & Granular Permissions Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl relative my-8 max-h-[90vh] flex flex-col overflow-hidden text-right"
              dir="rtl"
            >
              {/* Sticky Header with User Name & Close Button */}
              <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-5 sm:px-7 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/80 dark:border-indigo-800/60 font-black text-base shrink-0">
                    {editingUser.avatar ? (
                      <img src={editingUser.avatar} alt={editingUser.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      editingUser.name ? editingUser.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
                        {editingUser.name || 'مستخدم بدون اسم'}
                      </h2>
                      {isSystemOwner(editingUser) && (
                        <span className="bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/80 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> مالك النظام
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate" dir="ltr">
                      {editingUser.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isActionLoading}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content Body */}
              <div className="overflow-y-auto p-5 sm:p-7 flex-1 space-y-6">

              {/* User Information Panel */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500" /> معلومات الحساب
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الاسم والبريد</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{editingUser.name || 'بدون اسم'}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{editingUser.email}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">تاريخ التسجيل</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white" dir="ltr">
                      {editingUser.createdAt ? new Date(editingUser.createdAt).toLocaleString('ar-SA') : 'غير متوفر'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الحالة والدور الإداري</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${editingUser.isActive === false ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'}`}>
                        {editingUser.isActive === false ? 'معطل' : 'نشط'}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        editingUser.role === 'owner' || editingUser.role === 'system_owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                        editingUser.role === 'manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' :
                        editingUser.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' :
                        'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {editingUser.role === 'owner' || editingUser.role === 'system_owner' ? 'مالك النظام' :
                         editingUser.role === 'manager' ? 'مدير النظام' :
                         editingUser.role === 'admin' ? 'مشرف (Admin)' : 'مستخدم'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">الصلاحيات الممنوحة</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {(editingUser.role === 'owner' || editingUser.role === 'system_owner') ? 'صلاحيات مطلقة' :
                       (editingUser.role === 'manager') ? 'إدارة النظام بالكامل' :
                       (editingUser.role === 'admin') ? `${Array.isArray(editingUser.permissions) ? editingUser.permissions.length : 0} صلاحية إدارية` :
                       'لا يوجد صلاحيات إدارية'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleUserUpdate} className="space-y-6">
                
                {/* 1. 3-Tier Role Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-black text-slate-900 dark:text-white">
                      المستوى الإداري (الدور في النظام)
                    </label>
                    <span className="text-[11px] text-slate-400 font-bold">
                      {callerIsOwner ? 'صلاحية كاملة لتعيين أي مستوى' : 'إدارة مستوى المشرف والمستخدم'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Role 1: User */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'user', permissions: [], isAdmin: false })}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        editingUser.role === 'user' || (!editingUser.role)
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <span className="text-xs font-black text-slate-900 dark:text-white">1. مستخدم عادي (User)</span>
                        </div>
                        {(editingUser.role === 'user' || !editingUser.role) && (
                          <span className="w-4 h-4 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        مستخدم عادي للمشاركة في التوقعات ومتابعة المباريات بدون أي وصول إداري.
                      </p>
                    </button>

                    {/* Role 2: Admin */}
                    <button
                      type="button"
                      onClick={() => {
                        const existingPerms = Array.isArray(editingUser.permissions) && editingUser.permissions.length > 0
                          ? editingUser.permissions
                          : [
                              PERMISSIONS.NEWS_VIEW, PERMISSIONS.NEWS_ADD, PERMISSIONS.NEWS_EDIT, PERMISSIONS.NEWS_DELETE, PERMISSIONS.NEWS_PUBLISH, PERMISSIONS.NEWS_UNPUBLISH, PERMISSIONS.NEWS_FEATURE, PERMISSIONS.NEWS_BREAKING,
                              PERMISSIONS.CATEGORIES_VIEW, PERMISSIONS.CATEGORIES_ADD, PERMISSIONS.CATEGORIES_EDIT, PERMISSIONS.CATEGORIES_DELETE,
                              PERMISSIONS.MATCHES_VIEW, PERMISSIONS.MATCHES_MANAGE, PERMISSIONS.MATCHES_EDIT, PERMISSIONS.MATCHES_SYNC,
                              PERMISSIONS.PREDICTIONS_VIEW, PERMISSIONS.PREDICTIONS_MANAGE, PERMISSIONS.PREDICTIONS_MATCH_ADD, PERMISSIONS.PREDICTIONS_MATCH_EDIT, PERMISSIONS.PREDICTIONS_MATCH_DELETE, PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE, PERMISSIONS.PREDICTIONS_RESULTS_MANAGE, PERMISSIONS.PREDICTIONS_POINTS_MANAGE
                            ];
                        setEditingUser({ ...editingUser, role: 'admin', permissions: existingPerms, isAdmin: true });
                      }}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        editingUser.role === 'admin'
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-black text-blue-700 dark:text-blue-300">2. المشرف / الأدمن (Admin)</span>
                        </div>
                        {editingUser.role === 'admin' && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        مسؤول تشغيلي بصلاحيات مخصصة للأخبار، المباريات، أو إدارة التوقعات.
                      </p>
                    </button>

                    {/* Role 3: System Manager */}
                    <button
                      type="button"
                      disabled={!callerIsOwner}
                      onClick={() => setEditingUser({ ...editingUser, role: 'manager', isAdmin: true })}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                        !callerIsOwner ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        editingUser.role === 'manager' || editingUser.role === 'system_manager'
                          ? 'bg-purple-50/90 dark:bg-purple-950/50 border-purple-500 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-black text-purple-700 dark:text-purple-300">3. مدير النظام (System Manager)</span>
                        </div>
                        {(editingUser.role === 'manager' || editingUser.role === 'system_manager') && (
                          <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        صلاحيات تشغيلية كاملة + إدارة وتعيين المشرفين وتحديد صلاحياتهم.
                      </p>
                    </button>

                    {/* Role 4: System Owner */}
                    <button
                      type="button"
                      disabled={!callerIsOwner}
                      onClick={() => setEditingUser({ ...editingUser, role: 'owner', isAdmin: true })}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                        !callerIsOwner ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        editingUser.role === 'owner' || editingUser.role === 'system_owner' || editingUser.role === 'superadmin'
                          ? 'bg-amber-50/90 dark:bg-amber-950/50 border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300">4. مالك النظام (System Owner)</span>
                        </div>
                        {(editingUser.role === 'owner' || editingUser.role === 'system_owner' || editingUser.role === 'superadmin') && (
                          <span className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        أعلى مستوى إداري، تحكم كامل بالنظام والمستخدمين ومدراء النظام.
                      </p>
                    </button>

                  </div>
                </div>

                {/* 2. Granular Permissions (Shown only when Role is Admin) */}
                {editingUser.role === 'admin' && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-200/50 dark:border-blue-800/40">
                      <div>
                        <div className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Sliders className="w-4 h-4 text-blue-600" />
                          <span>تحديد الصلاحيات الممنوحة للأدمن:</span>
                        </div>
                        <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                          اختر الصلاحيات المحددة التي يستطيع هذا المشرف إدارتها.
                        </p>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {PERMISSION_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset.id)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                              preset.id === 'all'
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : preset.id === 'clear'
                                ? 'bg-white dark:bg-slate-800 text-rose-600 border border-rose-200 dark:border-rose-900 hover:bg-rose-50'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                            title={preset.description}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions Grouped by Category */}
                    {PERMISSION_SECTIONS.map(section => {
                      const categoryPerms = ALL_PERMISSIONS_DEFINITIONS.filter(p => p.section === section.id);
                      if (categoryPerms.length === 0) return null;
                      return (
                        <div key={section.id} className="space-y-2">
                          <div className="text-[11px] font-black text-slate-600 dark:text-slate-300">
                            {section.label}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {categoryPerms.map(perm => {
                              const isChecked = Array.isArray(editingUser.permissions) && editingUser.permissions.includes(perm.key);
                              return (
                                <button
                                  key={perm.key}
                                  type="button"
                                  onClick={() => handleTogglePermission(perm.key)}
                                  className={`p-2.5 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                                    isChecked
                                      ? 'bg-blue-100/80 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600'
                                      : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                      {perm.label}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                      {perm.description}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                )}

                {/* 3. Account Activity Status */}
                <div>
                  <label className="block text-xs font-black text-slate-900 dark:text-white mb-2.5">
                    حالة تفعيل الحساب
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Active */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, isActive: true })}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        editingUser.isActive !== false
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/80 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">حساب نشط ومفعّل</span>
                        </div>
                        {editingUser.isActive !== false && (
                          <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        مسموح له بتسجيل الدخول والمشاركة والتفاعل الكامل.
                      </p>
                    </button>

                    {/* Inactive / Suspended */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, isActive: false })}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                        editingUser.isActive === false
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500/80 ring-2 ring-rose-500/20 shadow-xs'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">حساب معطل / محظور</span>
                        </div>
                        {editingUser.isActive === false && (
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        ممنوع من تسجيل الدخول أو إرسال أي توقعات جديدة.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Notice Alert */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    يتم تطبيق وحفظ التغييرات فوراً، وإلغاء الجلسات النشطة لفرض الصلاحيات المحدثة.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={isActionLoading}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-2xl transition-all text-xs sm:text-sm disabled:opacity-50 cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md disabled:opacity-60 cursor-pointer"
                  >
                    {isActionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري الحفظ...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>حفظ وتطبيق التغييرات</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
