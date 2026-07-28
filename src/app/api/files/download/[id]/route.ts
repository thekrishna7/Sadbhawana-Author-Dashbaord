import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import path from 'path';
import fs from 'fs/promises';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const file = await db.file.findUnique({
      where: { id },
      include: { book: true },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Increment download count
    await db.file.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'DOWNLOAD_FILE',
      entityType: 'File',
      entityName: file.fileName,
      details: `Downloaded file '${file.fileName}' (v${file.version})`,
    });

    // Check local disk file
    let fileBuffer: Buffer;
    const localPath = path.join(process.cwd(), 'public', file.filePath.replace('/uploads/', 'uploads/'));

    try {
      fileBuffer = await fs.readFile(localPath);
    } catch {
      // Fallback sample content buffer if local mock file missing
      fileBuffer = Buffer.from(`Sadbhawana Publication Sample Document\nFile: ${file.fileName}\nBook: ${file.book.name}\nVersion: ${file.version}\nUploaded by user ID: ${file.uploaderId}`);
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Disposition': `attachment; filename="${file.fileName}"`,
        'Content-Type': 'application/octet-stream',
      },
    });
  } catch (error: any) {
    console.error('File download error:', error);
    return NextResponse.json({ error: 'Download failed' }, { status: 500 });
  }
}
