/**
 * Security Sanitization & Safe DTO Utilities for KoraNews
 */

export interface SafeUserDTO {
  id?: number;
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  avatar: string | null;
  role: string;
  permissions: string[];
  isAdmin: boolean;
  isActive: boolean;
  createdAt?: Date | string | null;
}

/**
 * Strips password, passwordHash, and internal sensitive database fields from user objects.
 */
export function toSafeUser(user: Record<string, unknown> | null | undefined): SafeUserDTO {
  if (!user) {
    throw new Error('Invalid user object provided for serialization');
  }

  const role = typeof user.role === 'string' && user.role
    ? user.role
    : (user.isAdmin || user.is_admin ? 'admin' : 'user');

  const isAdmin =
    role === 'admin' ||
    role === 'manager' ||
    role === 'system_manager' ||
    role === 'owner' ||
    role === 'system_owner' ||
    role === 'superadmin' ||
    Boolean(user.isAdmin) ||
    Boolean(user.is_admin);

  const permissions = Array.isArray(user.permissions) ? (user.permissions as string[]) : [];

  return {
    id: typeof user.id === 'number' ? user.id : undefined,
    uid: String(user.uid || ''),
    email: (typeof user.email === 'string' ? user.email : '').toLowerCase().trim(),
    name: typeof user.name === 'string' && user.name ? user.name : (typeof user.email === 'string' && user.email ? user.email.split('@')[0] : 'مستخدم'),
    displayName: typeof user.name === 'string' && user.name ? user.name : (typeof user.email === 'string' && user.email ? user.email.split('@')[0] : 'مستخدم'),
    avatar: typeof user.avatar === 'string' && user.avatar ? user.avatar : '/default-avatar.svg',
    role,
    permissions,
    isAdmin,
    isActive: user.isActive !== undefined ? Boolean(user.isActive) : (user.is_active !== undefined ? Boolean(user.is_active) : true),
    createdAt: (user.createdAt as Date | string) || (user.created_at as Date | string) || null,
  };
}

/**
 * Escapes dangerous HTML entities from plain text strings.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Basic XSS sanitizer for news content and strings.
 * Removes malicious script tags, event handlers, and javascript pseudo-protocols.
 */
export function sanitizeContent(content: string): string {
  if (!content || typeof content !== 'string') return '';
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
}
