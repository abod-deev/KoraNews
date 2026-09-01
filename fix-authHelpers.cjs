const fs = require('fs');

let code = `export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  isAdmin?: boolean;
  avatar?: string;
  [key: string]: any;
}

export function checkIsAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return !!(user.isAdmin || user.role === 'admin' || user.role === 'superadmin');
}
`;

fs.writeFileSync('src/utils/authHelpers.ts', code);
