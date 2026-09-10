import { UserRole, PermissionKey } from '../types.ts';
import { checkUserHasPermission, PERMISSIONS } from '../constants/permissions.ts';

export interface AuthUser {
  id?: string | number;
  uid?: string;
  email?: string;
  name?: string;
  displayName?: string;
  role?: UserRole | string;
  isAdmin?: boolean;
  permissions?: string[];
  avatar?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export type User = AuthUser;

/**
 * Normalizes legacy and standard role strings into the four standard tiers:
 * - 'system_owner' (includes legacy 'superadmin' and 'owner')
 * - 'system_manager' (includes legacy 'manager')
 * - 'admin'
 * - 'user'
 */
export function normalizeRole(role?: string): 'system_owner' | 'system_manager' | 'admin' | 'user' {
  const r = (role || '').toLowerCase().trim();
  if (r === 'owner' || r === 'system_owner' || r === 'superadmin') {
    return 'system_owner';
  }
  if (r === 'manager' || r === 'system_manager') {
    return 'system_manager';
  }
  if (r === 'admin') {
    return 'admin';
  }
  return 'user';
}

/**
 * Checks if a user is the System Owner (highest administrative tier).
 * Compatible with 'system_owner', 'owner', and legacy 'superadmin'.
 */
export function isSystemOwner(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  return role === 'owner' || role === 'system_owner' || role === 'superadmin';
}

/**
 * Checks if a user is a System Manager (second administrative tier) or above.
 * Compatible with 'system_manager' and 'manager', as well as System Owners.
 */
export function isSystemManager(user: User | null | undefined): boolean {
  if (!user) return false;
  if (isSystemOwner(user)) return true;
  const role = (user.role || '').toLowerCase().trim();
  return role === 'manager' || role === 'system_manager';
}

/**
 * Checks if a user has any administrative access (Admin, Manager, or Owner).
 * Standard 'user' role without admin role or isAdmin flag is false.
 */
export function isAnyAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  if (role === 'user' && !user.isAdmin) return false;
  return (
    !!user.isAdmin ||
    role === 'admin' ||
    role === 'manager' ||
    role === 'system_manager' ||
    role === 'owner' ||
    role === 'system_owner' ||
    role === 'superadmin'
  );
}

// Backward-compatibility and standardized aliases
export const checkIsAdmin = isAnyAdmin;
export const isAdmin = isAnyAdmin;

/**
 * Checks if a user has a specific granular permission.
 * - System Owner: Has all permissions automatically.
 * - System Manager: Has all operational permissions + admin management.
 * - Admin: Requires explicit permission in their permissions array.
 * - User: Returns false.
 */
export function hasUserPermission(user: User | null | undefined, permission: PermissionKey | string): boolean {
  return checkUserHasPermission(user, permission);
}

export const hasPermission = hasUserPermission;

/**
 * Checks if a user has AT LEAST ONE of the specified permissions (OR condition).
 * Accepts either individual permission arguments or arrays of permissions.
 */
export function hasAnyPermission(
  user: User | null | undefined,
  ...permissions: (PermissionKey | string | (PermissionKey | string)[])[]
): boolean {
  if (!user || permissions.length === 0) return false;
  // Flatten in case an array was passed as argument
  const flatPerms: (PermissionKey | string)[] = permissions.flat();
  return flatPerms.some((perm) => hasUserPermission(user, perm));
}

export const hasUserAnyPermission = hasAnyPermission;

/**
 * Checks if a user has ALL of the specified permissions (AND condition).
 * Accepts either individual permission arguments or arrays of permissions.
 */
export function hasAllPermissions(
  user: User | null | undefined,
  ...permissions: (PermissionKey | string | (PermissionKey | string)[])[]
): boolean {
  if (!user || permissions.length === 0) return false;
  const flatPerms: (PermissionKey | string)[] = permissions.flat();
  return flatPerms.every((perm) => hasUserPermission(user, perm));
}

export const hasUserAllPermissions = hasAllPermissions;

/**
 * Returns user-friendly badge metadata for display.
 */
export function getRoleBadgeInfo(role?: string) {
  const r = (role || '').toLowerCase();
  if (r === 'owner' || r === 'system_owner' || r === 'superadmin') {
    return {
      label: 'مالك النظام',
      englishLabel: 'System Owner',
      color: 'purple',
      badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800/60',
      icon: 'Crown',
      rank: 3,
    };
  }
  if (r === 'manager' || r === 'system_manager') {
    return {
      label: 'مدير النظام',
      englishLabel: 'System Manager',
      color: 'indigo',
      badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/60',
      icon: 'ShieldCheck',
      rank: 2,
    };
  }
  if (r === 'admin') {
    return {
      label: 'مشرف (Admin)',
      englishLabel: 'Admin',
      color: 'amber',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800/60',
      icon: 'Shield',
      rank: 1,
    };
  }
  return {
    label: 'مستخدم',
    englishLabel: 'User',
    color: 'slate',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    icon: 'User',
    rank: 0,
  };
}

