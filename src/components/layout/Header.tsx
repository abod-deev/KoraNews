import { Link } from 'react-router-dom';
import { Moon, Sun, Menu, User, LogOut, Settings } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';

export default function Header() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'الرئيسية', path: '/' },
    { name: 'الأخبار', path: '/news' },
    { name: 'المباريات', path: '/matches' },
    { name: 'الفرق', path: '/teams' },
    { name: 'اللاعبون', path: '/players' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -mr-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand rounded-full flex items-center justify-center text-white font-bold">K</div>
              <span className="text-xl font-extrabold text-brand">كورة نيوز</span>
            </Link>
          </div>

          <nav className="hidden lg:flex gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className="text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-brand font-semibold transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={toggleDarkMode} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
            
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/admin" className="text-gray-600 dark:text-gray-300 hover:text-brand flex items-center gap-1 font-semibold">
                  <Settings className="w-4 h-4" /> لوحة التحكم
                </Link>
                <button onClick={logout} className="text-red-500 hover:text-red-600 font-semibold flex items-center gap-1">
                  <LogOut className="w-4 h-4" /> خروج
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="hidden sm:flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
              >
                <User className="w-4 h-4" />
                <span>دخول</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t dark:border-gray-800 bg-white dark:bg-gray-900 absolute w-full shadow-lg">
          <nav className="flex flex-col px-4 py-2 space-y-1">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path} 
                className="block px-3 py-3 rounded-md text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-brand dark:hover:text-brand hover:bg-gray-50 dark:hover:bg-gray-800" 
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            
            {user ? (
              <>
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="block px-3 py-3 rounded-md text-base font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
                  لوحة التحكم
                </Link>
                <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="block w-full text-start px-3 py-3 rounded-md text-base font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="block px-3 py-3 rounded-md text-base font-semibold text-brand hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                تسجيل الدخول
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
