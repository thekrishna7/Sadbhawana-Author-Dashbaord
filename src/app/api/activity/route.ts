import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const logs = await db.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ logs });
}
