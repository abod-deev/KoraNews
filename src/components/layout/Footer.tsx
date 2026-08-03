export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand rounded-full flex items-center justify-center text-white font-bold text-xs">K</div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">كورة نيوز</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} كورة نيوز
          </p>
        </div>
      </div>
    </footer>
  );
}
