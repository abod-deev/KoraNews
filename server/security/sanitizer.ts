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
export function toSafeUser(user: any): SafeUserDTO {
  if (!user) {
    throw new Error('Invalid user object provided for serialization');
  }

  const role = user.role || (user.isAdmin || user.is_admin ? 'admin' : 'user');
  const isAdmin = role === 'admin' || role === 'superadmin' || !!user.isAdmin || !!user.is_admin;
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];

  return {
    id: user.id,
    uid: user.uid,
    email: (user.email || '').toLowerCase().trim(),
    name: user.name || (user.email ? user.email.split('@')[0] : 'مستخدم'),
    displayName: user.name || (user.email ? user.email.split('@')[0] : 'مستخدم'),
    avatar: user.avatar || '/default-avatar.svg',
    role,
    permissions,
    isAdmin,
    isActive: user.isActive !== undefined ? !!user.isActive : (user.is_active !== undefined ? !!user.is_active : true),
    createdAt: user.createdAt || user.created_at || null,
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
