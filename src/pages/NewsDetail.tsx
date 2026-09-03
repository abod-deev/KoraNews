import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Eye, Share2, ChevronRight, Loader2, Maximize2, X, ExternalLink, Tag, Newspaper, ArrowLeft, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchNewsById, fetchNews } from '../services/api';
import { useSEO } from '../hooks/useSEO';
import { trackNewsRead, trackNewsShare } from '../services/analytics';
import HomeSidebar from '../components/home/HomeSidebar';
import NewsCard from '../components/news/NewsCard';
import ToastModal from '../components/common/ToastModal';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<any>(null);
  const [relatedNews, setRelatedNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const loadNewsDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (!id) throw new Error('لم يتم تحديد معرف الخبر');

      const newsId = parseInt(id, 10);
      const data = await fetchNewsById(newsId);

      if (!data) {
        throw new Error('عذراً، لم نتمكن من العثور على هذا الخبر.');
      }

      setArticle(data);

      if (data?.title) {
        const catName = typeof data.category === 'object' && data.category !== null ? data.category.name : data.category;
        trackNewsRead(id, data.title, catName);
      }

      // Fetch related news
      const allNews = await fetchNews().catch(() => []);
      if (Array.isArray(allNews)) {
        const others = allNews.filter((n: any) => String(n.id) !== String(id));
        // Prefer same category
        const dataCatId = data.categoryId || (typeof data.category === 'object' && data.category !== null ? data.category.id : null);
        const dataCatName = typeof data.category === 'object' && data.category !== null ? data.category.name : data.category;
        const sameCategory = others.filter((n: any) => {
          const nCatId = n.categoryId || (typeof n.category === 'object' && n.category !== null ? n.category.id : null);
          const nCatName = typeof n.category === 'object' && n.category !== null ? n.category.name : n.category;
          return (dataCatId && nCatId === dataCatId) || (dataCatName && nCatName && nCatName === dataCatName);
        });
        const related = sameCategory.length >= 3 ? sameCategory : others;
        setRelatedNews(related.slice(0, 3));
      }
    } catch (err: any) {
      console.error('[NewsDetail] error:', err);
      setError(err.message || 'حدث خطأ أثناء تحميل تفاصيل الخبر.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewsDetail();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useSEO(article?.title || 'تفاصيل الخبر | KoraNews', article?.summary || article?.title);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse select-none pb-12">
        <div className="w-48 h-5 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="w-3/4 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="w-1/2 h-6 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="w-full h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        <div className="space-y-3">
          <div className="w-full h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-11/12 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="w-4/5 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  // Error / Not Found State
  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center select-none">
        <div className="p-4 rounded-3xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 mb-4">
          <Newspaper className="w-12 h-12" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
          الخبر غير موجود
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 font-bold">
          {error || 'عذراً، قد يكون الخبر قد تم حذفه أو أن الرابط غير صحيح.'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={loadNewsDetail}
            className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-slate-200 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
          <Link
            to="/news"
            className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm hover:bg-sky-700 transition-colors shadow-xs"
          >
            العودة لقائمة الأخبار
          </Link>
        </div>
      </div>
    );
  }

  const defaultImage = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200';
  const categoryName = typeof article?.category === 'object' && article?.category !== null
    ? (article.category.name || 'أخبار الرياضة')
    : (article?.category || article?.categoryName || 'أخبار الرياضة');
  const authorName = typeof article?.author === 'object' && article?.author !== null
    ? (article.author.name || 'محرر الرياضة')
    : (typeof article?.author === 'string' ? article.author : (article?.authorName || 'محرر الرياضة'));
  const authorAvatar = (typeof article?.author === 'object' && article?.author !== null && article.author.avatar)
    ? article.author.avatar
    : (typeof article?.authorAvatar === 'string' ? article.authorAvatar : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100');

  // Format content paragraphs
  const contentParagraphs = typeof article.content === 'string'
    ? article.content.split('\n\n').filter((p: string) => p.trim() !== '')
    : [article.content || ''];

  return (
    <div className="animate-in fade-in duration-500 pb-12 select-none">
      {/* 1. Breadcrumbs Header */}
      <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-4 sm:mb-6 overflow-x-auto no-scrollbar">
        <Link to="/" className="hover:text-sky-600 transition-colors shrink-0">الرئيسية</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <Link to="/news" className="hover:text-sky-600 transition-colors shrink-0">الأخبار</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-sky-600 dark:text-sky-400 font-black truncate max-w-[200px] sm:max-w-[350px]">
          {article.title}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Main Article Content */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-7 shadow-xs">
          
          {/* Category Badge & Title */}
          <div className="mb-4 sm:mb-6">
            <span className="inline-flex items-center gap-1.5 bg-sky-600/10 text-sky-600 dark:text-sky-400 text-xs font-black px-3 py-1 rounded-xl border border-sky-600/20 mb-3 shadow-2xs">
              <Tag className="w-3.5 h-3.5" />
              <span>{categoryName}</span>
            </span>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-slate-100 leading-snug sm:leading-tight mb-4">
              {article.title}
            </h1>

            {/* Author, Date, Views, Share */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4 border-y border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <img
                  loading="lazy"
                  src={authorAvatar}
                  alt={authorName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shadow-xs"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100';
                  }}
                />
                <div>
                  <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {authorName}
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2.5 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-500" />
                      <span>{new Date(article.createdAt || Date.now()).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </span>
                    {article.views !== undefined && (
                      <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{article.views} مشاهدة</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={() => {
                  trackNewsShare(article.id || id || '', article.title, navigator.share ? 'system_share' : 'clipboard_copy');
                  if (navigator.share) {
                    navigator.share({ title: article.title, url: window.location.href }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    setShowCopiedToast(true);
                  }
                }}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl font-black text-xs sm:text-sm transition-all border border-slate-200/60 dark:border-slate-700/60 cursor-pointer active:scale-95 shadow-2xs"
              >
                <Share2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>مشاركة الخبر</span>
              </button>
            </div>
          </div>

          {/* Hero Image */}
          {article.image && (
            <div className="mb-6 sm:mb-8 rounded-2xl overflow-hidden shadow-xs bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-800 relative group">
              <div
                onClick={() => setIsImageModalOpen(true)}
                className="cursor-zoom-in relative block"
                title="انقر لعرض الصورة بالحجم الكامل"
              >
                <img
                  loading="lazy"
                  src={article.image || defaultImage}
                  alt={article.title}
                  className="w-full h-auto max-h-[70vh] object-cover mx-auto block rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultImage;
                  }}
                />
                
                <div className="absolute bottom-3 left-3 bg-slate-950/70 hover:bg-slate-950/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>عرض بالحجم الكامل</span>
                </div>
              </div>
            </div>
          )}

          {/* Article Text Content (Mobile Reading Optimized Container) */}
          <article className="mb-8 sm:mb-10 text-slate-800 dark:text-slate-200 leading-relaxed sm:leading-loose font-medium text-base sm:text-lg max-w-none">
            {contentParagraphs.map((para: string, idx: number) => (
              <p key={idx} className="mb-4 sm:mb-6 text-justify">
                {para}
              </p>
            ))}
          </article>

          {/* Related News Grid Section */}
          {relatedNews.length > 0 && (
            <div className="pt-6 sm:pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Newspaper className="w-5 h-5 text-sky-600 shrink-0" />
                  <span>أخبار ذات صلة</span>
                </h3>
                <Link
                  to="/news"
                  className="text-xs font-extrabold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                >
                  <span>عرض المزيد</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {relatedNews.map((item) => (
                  <NewsCard key={item.id} article={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="sticky top-24">
            <HomeSidebar />
          </div>
        </div>
      </div>

      {/* Full-Screen Image Modal */}
      <AnimatePresence>
        {isImageModalOpen && article.image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsImageModalOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl flex items-center justify-between text-white mb-3"
            >
              <span className="text-xs sm:text-sm font-bold truncate max-w-[70%] opacity-90">
                {article.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={article.image}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl text-xs flex items-center gap-1 transition-colors"
                  title="فتح الصورة في تبويب جديد"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">فتح الأصل</span>
                </a>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-full max-h-[85vh] flex items-center justify-center overflow-auto rounded-xl"
            >
              <img loading="lazy"
                src={article.image}
                alt={article.title}
                className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Toast Notification */}
      <ToastModal
        isOpen={showCopiedToast}
        onClose={() => setShowCopiedToast(false)}
        title="تم نسخ الرابط بنجاح"
        message="تم نسخ رابط هذا الخبر للحافظة، يمكنك مشاركته مع أصدقائك الآن."
        type="success"
      />
    </div>
  );
}

