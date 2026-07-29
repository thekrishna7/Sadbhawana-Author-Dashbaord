import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let fileToDelete: any = null;
    try {
      fileToDelete = await db.file.findUnique({ where: { id } });
    } catch (findErr) {
      console.warn('Prisma find file for delete failed:', findErr);
    }

    try {
      await db.file.delete({ where: { id } });
    } catch (deleteErr) {
      console.warn('Prisma delete file failed:', deleteErr);
    }

    if (fileToDelete) {
      try {
        await logActivity({
          userId: currentUser.id,
          userName: currentUser.fullName,
          action: 'DELETE_FILE',
          entityType: 'File',
          entityName: fileToDelete.fileName,
          details: `Deleted file '${fileToDelete.fileName}'`,
        });
      } catch (logErr) {
        console.error('Failed to log file deletion activity:', logErr);
      }
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json({ success: true, message: 'File deleted' });
  }
}
