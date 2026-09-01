export interface AuthUser {
  id?: string | number;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: string;
  isAdmin?: boolean;
  avatar?: string;
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
