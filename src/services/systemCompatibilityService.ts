import { db, withDbRetry } from '../db/index.ts';
import { users, activityLogs, news, categories, contestSettings, predictionMatches, predictions } from '../db/schema.ts';
import { eq, sql, inArray } from 'drizzle-orm';

export interface AuditReport {
  timestamp: string;
  counts: {
    users: number;
    news: number;
    categories: number;
    contests: number;
    predictionMatches: number;
    predictions: number;
    activityLogs: number;
  };
  systemOwner: {
    id: number;
    email: string;
    role: string;
    isAdmin: boolean;
    isActive: boolean;
  } | null;
  migratedAdminsCount: number;
  message: string;
}

/**
 * Safe, idempotent migration & compatibility audit service.
 * Ensures:
 * 1. The existing owner account (abod46071@gmail.com or superadmin) remains the primary System Owner.
 * 2. Zero data loss across users, news, contests, predictions, and logs.
 * 3. Consistent isAdmin = true for legacy admin records.
 * 4. Safe preservation of permissions without unearned privilege grants.
 */
export async function runSystemCompatibilityAudit(): Promise<AuditReport> {
  return withDbRetry(async () => {
    // 1. Audit Table Counts (Verifying data presence)
    const [uCountRes] = await db.select({ count: sql`count(*)` }).from(users);
    const [nCountRes] = await db.select({ count: sql`count(*)` }).from(news);
    const [cCountRes] = await db.select({ count: sql`count(*)` }).from(categories);
    const [csCountRes] = await db.select({ count: sql`count(*)` }).from(contestSettings);
    const [pmCountRes] = await db.select({ count: sql`count(*)` }).from(predictionMatches);
    const [pCountRes] = await db.select({ count: sql`count(*)` }).from(predictions);
    const [alCountRes] = await db.select({ count: sql`count(*)` }).from(activityLogs);

    const counts = {
      users: Number(uCountRes?.count || 0),
      news: Number(nCountRes?.count || 0),
      categories: Number(cCountRes?.count || 0),
      contests: Number(csCountRes?.count || 0),
      predictionMatches: Number(pmCountRes?.count || 0),
      predictions: Number(pCountRes?.count || 0),
      activityLogs: Number(alCountRes?.count || 0),
    };

    // 2. Identify and safeguard the System Owner
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
    
    // Look for user by email or by superadmin/owner role
    let ownerUsers = await db.select().from(users).where(sql`role IN ('superadmin', 'owner', 'system_owner')`).orderBy(users.id).limit(1);
    if (ownerUsers.length === 0 && superAdminEmail) {
      ownerUsers = await db.select().from(users).where(eq(users.email, superAdminEmail)).limit(1);
    }

    let ownerInfo = null;
    let ownerId = 1;

    if (ownerUsers.length > 0) {
      const owner = ownerUsers[0];
      ownerId = owner.id;
      // Ensure owner is active and marked as admin
      if (!owner.isAdmin || !owner.isActive) {
        await db.update(users)
          .set({ isAdmin: true, isActive: true })
          .where(eq(users.id, owner.id));
      }
      ownerInfo = {
        id: owner.id,
        email: owner.email,
        role: owner.role,
        isAdmin: true,
        isActive: true,
      };
    }

    // 3. Synchronize legacy admin records (ensuring is_admin = true for role = 'admin')
    const desyncedAdmins = await db.select({ id: users.id })
      .from(users)
      .where(sql`role = 'admin' AND (is_admin = false OR is_admin IS NULL)`);

    let migratedAdminsCount = 0;
    if (desyncedAdmins.length > 0) {
      const adminIds = desyncedAdmins.map((a) => a.id);
      await db.update(users)
        .set({ isAdmin: true })
        .where(inArray(users.id, adminIds));
      migratedAdminsCount = desyncedAdmins.length;
    }

    // 4. Log to activity_logs if changes occurred
    if (migratedAdminsCount > 0) {
      await db.insert(activityLogs).values({
        userId: ownerId,
        action: 'SYSTEM_MIGRATION',
        entityType: 'SYSTEM',
        entityId: 'ROLES_COMPATIBILITY',
        details: {
          message: 'تمت مزامنة حقل isAdmin لجميع المشرفين القدامى للتوافق التام مع النظام الجديد',
          migratedAdminsCount,
          ownerEmail: ownerInfo?.email,
          totalUsers: counts.users,
          timestamp: new Date().toISOString(),
        },
      });
    }

    console.log(
      `[System Compatibility] Audit complete. Users: ${counts.users}, News: ${counts.news}, Admins Synchronized: ${migratedAdminsCount}, System Owner: ${ownerInfo?.email || 'N/A'}`
    );

    return {
      timestamp: new Date().toISOString(),
      counts,
      systemOwner: ownerInfo,
      migratedAdminsCount,
      message: 'تم التحقق من توافق قاعدة البيانات بنجاح والحفاظ على جميع السجلات والحساب المالك',
    };
  });
}
