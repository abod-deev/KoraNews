export function checkIsAdmin(user: any): boolean {
  if (!user) return false;
  return !!(user.isAdmin || user.role === 'admin' || user.role === 'superadmin');
}
