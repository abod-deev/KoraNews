const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf8');

// Update imports
code = code.replace(
  "import { fetchCategories } from '../../services/api';",
  "import { fetchCategories } from '../../services/api';\nimport { checkIsAdmin } from '../../utils/authHelpers';"
);

// Fix Types
code = code.replace(
  "const [categories, setCategories] = useState<any[]>([]);",
  "const [categories, setCategories] = useState<{ id: string, name: string, slug?: string }[]>([]);\n  const [categoriesError, setCategoriesError] = useState(false);"
);

// Fix Admin
code = code.replace(
  "const canAccessAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));",
  "const canAccessAdmin = checkIsAdmin(user);"
);

// Fix Links
code = code.replace("path: '/predictions-leaderboard'", "path: '/predictions/leaderboard'");
code = code.replace("path: '/golden-leaderboard'", "path: '/predictions/golden'");

// Fix Catch Block
code = code.replace(
  "}).catch(() => {});",
  "}).catch((err) => {\n      console.error('Failed to fetch categories:', err);\n      setCategoriesError(true);\n    });"
);

fs.writeFileSync('src/components/layout/Sidebar.tsx', code);
