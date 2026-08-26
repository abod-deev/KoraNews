import { db } from '../db/index.js';
import { activityLogs } from '../db/schema.js';

export async function logActivity(
  userId: number,
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'OTHER',
  entityType: string,
  entityId: string,
  details?: any
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      action,
      entityType,
      entityId,
      details: details ? details : null,
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
