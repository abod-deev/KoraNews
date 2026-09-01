const fs = require('fs');

let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
code = code.replace(
  "import { auth, googleAuthProvider } from '../lib/firebase';",
  "import { auth, googleAuthProvider } from '../lib/firebase';\nimport { AuthUser } from '../utils/authHelpers';"
);

code = code.replace(
  "user: any;",
  "user: AuthUser | null;"
);

code = code.replace(
  "const [user, setUser] = useState<any>(null);",
  "const [user, setUser] = useState<AuthUser | null>(null);"
);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
