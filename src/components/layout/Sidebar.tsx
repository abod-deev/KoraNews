import { Link, useLocation } from 'react-router-dom';
import { Home, Newspaper, Calendar, Settings, Tag, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { fetchCategories } from '../../services/api';

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const canAccessAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));

  const navItems = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'جميع الأخبار', path: '/news', icon: Newspaper },
    { name: 'مباريات اليوم', path: '/matches', icon: Calendar },
  ];

  useEffect(() => {
    fetchCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        setCategories(cats);
      }
    }).catch(() => {});
  }, []);

  const activeCategoryParam = new URLSearchParams(location.search).get('category');

  return (
    <aside className="hidden lg:block w-64 shrink-0 p-6 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="sticky top-24 space-y-6">
        <div>
          <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            الأقسام الرئيسية
          </h3>
          <ul className="space-y-1.5">
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      isExactActive
                        ? 'bg-brand text-white shadow-sm shadow-brand/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-brand dark:hover:text-brand'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isExactActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {categories.length > 0 && (
          <div>
            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>تصنيفات الأخبار</span>
              <span className="text-[10px] text-gray-400">{categories.length}</span>
            </h3>
            <ul className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isActive =
                  location.pathname === '/news' &&
                  (activeCategoryParam === cat.slug || activeCategoryParam === String(cat.id));

                return (
                  <li key={cat.id}>
                    <Link
                      to={`/news?category=${cat.slug || cat.id}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                        isActive
                          ? 'bg-brand text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-brand'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Tag className="w-3 h-3 opacity-60" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <ChevronLeft className="w-3 h-3 opacity-50" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {canAccessAdmin && (
          <div>
            <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
              الإدارة
            </h3>
            <ul className="space-y-1.5">
              <li>
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-brand text-white shadow-sm shadow-brand/20'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-brand dark:hover:text-brand'
                  }`}
                >
                  <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
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
