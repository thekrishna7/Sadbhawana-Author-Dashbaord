import { NextResponse } from 'next/server';
import { clearSession, getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({
      userId: user.id,
      userName: user.fullName,
      action: 'LOGOUT',
      entityType: 'User',
      entityName: user.username,
      details: 'User logged out',
    });
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
