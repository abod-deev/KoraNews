import { Link } from 'react-router-dom';
import { Trophy, Calendar, Star, Settings } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="hidden lg:block w-64 shrink-0 p-6 border-l border-gray-200 dark:border-gray-800">
      <div className="sticky top-24 space-y-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">روابط سريعة</h3>
          <ul className="space-y-3">
            <li>
              <Link to="/matches" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-brand dark:hover:text-brand transition-colors">
                <Calendar className="w-5 h-5" />
                <span className="font-semibold">مباريات اليوم</span>
              </Link>
            </li>
            <li>
              <Link to="/teams" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-brand dark:hover:text-brand transition-colors">
                <Trophy className="w-5 h-5" />
                <span className="font-semibold">ترتيب الدوريات</span>
              </Link>
            </li>
            <li>
              <Link to="/players" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-brand dark:hover:text-brand transition-colors">
                <Star className="w-5 h-5" />
                <span className="font-semibold">أبرز النجوم</span>
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">الإدارة</h3>
          <ul className="space-y-3">
            <li>
              <Link to="/admin" className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-brand dark:hover:text-brand transition-colors">
                <Settings className="w-5 h-5" />
                <span className="font-semibold">لوحة التحكم</span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
