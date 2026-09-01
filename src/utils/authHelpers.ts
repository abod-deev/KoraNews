export interface AuthUser {
  id?: string | number;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  isAdmin?: boolean;
  avatar?: string;
  [key: string]: any;
}

export type User = AuthUser;

export function checkIsAdmin(user: User | null): boolean {
  if (!user) return false;
  return !!(
    user.isAdmin ||
    user.role === 'admin' ||
    user.role === 'superadmin'
  );
}
