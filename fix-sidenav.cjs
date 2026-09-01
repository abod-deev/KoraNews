const fs = require('fs');
let code = fs.readFileSync('src/components/layout/SideNavDrawer.tsx', 'utf8');

// Imports
code = code.replace(
  "import { fetchCategories } from '../../services/api';",
  "import { fetchCategories } from '../../services/api';\nimport { checkIsAdmin } from '../../utils/authHelpers';"
);

// Admin Logic
code = code.replace(
  "const canAccessAdmin = !!(\n    user &&\n    (user.isAdmin ||\n      user.role === 'admin' ||\n      user.role === 'superadmin' ||\n      user.email === 'abod46071@gmail.com')\n  );",
  "const canAccessAdmin = checkIsAdmin(user);"
);
// In case the spacing was different
code = code.replace(
  "const canAccessAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));",
  "const canAccessAdmin = checkIsAdmin(user);"
);

// Types
code = code.replace(
  "const [categories, setCategories] = useState<any[]>([]);",
  "const [categories, setCategories] = useState<{ id: string, name: string, slug?: string }[]>([]);\n  const [categoriesError, setCategoriesError] = useState(false);"
);

// Catch Block
code = code.replace(
  "}).catch(() => {});",
  "}).catch((err) => {\n      console.error('Failed to fetch categories:', err);\n      setCategoriesError(true);\n    });"
);

// Fix Links
code = code.replace("path: '/predictions-leaderboard'", "path: '/predictions/leaderboard'");
code = code.replace("path: '/golden-leaderboard'", "path: '/predictions/golden'");

fs.writeFileSync('src/components/layout/SideNavDrawer.tsx', code);
