import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { fetchCategories, createCategory, createNews, fetchNews, updateNews, deleteNews } from '../services/api';
import { Loader2, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

export default function Admin() {
  const { user, token, loading } = useAuth();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'news' | 'category'>('news');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // News Form
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');

  const loadData = () => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchNews().then(setNewsList).catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const resetNewsForm = () => {
    setTitle('');
    setExcerpt('');
    setContent('');
    setImage('');
    setCategoryId('');
    setIsFeatured(false);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleStartEdit = (article: any) => {
    setIsEditMode(true);
    setEditingId(article.id);
    setTitle(article.title || '');
    setExcerpt(article.excerpt || '');
    setContent(article.content || '');
    setImage(article.image || '');
    setCategoryId(article.categoryId ? String(article.categoryId) : '');
    setIsFeatured(!!article.isFeatured);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setMessage('');
    try {
      const payload = {
        title,
        excerpt,
        content,
        image,
        categoryId: categoryId ? parseInt(categoryId) : (categories[0]?.id || 1),
        isFeatured,
      };

      if (isEditMode && editingId) {
        await updateNews(editingId, payload, token);
        setMessage('تم تعديل الخبر بنجاح');
      } else {
        await createNews(payload, token);
        setMessage('تم إضافة الخبر بنجاح');
      }

      resetNewsForm();
      loadData();
    } catch (err: any) {
      setMessage(err.message || 'حدث خطأ أثناء حفظ الخبر');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNews = async (id: number) => {
    if (!token) return;
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا الخبر؟')) return;
    
    setIsLoading(true);
    try {
      await deleteNews(id, token);
      setMessage('تم حذف الخبر بنجاح');
      if (editingId === id) resetNewsForm();
      loadData();
    } catch (err: any) {
      setMessage(err.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setMessage('');
    try {
      const newCat = await createCategory({ name: catName, slug: catSlug }, token);
      setCategories([...categories, newCat]);
      setMessage('تم إضافة القسم بنجاح');
      setCatName('');
      setCatSlug('');
    } catch (err: any) {
      setMessage(err.message || 'حدث خطأ أثناء إضافة القسم');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">لوحة تحكم الأخبار</h1>
          <p className="text-gray-500 text-sm mt-1">إدارة الأخبار والتصنيفات في الموقع</p>
        </div>
        <div className="text-sm font-bold bg-brand/10 text-brand px-4 py-2 rounded-xl self-start sm:self-auto">
          المسؤول: {user.displayName || user.email}
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button 
          onClick={() => setActiveTab('news')}
          className={`font-bold px-5 py-2.5 rounded-xl transition-all ${activeTab === 'news' ? 'bg-brand text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
        >
          إدارة الأخبار
        </button>
        <button 
          onClick={() => setActiveTab('category')}
          className={`font-bold px-5 py-2.5 rounded-xl transition-all ${activeTab === 'category' ? 'bg-brand text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
        >
          إضافة قسم جديد
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          {message}
        </div>
      )}

      {activeTab === 'news' && (
        <div className="space-y-8">
          {/* Form */}
          <form onSubmit={handleSaveNews} className="space-y-5 bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                {isEditMode ? <Edit2 className="w-5 h-5 text-brand" /> : <Plus className="w-5 h-5 text-brand" />}
                {isEditMode ? 'تعديل خبر قائم' : 'إضافة خبر جديد (يدوياً)'}
              </h2>
              {isEditMode && (
                <button
                  type="button"
                  onClick={resetNewsForm}
                  className="text-xs font-bold text-red-500 hover:underline flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان الخبر *</label>
              <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوان الخبر..." className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">المقتطف (ملخص قصير) *</label>
              <textarea required value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} placeholder="ملخص قصير للخبر يظهر في الكروت والبطاقات..." className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">تفاصيل الخبر كاملة *</label>
              <textarea required value={content} onChange={e => setContent(e.target.value)} rows={6} placeholder="اكتب نص الخبر التفصيلي هنا..." className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all"></textarea>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">رابط صورة الخبر (URL)</label>
              <input type="url" value={image} onChange={e => setImage(e.target.value)} placeholder="https://images.unsplash.com/..." className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">القسم / التصنيف *</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all">
                  <option value="">اختر القسم (مثال: محلي / عالمي)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-5 h-5 rounded text-brand focus:ring-brand" />
                  <span className="font-bold text-gray-700 dark:text-gray-300">خبر مميز (يظهر في الهيرو بالصفحة الرئيسية)</span>
                </label>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="w-full bg-brand text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm">
              {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isEditMode ? 'حفظ التعديلات' : 'نشر الخبر في الموقع'}
            </button>
          </form>

          {/* List of News */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-4">قائمة الأخبار المنشورة ({newsList.length})</h3>
            
            {newsList.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">لا توجد أخبار منشورة حالياً.</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {newsList.map(item => (
                  <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-start">
                      {item.image && (
                        <img src={item.image} alt={item.title} className="w-16 h-12 object-cover rounded-lg flex-shrink-0" />
                      )}
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{item.title}</h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>القسم: {item.category?.name || 'عام'}</span>
                          <span>•</span>
                          <span>{new Date(item.createdAt).toLocaleDateString('ar-EG')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-brand bg-brand/10 hover:bg-brand hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        تعديل
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'category' && (
        <form onSubmit={handleCreateCategory} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm max-w-lg mx-auto">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">إضافة تصنيف جديد للأخبار</h2>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">اسم التصنيف (مثال: أخبار محلية)</label>
            <input required type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الرابط اللطيف (Slug)</label>
            <input required type="text" value={catSlug} onChange={e => setCatSlug(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" placeholder="e.g. local-news" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            حفظ التصنيف
          </button>
        </form>
      )}
    </div>
  );
}
