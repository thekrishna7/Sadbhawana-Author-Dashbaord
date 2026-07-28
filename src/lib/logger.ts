import { db } from './db';

export async function logActivity({
  userId,
  userName,
  action,
  entityType,
  entityName,
  details,
}: {
  userId?: string | null;
  userName: string;
  action: string;
  entityType: string;
  entityName?: string | null;
  details?: string | null;
}) {
  try {
    return await db.activityLog.create({
      data: {
        userId: userId || null,
        userName,
        action,
        entityType,
        entityName: entityName || null,
        details: details || null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
