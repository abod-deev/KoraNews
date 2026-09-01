import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, Newspaper, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const canAccessAdmin = !!(
    user &&
    (user.isAdmin ||
      user.role === 'admin' ||
      user.role === 'superadmin' ||
      user.email === 'abod46071@gmail.com')
  );

  const navItems = [
    {
      name: 'الرئيسية',
      path: '/',
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      name: 'المباريات',
      path: '/matches',
      icon: Calendar,
      isActive: location.pathname === '/matches',
    },
    {
      name: 'الأخبار',
      path: '/news',
      icon: Newspaper,
      isActive: location.pathname === '/news' || location.pathname.startsWith('/news/'),
    },
    ...(canAccessAdmin
      ? [
          {
            name: 'لوحة التحكم',
            path: '/admin',
            icon: ShieldCheck,
            isActive: location.pathname === '/admin',
          },
        ]
      : []),
    {
      name: user ? 'حسابي' : 'دخول',
      path: user ? '/profile' : '/login',
      icon: User,
      avatar: user?.avatar,
      isActive: location.pathname === '/profile' || (!canAccessAdmin && location.pathname === '/login'),
    },
  ];

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 py-1.5 px-3 shadow-lg pb-[max(0.4rem,env(safe-area-inset-bottom))]"
      aria-label="التنقل السفلي للهاتف"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                active
                  ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-bold'
              }`}
            >
              <div className="relative">
                {item.avatar ? (
                  <div className={`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full overflow-hidden border ${active ? 'border-sky-600 ring-2 ring-sky-500/20' : 'border-slate-300 dark:border-slate-700'}`}>
                    <img loading="lazy" src={item.avatar} alt="حسابي" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform ${active ? 'scale-110 stroke-[2.5]' : 'scale-100'}`} />
                )}
                {item.path === '/matches' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse ring-2 ring-white dark:ring-slate-950" />
                )}
              </div>
              <span className={`text-[10px] mt-0.5 leading-none ${active ? 'font-black text-sky-600 dark:text-sky-400' : 'font-bold'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

