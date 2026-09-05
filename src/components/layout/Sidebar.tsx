import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, Calendar, Settings, Tag, ChevronLeft, Trophy, Award, Medal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { fetchCategories } from '../../services/api';
import { checkIsAdmin } from '../../utils/authHelpers';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<{ id: string, name: string, slug?: string }[]>([]);
  const [categoriesError, setCategoriesError] = useState(false);
  const canAccessAdmin = checkIsAdmin(user);

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'جميع الأخبار', path: '/news', icon: Newspaper },
    { name: 'مباريات اليوم', path: '/matches', icon: Calendar },
  ];

  const predictionItems = [
    { name: 'توقعات المباريات', path: '/predictions', icon: Trophy },
    { name: 'ترتيب التوقعات', path: '/predictions/leaderboard', icon: Award },
    { name: 'الترتيب الذهبي', path: '/predictions/golden', icon: Medal },
  ];

  const fetchCats = () => {
    setCategoriesError(false);
    fetchCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    }).catch((err) => {
      console.error('Failed to fetch categories:', err);
      setCategoriesError(true);
    });
  };

  useEffect(() => {
    let isMounted = true;
    setCategoriesError(false);
    fetchCategories().then((cats) => {
      if (isMounted && Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    }).catch((err) => {
      if (isMounted) {
        console.error('Failed to fetch categories:', err);
        setCategoriesError(true);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const activeCategoryParam = new URLSearchParams(location.search).get('category');

  return (
    <aside className="hidden lg:block w-60 xl:w-64 shrink-0 p-5 border-l border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 select-none">
      <div className="sticky top-20 space-y-6">
        {/* Group 1: Main Sections */}
        <div>
          <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-2">
            الأقسام الرئيسية
          </h3>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isExactActive =
                item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname === item.path && !activeCategoryParam;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-150 ${
                      isExactActive
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-sky-600 dark:hover:text-sky-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isExactActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Group 2: Predictions & Contests */}
        <div>
          <h3 className="text-[11px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-2.5 px-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            <span>مسابقة التوقعات</span>
          </h3>
          <ul className="space-y-1">
            {predictionItems.map((item) => {
              const Icon = item.icon;
              const isExactActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all duration-150 ${
                      isExactActive
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:text-amber-600 dark:hover:text-amber-400'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isExactActive ? 'text-white' : 'text-amber-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        
        {/* Group 3: News Categories */}
        {categoriesError ? (
          <div>
            <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-2">
              تصنيفات الأخبار
            </h3>
            <div className="px-2 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center border border-red-100 dark:border-red-900/30">
              <p>فشل تحميل التصنيفات</p>
              <button onClick={fetchCats} className="mt-2 text-[10px] bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 px-3 py-1.5 rounded-lg transition-colors">
                إعادة المحاولة
              </button>
            </div>
          </div>
        ) : categories.length > 0 && (
          <div>
            <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-2 flex items-center justify-between">
              <span>تصنيفات الأخبار</span>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-md font-extrabold">{categories.length}</span>
            </h3>
            <ul className="space-y-1 max-h-52 overflow-y-auto pr-1 scrollbar-hide">
              {categories.map((cat) => {
                const isActive =
                  location.pathname === '/news' &&
                  (activeCategoryParam === cat.slug || activeCategoryParam === String(cat.id));

                return (
                  <li key={cat.id}>
                    <Link
                      to={`/news?category=${cat.slug || cat.id}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl font-extrabold text-xs transition-all ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-sky-600 dark:hover:text-sky-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Group 4: Admin */}
        {canAccessAdmin && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 px-2">
              الإدارة
            </h3>
            <ul className="space-y-1">
              <li>
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-sky-600 dark:hover:text-sky-400'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span>لوحة التحكم</span>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}

