import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await db.setting.findMany();
  const emailLogs = await db.emailLog.findMany({
    orderBy: { sentAt: 'desc' },
    take: 30,
  });

  return NextResponse.json({ settings, emailLogs });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { key, value } = await req.json();

    const setting = await db.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
