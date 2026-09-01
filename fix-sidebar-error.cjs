const fs = require('fs');

let code = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

const catchBlock = `}).catch((err) => {
      console.error('Failed to fetch categories:', err);
      setCategoriesError(true);
    });`;

const newEffect = `
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
    fetchCats();
  }, []);
`;

code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/, newEffect.trim());

const renderError = `
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
        ) : categories.length > 0 && (`;

code = code.replace("{/* Group 3: News Categories */}\n        {categories.length > 0 && (", renderError);

fs.writeFileSync('src/components/layout/Sidebar.tsx', code);
