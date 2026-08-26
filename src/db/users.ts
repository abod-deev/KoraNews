import { db, withDbRetry } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, name: string, avatar?: string, password?: string) {
  return withDbRetry(async () => {
    const cleanEmail = email?.toLowerCase()?.trim();
    const isSuperAdmin = cleanEmail === 'abod46071@gmail.com';
    const userName = name || (isSuperAdmin ? 'عبدالله الراعي' : (email ? email.split('@')[0] : 'مستخدم'));
    const superAdminPermissions = ['news_add', 'news_edit', 'news_delete', 'news_publish', 'matches_manage', 'admin_manage'];

    // 1. Try finding user by UID
    const existingByUid = await db.select().from(users).where(eq(users.uid, uid));
    if (existingByUid.length > 0) {
      const updated = await db.update(users)
        .set({
          email: cleanEmail,
          name: isSuperAdmin ? 'عبدالله الراعي' : (userName || existingByUid[0].name),
          avatar: avatar || existingByUid[0].avatar,
          ...(password ? { password } : {}),
          ...(isSuperAdmin ? { role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions } : {})
        })
        .where(eq(users.id, existingByUid[0].id))
        .returning();
      return updated[0];
    }

    // 2. Try finding user by email
    const existingByEmail = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existingByEmail.length > 0) {
      const updated = await db.update(users)
        .set({
          uid, // associate with new/given uid
          name: isSuperAdmin ? 'عبدالله الراعي' : (userName || existingByEmail[0].name),
          avatar: avatar || existingByEmail[0].avatar,
          ...(password ? { password } : {}),
          ...(isSuperAdmin ? { role: 'superadmin', isAdmin: true, isActive: true, permissions: superAdminPermissions } : {})
        })
        .where(eq(users.id, existingByEmail[0].id))
        .returning();
      return updated[0];
    }

    // 3. Create new user record
    const result = await db.insert(users)
      .values({
        uid,
        email: cleanEmail,
        password: password || null,
        name: isSuperAdmin ? 'عبدالله الراعي' : userName,
        avatar,
        role: isSuperAdmin ? 'superadmin' : 'user',
        isAdmin: isSuperAdmin,
        permissions: isSuperAdmin ? superAdminPermissions : [],
        isActive: true
      })
      .returning();

    return result[0];
  });
}
