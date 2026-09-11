import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Plus, Search, Loader2, Save, Trash2, Edit2, X, RefreshCw,
  Flame, Star, CheckCircle, Clock, Eye, AlertCircle, Image as ImageIcon,
  Tag, Filter
} from 'lucide-react';
import ConfirmModal from '../../common/ConfirmModal';

interface AdminNewsProps {
  token: string | null;
  showMsg: (type: 'success' | 'error', text: string) => void;
}

export default function AdminNews({ token, showMsg }: AdminNewsProps) {
  const [news, setNews] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [editingNews, setEditingNews] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/news');
      if (res.ok) setNews(await res.json());
    } catch (e) {
      console.error('Failed to fetch news', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategoriesList = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch categories', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchCategoriesList();
  }, [token]);

  const handleStartAddNews = () => {
    setEditingNews({
      title: '',
      content: '',
      image: '',
      status: 'published',
      isFeatured: false,
      isBreaking: false,
      categoryId: categories[0]?.id || '',
    });
  };

  const handleStartEditNews = (item: any) => {
    let catId: any = item.categoryId || item.category?.id || '';
    if (!catId && item.categoryName && categories.length > 0) {
      const found = categories.find((c: any) => c.name === item.categoryName);
      if (found) catId = found.id;
    }
    setEditingNews({ ...item, categoryId: catId ? Number(catId) : '' });
  };

  const handleNewsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    setIsActionLoading(true);
    try {
      const isEdit = !!editingNews.id;
      const res = await fetch(isEdit ? `/api/news/${editingNews.id}` : '/api/news', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: editingNews.title,
          content: editingNews.content,
          image: editingNews.image || '',
          isFeatured: !!editingNews.isFeatured,
          isBreaking: !!editingNews.isBreaking,
          status: editingNews.status || 'published',
          categoryId: editingNews.categoryId ? Number(editingNews.categoryId) : null,
        })
      });
      if (!res.ok) throw new Error(await res.text());
      showMsg('success', isEdit ? 'تم تحديث الخبر بنجاح' : 'تم نشر الخبر الجديد بنجاح');
      setEditingNews(null);
      fetchNews();
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ أثناء حفظ الخبر');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteNews = (item: any) => setDeleteModal({ isOpen: true, item });

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
        throw new Error('فشل حذف الخبر من السيرفر');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getCategoryName = (item: any) => {
    if (item.category?.name) return item.category.name;
    if (item.categoryName) return item.categoryName;
    if (item.categoryId && categories.length > 0) {
      const cat = categories.find((c: any) => c.id === item.categoryId);
      if (cat) return cat.name;
    }
    return 'عام';
  };

  // KPI calculations
  const stats = useMemo(() => {
    const total = news.length;
    const published = news.filter(n => n.status === 'published').length;
    const drafts = news.filter(n => n.status === 'draft').length;
    const breaking = news.filter(n => n.isBreaking).length;
    const featured = news.filter(n => n.isFeatured).length;
    return { total, published, drafts, breaking, featured };
  }, [news]);

  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.title && item.title.toLowerCase().includes(q)) || 
        (item.content && item.content.toLowerCase().includes(q));
      
      let matchesType = true;
      if (filterType === 'breaking') matchesType = !!item.isBreaking;
      if (filterType === 'featured') matchesType = !!item.isFeatured;

      const matchesStatus = filterStatus ? item.status === filterStatus : true;
      
      const itemCatId = item.categoryId || item.category?.id;
      const matchesCategory = filterCategory ? String(itemCatId) === String(filterCategory) : true;

      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });
  }, [news, searchQuery, filterType, filterStatus, filterCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Section Summary & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>إدارة المحتوى الإخباري</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تحرير ونشر المقالات الرياضية، إدارة الأخبار العاجلة والمميزة، وتصنيف المحتوى
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNews}
            disabled={isLoading}
            className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          
          <button
            onClick={handleStartAddNews}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-xs sm:text-sm shadow-xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة خبر جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 mb-0.5">إجمالي المقالات</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">المقالات المنشورة</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.published}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-0.5">أخبار عاجلة</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400">{stats.breaking}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">أخبار مميزة (سلايدر)</div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.featured}</div>
        </div>
      </div>

      {/* Main View: Add/Edit Form OR News Table */}
      {editingNews ? (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
                {editingNews.id ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {editingNews.id ? 'تعديل بيانات الخبر' : 'تحرير خبر جديد'}
                </h2>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  يرجى تعبئة الحقول المطلوبة والتأكد من جودة صياغة العنوان والتفاصيل
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditingNews(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleNewsSave} className="space-y-6">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                عنوان الخبر <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                value={editingNews.title}
                onChange={e => setEditingNews({ ...editingNews, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400"
                placeholder="اكتب عنواناً صحفياً دقيقاً ومباشراً..."
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                تفاصيل ومحتوى الخبر <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={6}
                value={editingNews.content}
                onChange={e => setEditingNews({ ...editingNews, content: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-y placeholder:text-slate-400 leading-relaxed"
                placeholder="اكتب تفاصيل الخبر كاملة هنا..."
              />
            </div>

            {/* Image URL & Image Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  رابط صورة الخبر (URL)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={editingNews.image}
                    onChange={e => setEditingNews({ ...editingNews, image: e.target.value })}
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all placeholder:text-slate-400"
                    placeholder="https://images.unsplash.com/..."
                    dir="ltr"
                  />
                  <ImageIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  يفضل استخدام صور عالية الجودة بنسبة عرض 16:9
                </span>
              </div>

              {/* Mini Preview Box */}
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  معاينة الصورة
                </label>
                <div className="w-full h-[50px] sm:h-[48px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center overflow-hidden">
                  {editingNews.image ? (
                    <img
                      src={editingNews.image}
                      alt="معاينة"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">لا توجد صورة</span>
                  )}
                </div>
              </div>
            </div>

            {/* Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  التصنيف الرياضي
                </label>
                <select
                  value={editingNews.categoryId || ''}
                  onChange={e => setEditingNews({ ...editingNews, categoryId: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">-- بدون تصنيف مخصص (عام) --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  حالة النشر
                </label>
                <select
                  value={editingNews.status || 'published'}
                  onChange={e => setEditingNews({ ...editingNews, status: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="published">منشور للجمهور مباشرة</option>
                  <option value="draft">مسودة خاصة (غير معروض)</option>
                </select>
              </div>
            </div>

            {/* Feature Flags / Badges Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-wrap gap-6">
              
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editingNews.isBreaking}
                  onChange={e => setEditingNews({ ...editingNews, isBreaking: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    خبر عاجل (يظهر في الشريط الإخباري العاجل)
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!editingNews.isFeatured}
                  onChange={e => setEditingNews({ ...editingNews, isFeatured: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    خبر مميز (يبرز في السلايدر الرئيسي للموقع)
                  </span>
                </div>
              </label>

            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isActionLoading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-xs disabled:opacity-60 active:scale-98"
              >
                {isActionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingNews.id ? 'حفظ التعديلات' : 'نشر الخبر'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setEditingNews(null)}
                disabled={isActionLoading}
                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all text-sm"
              >
                إلغاء
              </button>
            </div>

          </form>

        </div>
      ) : (
        /* News List Table & Filtering */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          
          {/* Filters Strip */}
          <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-2.5 sm:gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث في عناوين وتفاصيل الأخبار..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">جميع حالات النشر</option>
              <option value="published">منشور فقط</option>
              <option value="draft">مسودة فقط</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">جميع التصنيفات الخاصة</option>
              <option value="breaking">أخبار عاجلة فقط</option>
              <option value="featured">أخبار مميزة فقط</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">جميع الأقسام الرياضية</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[11px] font-black uppercase text-slate-400">
                  <th className="py-3.5 px-4">الخبر</th>
                  <th className="py-3.5 px-4 hidden sm:table-cell">القسم</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">الحالة</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">تاريخ الإضافة</th>
                  <th className="py-3.5 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                        <span className="text-xs text-slate-400 font-bold">جاري تحميل قائمة الأخبار...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredNews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">لم يتم العثور على أي أخبار</div>
                        <div className="text-xs text-slate-400">
                          {searchQuery || filterStatus || filterType || filterCategory
                            ? 'جرّب تعديل معايير البحث أو الفلترة أعلاه.'
                            : 'ابدأ بإضافة أول خبر صحفي بالضغط على "إضافة خبر جديد".'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredNews.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                      
                      {/* Title & Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="w-12 h-10 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/60 dark:border-slate-800">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.title}
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {item.isBreaking && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
                                  <Flame className="w-2.5 h-2.5" /> عاجل
                                </span>
                              )}
                              {item.isFeatured && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                  <Star className="w-2.5 h-2.5" /> مميز
                                </span>
                              )}
                              <span className="sm:hidden text-[11px] font-bold text-slate-400">
                                {getCategoryName(item)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Tag className="w-3 h-3 text-slate-400" />
                          <span>{getCategoryName(item)}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        {item.status === 'published' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>منشور</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>مسودة</span>
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 hidden lg:table-cell text-xs font-medium text-slate-500 dark:text-slate-400">
                        {item.createdAt ? (
                          new Date(item.createdAt).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : '—'}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEditNews(item)}
                            className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="تعديل الخبر"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNews(item)}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="حذف الخبر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          {!isLoading && filteredNews.length > 0 && (
            <div className="p-3.5 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 text-left px-5">
              عرض {filteredNews.length} من أصل {news.length} خبر
            </div>
          )}

        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, item: null })}
        onConfirm={confirmDeleteNews}
        title="تأكيد حذف الخبر"
        message={`هل أنت متأكد من رغبتك في حذف خبر "${deleteModal.item?.title || ''}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmText="نعم، احذف الخبر"
        cancelText="إلغاء"
        variant="danger"
        isLoading={isActionLoading}
      />

    </div>
  );
}
