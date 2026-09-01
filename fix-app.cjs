const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
code = code.replace(
  "import { Loader2 } from 'lucide-react';",
  "import { Loader2 } from 'lucide-react';\nimport ErrorBoundary from './components/ErrorBoundary';\nimport { checkIsAdmin } from './utils/authHelpers';"
);

// Replace isAdmin
code = code.replace(
  "const isAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));",
  "const isAdmin = checkIsAdmin(user);"
);

// Wrap Suspense with ErrorBoundary
code = code.replace(
  "<Suspense fallback={<div className=\"min-h-screen flex items-center justify-center\"><Loader2 className=\"w-8 h-8 animate-spin text-brand\" /></div>}>",
  "<ErrorBoundary>\n              <Suspense fallback={<div className=\"min-h-screen flex items-center justify-center\"><Loader2 className=\"w-8 h-8 animate-spin text-brand\" /></div>}>"
);

code = code.replace(
  "</Suspense>",
  "</Suspense>\n            </ErrorBoundary>"
);

fs.writeFileSync('src/App.tsx', code);
