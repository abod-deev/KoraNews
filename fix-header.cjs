const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Header.tsx', 'utf8');

// Imports
code = code.replace(
  "import { useMatchReminders } from '../../contexts/MatchRemindersContext';",
  "import { useMatchReminders } from '../../contexts/MatchRemindersContext';\nimport { checkIsAdmin } from '../../utils/authHelpers';"
);

// Admin Logic
code = code.replace(
  "const canAccessAdmin = !!(user && (user.isAdmin || user.role === 'admin' || user.role === 'superadmin' || user.email === 'abod46071@gmail.com'));",
  "const canAccessAdmin = checkIsAdmin(user);"
);

// Fix Date Logic
code = code.replace(
  "{new Date(match.matchDate || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}",
  "{match.matchDate ? new Date(match.matchDate).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'وقت غير متوفر'}"
);

fs.writeFileSync('src/components/layout/Header.tsx', code);
