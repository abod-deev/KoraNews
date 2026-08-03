import React from "react";
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { fetchCategories, createCategory, createNews } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function Admin() {
  const { user, token, loading } = useAuth();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'news' | 'category'>('news');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    setMessage('');
    try {
      await createNews({
        title, excerpt, content, image, categoryId: parseInt(categoryId), isFeatured
      }, token);
      setMessage('تم إضافة الخبر بنجاح');
      setTitle(''); setExcerpt(''); setContent(''); setImage(''); setIsFeatured(false);
    } catch (err: any) {
      setMessage(err.message || 'حدث خطأ');
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
      setCatName(''); setCatSlug('');
    } catch (err: any) {
      setMessage(err.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">لوحة التحكم</h1>
        <div className="text-sm font-bold text-gray-500">أهلاً بك، {user.displayName}</div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button 
          onClick={() => setActiveTab('news')}
          className={`font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'news' ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          إضافة خبر
        </button>
        <button 
          onClick={() => setActiveTab('category')}
          className={`font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'category' ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
        >
          إضافة قسم
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-semibold text-center">
          {message}
        </div>
      )}

      {activeTab === 'news' && (
        <form onSubmit={handleCreateNews} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان الخبر</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">مقتطف (ملخص قصير)</label>
            <textarea required value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">المحتوى</label>
            <textarea required value={content} onChange={e => setContent(e.target.value)} rows={6} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">رابط الصورة</label>
            <input type="url" value={image} onChange={e => setImage(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">القسم</label>
              <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all">
                <option value="">اختر القسم</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-5 h-5 rounded text-brand focus:ring-brand" />
                <span className="font-bold text-gray-700 dark:text-gray-300">خبر مميز؟ (يظهر في الرئيسية)</span>
              </label>
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            نشر الخبر
          </button>
        </form>
      )}

      {activeTab === 'category' && (
        <form onSubmit={handleCreateCategory} className="space-y-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm max-w-lg mx-auto">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">اسم القسم</label>
            <input required type="text" value={catName} onChange={e => setCatName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">الرابط (Slug)</label>
            <input required type="text" value={catSlug} onChange={e => setCatSlug(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand outline-none transition-all" placeholder="e.g. saudi-league" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-brand text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            إضافة القسم
          </button>
        </form>
      )}
    </div>
  );
}
