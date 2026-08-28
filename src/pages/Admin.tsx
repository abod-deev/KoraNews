import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { Shield, Plus, Edit2, Trash2, Loader2, LayoutDashboard, FileText, Users, Activity, Save, X, Search, CheckCircle, XCircle, Home, LogIn } from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';

export default function Admin() {
  useSEO('لوحة التحكم', 'إدارة الموقع والمحتوى');
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'users' | 'logs'>('overview');
  
  // Data States
  const [stats, setStats] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(''); // '', 'breaking', 'featured'
  const [filterStatus, setFilterStatus] = useState('');
  const [editingNews, setEditingNews] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

  // Custom Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: any | null }>({
    isOpen: false,
    item: null
  });

  const isAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin'));
  const isSuperAdmin = !!(user && user.role === 'superadmin');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } catch (e) {}
  };

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
      if (res.ok) setNews(await res.json());
    } catch (e) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
    } catch (e) {}
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchStats(), fetchNews(), isSuperAdmin ? fetchUsers() : Promise.resolve()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const showMsg = (type: 'success'|'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // --- Users Management ---
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
          isActive: editingUser.isActive,
          permissions: editingUser.permissions || []
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showMsg('success', 'تم تحديث المستخدم بنجاح');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ');
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- News Management ---
  const handleNewsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    setIsActionLoading(true);
    try {
      const isEdit = !!editingNews.id;
      const url = isEdit ? `/api/news/${editingNews.id}` : '/api/news';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editingNews)
      });
      
      if (!res.ok) throw new Error(await res.text());
      showMsg('success', isEdit ? 'تم تحديث الخبر بنجاح' : 'تم إضافة الخبر بنجاح');
      setEditingNews(null);
      fetchNews();
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteNews = (item: any) => {
    setDeleteModal({ isOpen: true, item });
  };

  const confirmDeleteNews = async () => {
    if (!deleteModal.item) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/news/${deleteModal.item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showMsg('success', 'تم حذف الخبر بنجاح');
        setDeleteModal({ isOpen: false, item: null });
        fetchNews();
      } else {
        throw new Error('فشل الحذف');
      }
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 dir-rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-brand" />
            لوحة الإدارة الشاملة
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-xs sm:text-sm">مرحباً، {user?.name || user?.displayName || user?.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 transition-colors shadow-xs"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-brand/10 border border-brand/20 flex items-center justify-center text-brand font-bold text-xs">
              {user?.avatar ? (
                <img src={user.avatar} alt="صورة الحساب" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">الملف الشخصي والصورة</span>
          </Link>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-2 font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 pb-4 mb-6 border-b border-gray-200 dark:border-gray-800 scrollbar-hide">
        {[
          { id: 'overview', icon: LayoutDashboard, label: 'نظرة عامة' },
          { id: 'news', icon: FileText, label: 'إدارة الأخبار' },
          ...(isSuperAdmin ? [{ id: 'users', icon: Users, label: 'إدارة المستخدمين والصلاحيات' }] : []),
          ...(isSuperAdmin ? [{ id: 'logs', icon: Activity, label: 'سجل العمليات' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-brand text-white' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-gray-500 dark:text-gray-400 font-bold mb-2">إجمالي الأخبار</div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.newsCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-emerald-500 font-bold mb-2">أخبار منشورة</div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.publishedCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-amber-500 font-bold mb-2">مسودات</div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.draftsCount}</div>
              </div>
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="text-brand font-bold mb-2">إجمالي المسؤولين</div>
                <div className="text-3xl font-extrabold text-gray-900 dark:text-white">{stats.adminsCount} <span className="text-sm font-normal text-gray-400">من {stats.usersCount} مستخدم</span></div>
              </div>
            </div>
          </div>
        )}

        {/* NEWS TAB */}
        {activeTab === 'news' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {editingNews ? (
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                
                <div className="flex justify-between items-center pb-4 mb-6 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand" />
                    {editingNews.id ? 'تعديل الخبر' : 'إضافة خبر جديد'}
                  </h2>
                  <button 
                    onClick={() => setEditingNews(null)} 
                    className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    إلغاء وعودة للجدول
                  </button>
                </div>

                <form onSubmit={handleNewsSave} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                      عنوان الخبر <span className="text-red-500">*</span>
                    </label>
                    <input 
                      required 
                      type="text" 
                      placeholder="أدخل عنوان الخبر هنا..."
                      value={editingNews.title || ''} 
                      onChange={e => setEditingNews({...editingNews, title: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all text-base font-bold text-gray-900 dark:text-white" 
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                      محتوى الخبر الكامل <span className="text-red-500">*</span>
                    </label>
                    <textarea 
                      required 
                      rows={8} 
                      placeholder="اكتب تفاصيل ومحتوى الخبر الكامل هنا..."
                      value={editingNews.content || ''} 
                      onChange={e => setEditingNews({...editingNews, content: e.target.value})} 
                      className="w-full p-3.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all leading-relaxed" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                        رابط الصورة <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(اختياري - نشر الخبر بدون صورة)</span>
                      </label>
                      <input 
                        type="url" 
                        placeholder="https://example.com/image.jpg"
                        value={editingNews.image || ''} 
                        onChange={e => setEditingNews({...editingNews, image: e.target.value})} 
                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all text-left dir-ltr" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">
                        حالة الخبر
                      </label>
                      <select 
                        required 
                        value={editingNews.status || 'published'} 
                        onChange={e => setEditingNews({...editingNews, status: e.target.value})} 
                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-brand focus:border-transparent outline-none transition-all font-medium text-gray-900 dark:text-white"
                      >
                        <option value="published">منشور فوراً</option>
                        <option value="draft">مسودة (غير ظاهر للجمهور)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-6 items-center bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editingNews.isBreaking || false} 
                        onChange={e => setEditingNews({...editingNews, isBreaking: e.target.checked})} 
                        className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-gray-300" 
                      />
                      <span className="font-extrabold text-red-600 dark:text-red-400 flex items-center gap-1">
                        🔴 تحديد كخبر عاجل
                      </span>
                    </label>

                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={editingNews.isFeatured || false} 
                        onChange={e => setEditingNews({...editingNews, isFeatured: e.target.checked})} 
                        className="w-5 h-5 rounded text-amber-500 focus:ring-amber-500 border-gray-300" 
                      />
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        ⭐ تحديد كخبر مميز
                      </span>
                    </label>
                  </div>

                  <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      type="button"
                      onClick={() => setEditingNews(null)}
                      className="px-5 py-2.5 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button 
                      type="submit" 
                      disabled={isActionLoading} 
                      className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-brand/90 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      حفظ ونشر الخبر
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 w-full">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="ابحث في الأخبار..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pr-10 pl-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                    </div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium">
                      <option value="">جميع الأنواع</option>
                      <option value="breaking">🔴 أخبار عاجلة فقط</option>
                      <option value="featured">⭐ أخبار مميزة فقط</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium">
                      <option value="">كل الحالات</option>
                      <option value="published">منشور</option>
                      <option value="draft">مسودة</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setEditingNews({ status: 'published', isFeatured: false, isBreaking: false, image: '' })} 
                    className="bg-brand text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap shadow-sm hover:bg-brand/90 transition-colors"
                  >
                    <Plus className="w-5 h-5" /> إضافة خبر
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 text-sm">
                        <th className="pb-3 font-bold">العنوان</th>
                        <th className="pb-3 font-bold">التصنيف والتمييز</th>
                        <th className="pb-3 font-bold">الحالة</th>
                        <th className="pb-3 font-bold">التاريخ</th>
                        <th className="pb-3 font-bold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {news.filter(n => {
                        const matchesQuery = n.title.includes(searchQuery);
                        const matchesStatus = filterStatus === "" || n.status === filterStatus;
                        const matchesType = filterType === "" || (filterType === "breaking" && n.isBreaking) || (filterType === "featured" && n.isFeatured);
                        return matchesQuery && matchesStatus && matchesType;
                      }).map(item => (
                        <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 font-bold max-w-xs truncate">{item.title}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.isBreaking && (
                                <span className="bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-300 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                                  🔴 عاجل
                                </span>
                              )}
                              {item.isFeatured && (
                                <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                                  ⭐ مميز
                                </span>
                              )}
                              {!item.isBreaking && !item.isFeatured && (
                                <span className="text-gray-400 text-xs font-semibold">خبر عادي</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${item.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
                              {item.status === 'published' ? 'منشور' : 'مسودة'}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-500">{new Date(item.createdAt).toLocaleDateString('ar-EG')}</td>
                          <td className="py-3 flex items-center gap-2">
                            <button onClick={() => setEditingNews(item)} className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-950 rounded-lg hover:bg-blue-100 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteNews(item)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-950 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && isSuperAdmin && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {editingUser ? (
               <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-extrabold">تعديل صلاحيات المستخدم ({editingUser.email})</h2>
                   <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                     <X className="w-5 h-5 text-gray-500" />
                   </button>
                 </div>

                 {editingUser.email === 'abod46071@gmail.com' && (
                   <div className="mb-6 p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 text-purple-800 dark:text-purple-300 text-sm font-bold flex items-center gap-3">
                     <Shield className="w-5 h-5 flex-shrink-0 text-purple-600" />
                     <span>حساب مالك النظام والمدير العام الرئيسي محمي بالكامل ولا يمكن خفض رتبته أو تعطيل صلاحياته.</span>
                   </div>
                 )}

                 <form onSubmit={handleUserUpdate} className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                       <label className="block text-sm font-bold mb-2">الدور / الرتبة</label>
                       <select 
                         disabled={editingUser.email === 'abod46071@gmail.com'}
                         value={editingUser.role || 'user'} 
                         onChange={e => setEditingUser({...editingUser, role: e.target.value})} 
                         className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed font-bold"
                       >
                         <option value="user">مستخدم عادي</option>
                         <option value="admin">مسؤول (Admin)</option>
                         <option value="superadmin">مالك (Super Admin)</option>
                       </select>
                     </div>
                     <div>
                       <label className="block text-sm font-bold mb-2">حالة الحساب</label>
                       <select 
                         disabled={editingUser.email === 'abod46071@gmail.com'}
                         value={String(editingUser.isActive)} 
                         onChange={e => setEditingUser({...editingUser, isActive: e.target.value === 'true'})} 
                         className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed font-bold"
                       >
                         <option value="true">مفعل (نشط)</option>
                         <option value="false">معطل (محظور)</option>
                       </select>
                     </div>
                   </div>
                   
                   {editingUser.role === 'admin' && (
                     <div>
                       <label className="block text-sm font-bold mb-3">الصلاحيات المخصصة</label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {[
                           { id: 'news_add', label: 'إضافة أخبار' },
                           { id: 'news_edit', label: 'تعديل الأخبار' },
                           { id: 'news_delete', label: 'حذف الأخبار' },
                           { id: 'matches_manage', label: 'إدارة المباريات' },
                         ].map(perm => (
                           <label key={perm.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                             <input 
                               type="checkbox" 
                               checked={(editingUser.permissions || []).includes(perm.id)}
                               onChange={(e) => {
                                 const newPerms = e.target.checked 
                                  ? [...(editingUser.permissions || []), perm.id]
                                  : (editingUser.permissions || []).filter((p: string) => p !== perm.id);
                                 setEditingUser({...editingUser, permissions: newPerms});
                               }}
                               className="w-5 h-5 rounded text-brand"
                             />
                             <span className="font-bold">{perm.label}</span>
                           </label>
                         ))}
                       </div>
                     </div>
                   )}
                   
                   <div className="pt-4 flex justify-end">
                     <button type="submit" disabled={isActionLoading} className="bg-brand text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
                       {isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                       حفظ التعديلات
                     </button>
                   </div>
                 </form>
               </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                        <th className="pb-3 font-bold">المستخدم</th>
                        <th className="pb-3 font-bold">البريد الإلكتروني</th>
                        <th className="pb-3 font-bold">الدور</th>
                        <th className="pb-3 font-bold">الحالة</th>
                        <th className="pb-3 font-bold">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="py-3 font-bold">
                            <div className="flex items-center gap-2">
                              <span>{u.name}</span>
                              {u.email === 'abod46071@gmail.com' && (
                                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                  المالك الرئيسي
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 font-mono text-sm">{u.email}</td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'superadmin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' : (u.role === 'admin' ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')}`}>
                              {u.role === 'superadmin' ? 'المالك العام' : (u.role === 'admin' ? 'مسؤول (أدمن)' : 'مستخدم')}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'}`}>
                              {u.isActive ? 'نشط' : 'معطل'}
                            </span>
                          </td>
                          <td className="py-3">
                            {u.email === 'abod46071@gmail.com' || u.role === 'superadmin' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80 px-2.5 py-1 rounded-lg">
                                <Shield className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                محمي
                              </span>
                            ) : (
                              <button 
                                onClick={() => setEditingUser(u)} 
                                className="p-1.5 rounded-lg transition-colors text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900"
                                title="تعديل الصلاحيات والرتبة"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* LOGS TAB */}
        {activeTab === 'logs' && isSuperAdmin && stats?.recentActivity && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {stats.recentActivity.map((log: any) => (
              <div key={log.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center gap-4">
                <div className={`p-3 rounded-xl ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-600' : (log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600')}`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">
                    قام <span className="text-brand">{log.user?.name}</span> بإجراء عملية <span className="font-extrabold">{log.action}</span> على <span className="font-extrabold">{log.entityType}</span> (#{log.entityId})
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{new Date(log.createdAt).toLocaleString('ar-EG')}</div>
                </div>
              </div>
            ))}
            {stats.recentActivity.length === 0 && (
              <div className="text-center py-10 text-gray-500 font-bold">لا يوجد نشاط مسجل حتى الآن.</div>
            )}
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={confirmDeleteNews}
        title="تأكيد حذف الخبر"
        message={`هل أنت متأكد من رغبتك في حذف الخبر "${deleteModal.item?.title || ''}"؟ هذا الإجراء نهائي ولا يمكن التراجع عنه.`}
        confirmText="نعم، قم بالحذف"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isActionLoading}
      />
    </div>
  );
}
