/**
 * Centralized Permissions & Role Definitions for KoraNews Platform
 * 
 * Hierarchy:
 * 1. System Owner (owner / system_owner / superadmin):
 *    - Has ALL permissions automatically without requiring explicit assignment.
 *    - Can manage System Managers, Admins, Users, and all settings.
 * 
 * 2. System Manager (manager / system_manager):
 *    - Has full operational permissions across news, categories, matches, predictions, logs, and users.
 *    - Has admins management capabilities (can create/edit/manage Admins and assign permissions).
 *    - CANNOT edit, demote, or delete other System Managers or System Owners.
 * 
 * 3. Admin (admin):
 *    - Has ONLY the granular permissions explicitly granted in their `permissions` array.
 * 
 * 4. User (user):
 *    - Standard end-user with NO administrative permissions.
 */

export const PERMISSIONS = {
  // 1. NEWS
  NEWS_VIEW: 'news_view',
  NEWS_ADD: 'news_add',
  NEWS_EDIT: 'news_edit',
  NEWS_DELETE: 'news_delete',
  NEWS_PUBLISH: 'news_publish',
  NEWS_UNPUBLISH: 'news_unpublish',
  NEWS_FEATURE: 'news_feature',
  NEWS_BREAKING: 'news_breaking',

  // 2. CATEGORIES
  CATEGORIES_VIEW: 'categories_view',
  CATEGORIES_ADD: 'categories_add',
  CATEGORIES_EDIT: 'categories_edit',
  CATEGORIES_DELETE: 'categories_delete',

  // 3. MATCHES
  MATCHES_VIEW: 'matches_view',
  MATCHES_MANAGE: 'matches_manage',
  MATCHES_EDIT: 'matches_edit',
  MATCHES_SYNC: 'matches_sync',

  // 4. PREDICTIONS
  PREDICTIONS_VIEW: 'predictions_view',
  PREDICTIONS_MANAGE: 'predictions_manage',
  PREDICTIONS_MATCH_ADD: 'predictions_match_add',
  PREDICTIONS_MATCH_EDIT: 'predictions_match_edit',
  PREDICTIONS_MATCH_DELETE: 'predictions_match_delete',
  PREDICTIONS_PARTICIPANTS_MANAGE: 'predictions_participants_manage',
  PREDICTIONS_RESULTS_MANAGE: 'predictions_results_manage',
  PREDICTIONS_POINTS_MANAGE: 'predictions_points_manage',
  PREDICTIONS_CONTEST_CREATE: 'predictions_contest_create',
  PREDICTIONS_CONTEST_END: 'predictions_contest_end',
  PREDICTIONS_CONTEST_DELETE: 'predictions_contest_delete',

  // 5. USERS
  USERS_VIEW: 'users_view',
  USERS_MANAGE: 'users_manage',
  USERS_ACTIVATE: 'users_activate',
  USERS_DEACTIVATE: 'users_deactivate',

  // 6. ADMINS
  ADMINS_VIEW: 'admins_view',
  ADMINS_ADD: 'admins_add',
  ADMINS_EDIT: 'admins_edit',
  ADMINS_REMOVE: 'admins_remove',
  ADMINS_PERMISSIONS_MANAGE: 'admins_permissions_manage',

  // 7. SYSTEM
  SYSTEM_SETTINGS: 'system_settings',
  ACTIVITY_LOGS_VIEW: 'activity_logs_view',
  ERROR_LOGS_VIEW: 'error_logs_view',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS] | string;

export interface PermissionDefinition {
  key: string;
  label: string;
  description: string;
  section: 'NEWS' | 'CATEGORIES' | 'MATCHES' | 'PREDICTIONS' | 'USERS' | 'ADMINS' | 'SYSTEM';
  sectionLabel: string;
  isOwnerManagerOnly?: boolean;
}

export const PERMISSION_SECTIONS = [
  { id: 'NEWS', label: 'المحتوى والأخبار' },
  { id: 'CATEGORIES', label: 'التصنيفات الرياضية' },
  { id: 'MATCHES', label: 'المباريات والمزامنة' },
  { id: 'PREDICTIONS', label: 'مسابقة التوقعات' },
  { id: 'USERS', label: 'المستخدمون والاشتراكات' },
  { id: 'ADMINS', label: 'المشرفون والصلاحيات' },
  { id: 'SYSTEM', label: 'النظام وسجل العمليات' },
] as const;

/**
 * List of permissions strictly reserved for System Owner and System Manager.
 * These CANNOT be assigned to regular Admins upon promotion/editing.
 */
export const OWNER_MANAGER_ONLY_PERMISSIONS: string[] = [
  // 1. Users
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.USERS_ACTIVATE,
  PERMISSIONS.USERS_DEACTIVATE,

  // 2. Admins
  PERMISSIONS.ADMINS_VIEW,
  PERMISSIONS.ADMINS_ADD,
  PERMISSIONS.ADMINS_EDIT,
  PERMISSIONS.ADMINS_REMOVE,
  PERMISSIONS.ADMINS_PERMISSIONS_MANAGE,

  // 3. Categories modification
  PERMISSIONS.CATEGORIES_ADD,
  PERMISSIONS.CATEGORIES_EDIT,
  PERMISSIONS.CATEGORIES_DELETE,

  // 4. Matches and schedules
  PERMISSIONS.MATCHES_VIEW,
  PERMISSIONS.MATCHES_MANAGE,
  PERMISSIONS.MATCHES_EDIT,
  PERMISSIONS.MATCHES_SYNC,

  // 5. System
  PERMISSIONS.SYSTEM_SETTINGS,
  PERMISSIONS.ERROR_LOGS_VIEW,
];

export const ALL_PERMISSIONS_DEFINITIONS: PermissionDefinition[] = [
  // --- NEWS (Assignable to Admins) ---
  {
    key: PERMISSIONS.NEWS_VIEW,
    label: 'استعراض الأخبار',
    description: 'مشاهدة قائمة الأخبار وتفاصيلها في لوحة الإدارة',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_ADD,
    label: 'إضافة خبر جديد',
    description: 'إنشاء وصياغة أخبار ومقالات رياضية جديدة',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_EDIT,
    label: 'تعديل الأخبار',
    description: 'تحديث وتحرير نصوص وعناوين وصور الأخبار',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_DELETE,
    label: 'حذف الأخبار',
    description: 'حذف المقالات والأخبار من المنصة بشكل نهائي',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_PUBLISH,
    label: 'نشر الأخبار',
    description: 'تغيير حالة الخبر إلى منشور للجمهور',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_UNPUBLISH,
    label: 'إلغاء نشر الأخبار',
    description: 'تحويل الخبر المنشور إلى مسودة خاصة غير معروضة',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_FEATURE,
    label: 'تمييز الأخبار (Featured)',
    description: 'تحديد الأخبار البارزة لتتصدر السلايدر الرئيسي للموقع',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },
  {
    key: PERMISSIONS.NEWS_BREAKING,
    label: 'شريط الأخبار العاجلة',
    description: 'تفعيل وإدارة تنبيهات الأخبار العاجلة في الشريط العلوي',
    section: 'NEWS',
    sectionLabel: 'المحتوى والأخبار',
  },

  // --- CATEGORIES (View is assignable; Add/Edit/Delete are Owner/Manager only) ---
  {
    key: PERMISSIONS.CATEGORIES_VIEW,
    label: 'عرض التصنيفات الرياضية',
    description: 'استعراض التصنيفات الرياضية لتحديد تصنيف الخبر المناسب',
    section: 'CATEGORIES',
    sectionLabel: 'التصنيفات الرياضية',
  },
  {
    key: PERMISSIONS.CATEGORIES_ADD,
    label: 'إضافة تصنيف (خاص بمدير ومالك النظام)',
    description: 'إنشاء تصنيف رياضي جديد للأخبار والمحتوى',
    section: 'CATEGORIES',
    sectionLabel: 'التصنيفات الرياضية',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.CATEGORIES_EDIT,
    label: 'تعديل التصنيفات (خاص بمدير ومالك النظام)',
    description: 'تعديل مسميات والروابط اللطيفة للتصنيفات',
    section: 'CATEGORIES',
    sectionLabel: 'التصنيفات الرياضية',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.CATEGORIES_DELETE,
    label: 'حذف التصنيفات (خاص بمدير ومالك النظام)',
    description: 'إزالة التصنيفات الرياضية غير المستخدمة',
    section: 'CATEGORIES',
    sectionLabel: 'التصنيفات الرياضية',
    isOwnerManagerOnly: true,
  },

  // --- MATCHES (Owner/Manager only) ---
  {
    key: PERMISSIONS.MATCHES_VIEW,
    label: 'عرض المباريات (خاص بمدير ومالك النظام)',
    description: 'استعراض جدول المباريات والمواعيد والنتائج',
    section: 'MATCHES',
    sectionLabel: 'المباريات والمزامنة',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.MATCHES_MANAGE,
    label: 'إدارة المباريات الشاملة (خاص بمدير ومالك النظام)',
    description: 'إدارة وتخصيص بيانات المباريات والفرق والدوريات',
    section: 'MATCHES',
    sectionLabel: 'المباريات والمزامنة',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.MATCHES_EDIT,
    label: 'تعديل المباريات (خاص بمدير ومالك النظام)',
    description: 'تعديل مواعيد وتفاصيل وحالة المباريات القائمة',
    section: 'MATCHES',
    sectionLabel: 'المباريات والمزامنة',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.MATCHES_SYNC,
    label: 'مزامنة المباريات (خاص بمدير ومالك النظام)',
    description: 'تشغيل المزامنة الفورية وتحديث المباريات من مزودي البيانات',
    section: 'MATCHES',
    sectionLabel: 'المباريات والمزامنة',
    isOwnerManagerOnly: true,
  },

  // --- PREDICTIONS (Assignable to Admins) ---
  {
    key: PERMISSIONS.PREDICTIONS_VIEW,
    label: 'عرض التوقعات والمسابقات',
    description: 'استعراض مباريات التوقع ولوحة المتصدرين والإحصائيات',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_MANAGE,
    label: 'إدارة التوقعات العامة',
    description: 'التحكم العام بإعدادات ونظام مسابقات التوقع',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_MATCH_ADD,
    label: 'إضافة مباراة للتوقع',
    description: 'جدولة مباريات جديدة أو مخصصة لمسابقة التوقعات',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_MATCH_EDIT,
    label: 'تعديل مباراة التوقع',
    description: 'تعديل تفاصيل المباراة أو فتح/إغلاق باب التوقع يدوياً',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_MATCH_DELETE,
    label: 'حذف مباراة التوقع',
    description: 'إلغاء وحذف مباراة من جدول مسابقة التوقعات',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE,
    label: 'إدارة المتسابقين والمشاركين',
    description: 'مراجعة طلبات الانضمام، الموافقة، الرفض، أو حظر المتسابقين',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_RESULTS_MANAGE,
    label: 'اعتماد نتائج المباريات',
    description: 'إدخال وتثبيت النتائج النهائية للمباريات واحتساب النقاط تلقائياً',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_POINTS_MANAGE,
    label: 'تعديل نظام النقاط',
    description: 'تعديل وزن ونقاط المباريات أو إعادة احتساب النقاط',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_CONTEST_CREATE,
    label: 'إنشاء مسابقة جديدة',
    description: 'إنشاء موسم أو جولة مسابقات جديدة',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_CONTEST_END,
    label: 'إنهاء وإغلاق المسابقة',
    description: 'إغلاق المسابقة الحالية وتتويج الفائزين',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },
  {
    key: PERMISSIONS.PREDICTIONS_CONTEST_DELETE,
    label: 'حذف المسابقة',
    description: 'حذف سجل مسابقة سابقة',
    section: 'PREDICTIONS',
    sectionLabel: 'مسابقة التوقعات',
  },

  // --- USERS (Owner/Manager only) ---
  {
    key: PERMISSIONS.USERS_VIEW,
    label: 'استعراض المستخدمين (خاص بمدير ومالك النظام)',
    description: 'مشاهدة قائمة مستخدمي المنصة وسجلاتهم وبياناتهم',
    section: 'USERS',
    sectionLabel: 'المستخدمون والاشتراكات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.USERS_MANAGE,
    label: 'إدارة المستخدمين (خاص بمدير ومالك النظام)',
    description: 'تعديل بيانات الحسابات العادية وحذف الحسابات',
    section: 'USERS',
    sectionLabel: 'المستخدمون والاشتراكات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.USERS_ACTIVATE,
    label: 'تفعيل حسابات المستخدمين (خاص بمدير ومالك النظام)',
    description: 'إلغاء حظر وإعادة تنشيط الحسابات المعطلة',
    section: 'USERS',
    sectionLabel: 'المستخدمون والاشتراكات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.USERS_DEACTIVATE,
    label: 'تعطيل وحظر المستخدمين (خاص بمدير ومالك النظام)',
    description: 'إيقاف حسابات المستخدمين المخالفين ومنعهم من الدخول',
    section: 'USERS',
    sectionLabel: 'المستخدمون والاشتراكات',
    isOwnerManagerOnly: true,
  },

  // --- ADMINS (Owner/Manager only) ---
  {
    key: PERMISSIONS.ADMINS_VIEW,
    label: 'استعراض المشرفين (خاص بمدير ومالك النظام)',
    description: 'مشاهدة قائمة المشرفين والإداريين ومستوياتهم',
    section: 'ADMINS',
    sectionLabel: 'المشرفون والصلاحيات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.ADMINS_ADD,
    label: 'إضافة / ترقية مشرف (خاص بمدير ومالك النظام)',
    description: 'ترقية مستخدم عادي إلى رتبة مشرف (Admin)',
    section: 'ADMINS',
    sectionLabel: 'المشرفون والصلاحيات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.ADMINS_EDIT,
    label: 'تعديل بيانات المشرفين (خاص بمدير ومالك النظام)',
    description: 'تحديث بيانات وحسابات المشرفين القائمة',
    section: 'ADMINS',
    sectionLabel: 'المشرفون والصلاحيات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.ADMINS_REMOVE,
    label: 'سحب رتبة المشرف (خاص بمدير ومالك النظام)',
    description: 'تخفيض رتبة المشرف إلى مستخدم عادي أو حذف حسابه الإداري',
    section: 'ADMINS',
    sectionLabel: 'المشرفون والصلاحيات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.ADMINS_PERMISSIONS_MANAGE,
    label: 'إدارة صلاحيات المشرفين (خاص بمدير ومالك النظام)',
    description: 'تخصيص وتحديد قائمة الصلاحيات الممنوحة لكل مشرف بدقة',
    section: 'ADMINS',
    sectionLabel: 'المشرفون والصلاحيات',
    isOwnerManagerOnly: true,
  },

  // --- SYSTEM ---
  {
    key: PERMISSIONS.SYSTEM_SETTINGS,
    label: 'إعدادات النظام العامة (خاص بمدير ومالك النظام)',
    description: 'التحكم بإعدادات الموقع، الخيارات العامة، والإحصائيات الحيوية',
    section: 'SYSTEM',
    sectionLabel: 'النظام وسجل العمليات',
    isOwnerManagerOnly: true,
  },
  {
    key: PERMISSIONS.ACTIVITY_LOGS_VIEW,
    label: 'عرض سجل العمليات الإدارية (Audit Logs)',
    description: 'متابعة وفحص سجل التغييرات والنشاطات الإدارية في النظام',
    section: 'SYSTEM',
    sectionLabel: 'النظام وسجل العمليات',
  },
  {
    key: PERMISSIONS.ERROR_LOGS_VIEW,
    label: 'عرض سجل الأخطاء (Error Logs) (خاص بمدير ومالك النظام)',
    description: 'متابعة ورصد أخطاء الخادم والواجهة وتصدير تقارير الأخطاء',
    section: 'SYSTEM',
    sectionLabel: 'النظام وسجل العمليات',
    isOwnerManagerOnly: true,
  },
];

/**
 * Filtered list of permissions that can be granted to regular Admins.
 */
export const ASSIGNABLE_ADMIN_PERMISSIONS: PermissionDefinition[] = ALL_PERMISSIONS_DEFINITIONS.filter(
  (p) => !p.isOwnerManagerOnly && !OWNER_MANAGER_ONLY_PERMISSIONS.includes(p.key)
);

export const ASSIGNABLE_ADMIN_PERMISSION_KEYS: string[] = ASSIGNABLE_ADMIN_PERMISSIONS.map((p) => p.key);

/**
 * Quick assignment presets for Admin modal (Exclusively with allowed Admin permissions)
 */
export const PERMISSION_PRESETS = [
  {
    id: 'news_editor',
    label: 'محرر أخبار كامل',
    description: 'صلاحيات كاملة لتحرير ونشر الأخبار واستعراض التصنيفات',
    permissions: [
      PERMISSIONS.NEWS_VIEW,
      PERMISSIONS.NEWS_ADD,
      PERMISSIONS.NEWS_EDIT,
      PERMISSIONS.NEWS_DELETE,
      PERMISSIONS.NEWS_PUBLISH,
      PERMISSIONS.NEWS_UNPUBLISH,
      PERMISSIONS.NEWS_FEATURE,
      PERMISSIONS.NEWS_BREAKING,
      PERMISSIONS.CATEGORIES_VIEW,
    ],
  },
  {
    id: 'predictions_manager',
    label: 'مشرف مسابقة التوقعات',
    description: 'جدولة مباريات التوقع، إدارة المتسابقين، واعتماد النتائج والنقاط',
    permissions: [
      PERMISSIONS.PREDICTIONS_VIEW,
      PERMISSIONS.PREDICTIONS_MANAGE,
      PERMISSIONS.PREDICTIONS_MATCH_ADD,
      PERMISSIONS.PREDICTIONS_MATCH_EDIT,
      PERMISSIONS.PREDICTIONS_MATCH_DELETE,
      PERMISSIONS.PREDICTIONS_PARTICIPANTS_MANAGE,
      PERMISSIONS.PREDICTIONS_RESULTS_MANAGE,
      PERMISSIONS.PREDICTIONS_POINTS_MANAGE,
      PERMISSIONS.PREDICTIONS_CONTEST_CREATE,
      PERMISSIONS.PREDICTIONS_CONTEST_END,
      PERMISSIONS.PREDICTIONS_CONTEST_DELETE,
    ],
  },
  {
    id: 'all',
    label: 'شامل كافة صلاحيات المشرف',
    description: 'منح جميع الصلاحيات الإدارية المتاحة للمشرف (أخبار + توقعات + سجل العمليات)',
    permissions: ASSIGNABLE_ADMIN_PERMISSION_KEYS,
  },
  {
    id: 'clear',
    label: 'تفريغ الصلاحيات',
    description: 'إزالة كافة الصلاحيات الممنوحة',
    permissions: [],
  },
];

/**
 * Checks if a user has a specific permission taking role hierarchy into account.
 */
export function checkUserHasPermission(
  user: { role?: string; isAdmin?: boolean; permissions?: string[] } | null | undefined,
  permission: string
): boolean {
  if (!user) return false;

  const role = (user.role || '').toLowerCase().trim();

  // 1. System Owner: Has ALL permissions automatically without restrictions
  if (role === 'owner' || role === 'system_owner' || role === 'superadmin') {
    return true;
  }

  // 2. System Manager: Has all operational permissions + admin management (except modifying other managers/owners)
  if (role === 'manager' || role === 'system_manager') {
    if (permission === 'managers_manage') return false;
    return true;
  }

  // 3. Regular Admin: Must have permission in their explicit permissions array (and CANNOT possess owner/manager only permissions)
  if (role === 'admin' || user.isAdmin === true) {
    // Hard security block: Owner and Manager only permissions are NEVER accessible by regular Admins
    if (OWNER_MANAGER_ONLY_PERMISSIONS.includes(permission)) {
      return false;
    }

    const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
    if (perms.includes(permission)) return true;

    // Backward-compatibility and logical inheritance for allowed admin permissions:
    // News parent permissions
    if (permission === PERMISSIONS.NEWS_VIEW && (perms.includes(PERMISSIONS.NEWS_ADD) || perms.includes(PERMISSIONS.NEWS_EDIT) || perms.includes(PERMISSIONS.NEWS_DELETE))) return true;
    if (permission === PERMISSIONS.NEWS_UNPUBLISH && perms.includes(PERMISSIONS.NEWS_PUBLISH)) return true;
    if (permission === PERMISSIONS.NEWS_FEATURE && (perms.includes('news_featured') || perms.includes(PERMISSIONS.NEWS_EDIT))) return true;
    if (permission === PERMISSIONS.NEWS_BREAKING && perms.includes(PERMISSIONS.NEWS_EDIT)) return true;

    // Categories inheritance (only view is allowed for admins)
    if (permission === PERMISSIONS.CATEGORIES_VIEW && (perms.includes('categories_manage') || perms.includes(PERMISSIONS.NEWS_ADD) || perms.includes(PERMISSIONS.NEWS_EDIT))) return true;

    // Predictions inheritance
    if (perms.includes(PERMISSIONS.PREDICTIONS_MANAGE) || perms.includes('contests_manage')) {
      if (permission.startsWith('predictions_')) {
        return true;
      }
    }
    if (permission === PERMISSIONS.PREDICTIONS_VIEW && perms.some((p) => p.startsWith('predictions_'))) return true;

    // System Activity Logs
    if (permission === PERMISSIONS.ACTIVITY_LOGS_VIEW && perms.includes('logs_view')) return true;

    return false;
  }

  // 4. Standard User: No administrative permissions
  return false;
}
