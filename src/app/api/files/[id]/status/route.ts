import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status, changeDetails } = await req.json();

    const file = await db.file.findUnique({
      where: { id },
      include: {
        book: { include: { assignments: true } },
        uploader: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const updatedFile = await db.file.update({
      where: { id },
      data: { status, updatedAt: new Date() },
    });

    if (status === 'CHANGES_REQUESTED' && changeDetails) {
      await db.changeRequest.create({
        data: {
          fileId: id,
          userId: currentUser.id,
          details: changeDetails,
          status: 'PENDING',
        },
      });

      // Notify Uploader
      await createNotification({
        userId: file.uploaderId,
        title: 'Changes Requested',
        message: `${currentUser.fullName} requested changes for "${file.fileName}": "${changeDetails}"`,
        type: 'CHANGES_REQUESTED',
        linkUrl: currentUser.role === 'ADMIN' ? '/author/books' : '/admin/uploads',
      });
    } else if (status === 'APPROVED') {
      // Notify Uploader
      await createNotification({
        userId: file.uploaderId,
        title: 'File Approved',
        message: `Great news! ${currentUser.fullName} approved "${file.fileName}".`,
        type: 'FILE_APPROVED',
        linkUrl: currentUser.role === 'ADMIN' ? '/author/books' : '/admin/uploads',
      });
    }

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: status === 'APPROVED' ? 'APPROVE_FILE' : status === 'CHANGES_REQUESTED' ? 'REQUEST_CHANGES' : 'UPDATE_FILE_STATUS',
      entityType: 'File',
      entityName: file.fileName,
      details: `File status changed to '${status}' by ${currentUser.fullName}`,
    });

    return NextResponse.json({ success: true, file: updatedFile });
  } catch (error: any) {
    console.error('File status error:', error);
    return NextResponse.json({ error: 'Failed to update file status' }, { status: 500 });
  }
}
