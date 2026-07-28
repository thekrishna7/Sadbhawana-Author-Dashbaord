import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const notifications = await db.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await db.notification.count({
    where: { userId: currentUser.id, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await db.notification.updateMany({
        where: { userId: currentUser.id, read: false },
        data: { read: true },
      });
    } else if (notificationId) {
      await db.notification.updateMany({
        where: { id: notificationId, userId: currentUser.id },
        data: { read: true },
      });
    }

    const unreadCount = await db.notification.count({
      where: { userId: currentUser.id, read: false },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get('id');
    const clearAll = searchParams.get('clearAll');

    if (clearAll === 'true') {
      await db.notification.deleteMany({
        where: { userId: currentUser.id },
      });
    } else if (notificationId) {
      await db.notification.deleteMany({
        where: { id: notificationId, userId: currentUser.id },
      });
    }

    const unreadCount = await db.notification.count({
      where: { userId: currentUser.id, read: false },
    });

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
