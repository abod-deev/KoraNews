import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, RefreshCw, XCircle, Sparkles, Filter, Newspaper } from 'lucide-react';
import NewsCard from '../components/news/NewsCard';
import BreakingNews from '../components/home/BreakingNews';
import { fetchNews, fetchCategories } from '../services/api';
import { useSEO } from '../hooks/useSEO';

const STATIC_CATEGORIES = [
  { id: 'all', name: 'الكل' },
  { id: 'la_liga', name: 'الدوري الإسباني' },
  { id: 'premier_league', name: 'الدوري الإنجليزي' },
  { id: 'champions_league', name: 'دوري أبطال أوروبا' },
  { id: 'saudi_pro', name: 'الدوري السعودي' },
  { id: 'transfers', name: 'انتقالات' },
  { id: 'world_football', name: 'الكرة العالمية' },
];

export default function News() {
  useSEO('أخبار الرياضة | KoraNews', 'أحدث وأهم أخبار كرة القدم العالمية والمحلية، انتقالات اللاعبين ونتائج المباريات الحصرية.');

  const [allNews, setAllNews] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>(STATIC_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState(9);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsInitialLoading(true);
      setError(null);
      const [newsData, catData] = await Promise.all([
        fetchNews(),
        fetchCategories().catch(() => []),
      ]);

      setAllNews(Array.isArray(newsData) ? newsData : []);

      if (Array.isArray(catData) && catData.length > 0) {
        const mapped = [
          { id: 'all', name: 'الكل' },
          ...catData.map((c: any) => ({
            id: c.slug || c.name,
            name: c.name,
          })),
        ];
        // Deduplicate
        const unique = mapped.filter((item, index, self) =>
          index === self.findIndex((t) => t.name === item.name)
        );
        setCategories(unique);
      }
    } catch (err: any) {
      console.error('[News page] fetch error:', err);
      setError('تعذر تحميل الأخبار حالياً. يرجى التحقق من الاتصال بالإنترنت.');
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter news based on active category & search query
  const filteredNews = useMemo(() => {
    return allNews.filter((article) => {
      // Category match
      let matchesCat = true;
      if (selectedCategory !== 'all') {
        const catObj = categories.find((c) => c.id === selectedCategory);
        const catName = catObj ? catObj.name.toLowerCase() : selectedCategory.toLowerCase();
        const articleCat = (article.category || '').toLowerCase();
        matchesCat =
          articleCat.includes(catName) ||
          catName.includes(articleCat) ||
          (article.tags && article.tags.some((t: string) => t.toLowerCase().includes(catName)));
      }

      // Search match
      let matchesSearch = true;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.trim().toLowerCase();
        const titleMatch = (article.title || '').toLowerCase().includes(query);
        const summaryMatch = (article.summary || article.content || '').toLowerCase().includes(query);
        const authorMatch = (article.author?.name || '').toLowerCase().includes(query);
        matchesSearch = titleMatch || summaryMatch || authorMatch;
      }

      return matchesCat && matchesSearch;
    });
  }, [allNews, selectedCategory, searchQuery, categories]);

  const featuredNews = useMemo(() => {
    return filteredNews.filter((n) => n.isFeatured);
  }, [filteredNews]);

  const standardNews = useMemo(() => {
    return filteredNews.filter((n) => !n.isFeatured);
  }, [filteredNews]);

  const loadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 6);
      setIsLoadingMore(false);
    }, 350);
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setVisibleCount(9);
  };

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-5 sm:space-y-7 pb-8 select-none">
      {/* 1. Breaking News Ticker */}
      <BreakingNews />

      {/* 2. Header & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-5">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Newspaper className="w-6 h-6 sm:w-8 sm:h-8 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>أخبار كرة القدم والتغطيات اليومية</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              تصفح أحدث التقارير والمقابلات ونتائج البطولات العالمية والمحلية
            </p>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن خبر أو فريق..."
              className="w-full pl-9 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Pills Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          <span className="text-xs font-black text-slate-400 flex items-center gap-1 shrink-0 ml-1">
            <Filter className="w-3.5 h-3.5" />
            <span>التصنيف:</span>
          </span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setVisibleCount(9);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Main Content States */}
      {isInitialLoading ? (
        /* Loading Skeletons Grid */
        <div className="space-y-6">
          <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-3xl p-8 text-center text-rose-600 dark:text-rose-400 my-6">
          <XCircle className="w-10 h-10 mx-auto mb-3 opacity-90" />
          <h3 className="text-base sm:text-lg font-black mb-1">عذراً، حدث خطأ</h3>
          <p className="text-xs sm:text-sm font-bold opacity-80 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white font-extrabold text-xs sm:text-sm shadow-md hover:bg-rose-700 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : filteredNews.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-10 text-center shadow-xs">
          <Newspaper className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-200 mb-1">
            لا توجد أخبار تطابق البحث والتحديد الحالي
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mb-5 max-w-md mx-auto">
            جرب البحث بكلمة مفتاحية مختلفة أو اختر تصنيفاً آخر لمشاهدة باقي الأخبار المنشورة.
          </p>
          {(searchQuery || selectedCategory !== 'all') && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-extrabold text-xs sm:text-sm shadow-xs hover:bg-sky-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة ضبط التصفية</span>
            </button>
          )}
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-6 sm:space-y-8">
          {/* Featured Highlight Section if available */}
          {featuredNews.length > 0 && !searchQuery && selectedCategory === 'all' && (
            <section>
              <div className="flex items-center gap-2 mb-3.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100">
                  الأخبار المميزة
                </h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {featuredNews.slice(0, 2).map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                  >
                    <NewsCard article={article} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Standard News Grid */}
          <section>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-slate-100 border-r-4 border-sky-600 pr-3">
                {selectedCategory !== 'all'
                  ? `أخبار ${categories.find((c) => c.id === selectedCategory)?.name || ''}`
                  : searchQuery
                  ? `نتائج البحث عن "${searchQuery}"`
                  : 'جميع الأخبار والتقارير'}
              </h2>
              <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {filteredNews.length} خبر
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredNews.slice(0, visibleCount).map((article, idx) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (idx % 6) * 0.05 }}
                >
                  <NewsCard article={article} />
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            {visibleCount < filteredNews.length && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-600 dark:hover:border-sky-500 text-slate-800 dark:text-slate-200 hover:text-sky-600 font-black py-3 px-8 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 mx-auto shadow-2xs cursor-pointer text-xs sm:text-sm"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin text-sky-600" />}
                  <span>{isLoadingMore ? 'جاري التحميل...' : 'عرض المزيد من الأخبار'}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

