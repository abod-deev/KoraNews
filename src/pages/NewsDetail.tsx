import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clock, Eye, Share2, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchNewsById } from '../services/api';
import { useSEO } from '../hooks/useSEO';
import HomeSidebar from '../components/home/HomeSidebar';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNewsDetail = async () => {
      try {
        setIsLoading(true);
        if (!id) throw new Error('لا يوجد معرف للخبر');
        const data = await fetchNewsById(parseInt(id));
        setArticle(data);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء جلب تفاصيل الخبر');
      } finally {
        setIsLoading(false);
      }
    };
    loadNewsDetail();
  }, [id]);

  useSEO(article?.title || 'تفاصيل الخبر', article?.excerpt);

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">الخبر غير موجود</h2>
        <p className="text-gray-500 mb-6">{error || 'عذراً، لم نتمكن من العثور على الخبر الذي تبحث عنه.'}</p>
        <Link to="/news" className="bg-brand text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition-colors">
          العودة للأخبار
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-6">
        <Link to="/" className="hover:text-brand transition-colors">الرئيسية</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to="/news" className="hover:text-brand transition-colors">الأخبار</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-brand truncate max-w-[200px] sm:max-w-[400px]">{article.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          {/* Article Header */}
          <div className="mb-6">
            <span className="bg-brand/10 text-brand text-sm font-bold px-3 py-1 rounded-md mb-4 inline-block">
              {article.category?.name || 'أخبار'}
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight mb-4">
              {article.title}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
              {article.excerpt}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <img loading="lazy" 
                  src={article.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100'} 
                  alt={article.author?.name || 'كاتب'} 
                  className="w-11 h-11 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700 shadow-sm" 
                />
                <div>
                  <div className="font-bold text-gray-900 dark:text-white">{article.author?.name || 'محرر'}</div>
                  <div className="text-xs text-gray-500 font-semibold flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {new Date(article.createdAt).toLocaleDateString('ar-EG')}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {article.views} قراءة</span>
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg font-bold text-sm transition-colors border border-gray-200 dark:border-gray-700">
                <Share2 className="w-4 h-4" /> مشاركة
              </button>
            </div>
          </div>

          {/* Article Image */}
          {article.image && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-8 rounded-2xl overflow-hidden shadow-sm relative group"
            >
              <img loading="lazy" 
                src={article.image} 
                alt={article.title} 
                className="w-full h-[350px] sm:h-[450px] object-cover group-hover:scale-105 transition-transform duration-700" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 to-transparent"></div>
            </motion.div>
          )}

          {/* Article Content */}
          <div className="mb-12 text-gray-700 dark:text-gray-300 leading-loose font-medium text-lg whitespace-pre-wrap">
            {article.content}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-24">
            <HomeSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
