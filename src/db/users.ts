import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, name: string, avatar?: string) {
  const result = await db.insert(users)
    .values({
      uid,
      email,
      name,
      avatar,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        name,
        avatar,
      },
    })
    .returning();

  return result[0];
}
