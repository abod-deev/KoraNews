import SiteLogo from './SiteLogo';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <SiteLogo size="sm" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} أخبار كرة القدم العالمية
          </p>
        </div>
      </div>
    </footer>
  );
}
