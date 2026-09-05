import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Edit2, Trash2, Loader2, Search, Users, RefreshCw, 
  CheckCircle2, XCircle, ShieldCheck, UserCheck, UserX, AlertTriangle, X, Check, Lock, User
} from 'lucide-react';
import ConfirmModal from '../../common/ConfirmModal';

interface AdminUsersProps {
  token: string | null;
  showMsg: (type: 'success' | 'error', text: string) => void;
}

export default function AdminUsers({ token, showMsg }: AdminUsersProps) {
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
          permissions: editingUser.permissions
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل تحديث بيانات المستخدم');
      }
      showMsg('success', 'تم تحديث صلاحيات وحالة المستخدم بنجاح');
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
        setDeleteUserModal({ isOpen: false, user: null });
        if (editingUser?.id === deleteUserModal.user.id) setEditingUser(null);
        fetchUsers();
      } else {
        throw new Error('فشل حذف المستخدم من الخادم');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsActionLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin' || u.role === 'superadmin').length;
    const active = users.filter(u => u.isActive !== false).length;
    const inactive = users.filter(u => u.isActive === false).length;
    return { total, admins, active, inactive };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter || (statusFilter === 'active' ? u.isActive !== false : u.isActive === false);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>إدارة المستخدمين والصلاحيات</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            التحكم في أدوار المشرفين وحالات تنشيط أو تعطيل حسابات الأعضاء في النظام
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            title="تحديث قائمة الأعضاء"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 mb-1">إجمالي الحسابات</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">المشرفون والمسؤولون</div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.admins}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">الحسابات النشطة</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.active}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">الحسابات المعطلة</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.inactive}</div>
        </div>
      </div>

      {/* Users List Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        
        {/* Search & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-3">
          
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">جميع الأدوار</option>
            <option value="superadmin" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">المالك العام (Superadmin)</option>
            <option value="admin" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">مسؤول (Admin)</option>
            <option value="user" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">مستخدم عادي</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">جميع الحالات</option>
            <option value="active" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">نشط فقط</option>
            <option value="inactive" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">معطل فقط</option>
          </select>

        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">المستخدم</th>
                <th className="py-3.5 px-4">البريد الإلكتروني</th>
                <th className="py-3.5 px-4">الدور</th>
                <th className="py-3.5 px-4">الحالة</th>
                <th className="py-3.5 px-4 text-left">إجراءات</th>
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
                  const isProtected = u.email === 'abod46071@gmail.com' || u.role === 'superadmin';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-700">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.email === 'abod46071@gmail.com' && (
                                <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/80">
                                  المالك الرئيسي
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500 dark:text-slate-400" dir="ltr">
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {u.role === 'superadmin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                            <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>المالك العام</span>
                          </span>
                        ) : u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                            <ShieldCheck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            <span>مسؤول (أدمن)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                            <span>مستخدم</span>
                          </span>
                        )}
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
                        {isProtected ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                            <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>محمي</span>
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/50 rounded-lg transition-colors"
                              title="تعديل الصلاحية"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                              title="حذف المستخدم"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">جاري التحميل...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">لم يتم العثور على أي مستخدم</div>
          ) : (
            filteredUsers.map((u) => {
              const isProtected = u.email === 'abod46071@gmail.com' || u.role === 'superadmin';
              return (
                <div
                  key={u.id}
                  className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-black text-xs flex items-center justify-center border border-slate-200/80 dark:border-slate-600 shrink-0">
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{u.name}</span>
                          {u.email === 'abod46071@gmail.com' && (
                            <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[10px] font-black px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/80 shrink-0">
                              المالك
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" dir="ltr">
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {u.isActive !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                          <span>نشط</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400" />
                          <span>معطل</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <span className="text-slate-400 dark:text-slate-500 font-normal">الدور:</span>
                      {u.role === 'superadmin' ? (
                        <span className="text-purple-600 dark:text-purple-400 font-black">المالك العام</span>
                      ) : u.role === 'admin' ? (
                        <span className="text-blue-600 dark:text-blue-400 font-black">مسؤول (أدمن)</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">مستخدم</span>
                      )}
                    </span>

                    {isProtected ? (
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-600/60">محمي</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/60 rounded-lg transition-colors"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 rounded-lg transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* Delete User Modal */}
      <ConfirmModal
        isOpen={deleteUserModal.isOpen}
        onClose={() => setDeleteUserModal({ isOpen: false, user: null })}
        onConfirm={confirmDeleteUser}
        title="تأكيد حذف حساب المستخدم"
        message={`هل أنت متأكد من رغبتك في حذف حساب "${deleteUserModal.user?.name || deleteUserModal.user?.email || ''}" نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الحساب"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* Dedicated Edit User Permissions & Role Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dir-rtl">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={isActionLoading ? undefined : () => setEditingUser(null)}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            />

            {/* Modal Dialog Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 z-10 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setEditingUser(null)}
                disabled={isActionLoading}
                className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                title="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-800 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/80 dark:border-blue-800/60 font-black text-lg shrink-0">
                  {editingUser.name ? editingUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                      {editingUser.name || 'مستخدم بدون اسم'}
                    </h2>
                    {editingUser.email === 'abod46071@gmail.com' && (
                      <span className="bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800/80">
                        المالك الرئيسي
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate" dir="ltr">
                    {editingUser.email}
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleUserUpdate} className="space-y-6">
                
                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2.5">
                    مستوى الصلاحية (الدور في النظام)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Standard User Card */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'user' })}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                        editingUser.role !== 'admin' && editingUser.role !== 'superadmin'
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">مستخدم عادي</span>
                        </div>
                        {editingUser.role !== 'admin' && editingUser.role !== 'superadmin' && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        المشاركة في مسابقات التوقعات، متابعة النتائج، والتعليق.
                      </p>
                    </button>

                    {/* Admin Card */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, role: 'admin' })}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2 ${
                        editingUser.role === 'admin'
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500/80 ring-2 ring-blue-500/20'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">مسؤول (Admin)</span>
                        </div>
                        {editingUser.role === 'admin' && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        إدارة المحتوى والمباريات، تأكيد نتائج التوقعات وتوزيع النقاط.
                      </p>
                    </button>
                  </div>

                  {editingUser.role === 'superadmin' && (
                    <div className="mt-2.5 p-3 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/60 flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300">
                      <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>صلاحية المالك العام (Superadmin) مثبتة ومحمية برمجياً.</span>
                    </div>
                  )}
                </div>

                {/* Account Activity Status */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2.5">
                    حالة الحساب
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Active */}
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, isActive: true })}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        editingUser.isActive !== false
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/80 ring-2 ring-emerald-500/20'
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
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-1.5 ${
                        editingUser.isActive === false
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500/80 ring-2 ring-rose-500/20'
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
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    تنعكس التغييرات فور حفظها على جلسة المستخدم وتحدد إمكانية وصوله لأدوات لوحة التحكم.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={isActionLoading}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-xs sm:text-sm disabled:opacity-50"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    disabled={isActionLoading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md disabled:opacity-60"
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

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
