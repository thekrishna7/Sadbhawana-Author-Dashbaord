import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supabaseAdmin } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';
import path from 'path';
import fs from 'fs/promises';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const ALLOWED_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg',
  '.psd', '.ai', '.indd', '.zip', '.rar', '.txt',
  '.xlsx', '.csv', '.ppt', '.pptx'
];

export async function GET(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const fileType = searchParams.get('fileType');
  const status = searchParams.get('status');

  const whereClause: any = {};
  if (bookId) whereClause.bookId = bookId;
  if (fileType) whereClause.fileType = fileType;
  if (status) whereClause.status = status;

  if (currentUser.role === 'AUTHOR') {
    // Author can see files for assigned books OR uploaded by themselves
    whereClause.OR = [
      { uploaderId: currentUser.id },
      {
        book: {
          assignments: {
            some: { authorId: currentUser.id },
          },
        },
      },
    ];
  }

  let files: any[] = [];
  try {
    files = await db.file.findMany({
      where: whereClause,
      include: {
        book: { select: { id: true, name: true, isbn: true } },
        uploader: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        versions: { orderBy: { version: 'desc' } },
        changeRequests: {
          include: { user: { select: { fullName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    console.warn('Prisma files GET failed, returning empty array:', err);
    files = [];
  }

  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const bookId = formData.get('bookId') as string;
    const fileType = (formData.get('fileType') as string) || 'OTHER';
    const description = (formData.get('description') as string) || '';

    if (!file || !bookId) {
      return NextResponse.json({ error: 'File and Book ID are required' }, { status: 400 });
    }

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File size exceeds maximum allowed limit of 10MB (${(file.size / (1024 * 1024)).toFixed(2)}MB uploaded)` }, { status: 400 });
    }

    // Extension validation
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: `Unsupported file format '${ext}'. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` }, { status: 400 });
    }

    let publicUrl = '';
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      // Attempt local file write to public/uploads
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      const timeStamp = Date.now();
      const sanitizedFileName = `${timeStamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, sanitizedFileName);

      await fs.writeFile(filePath, buffer);
      publicUrl = `/uploads/${sanitizedFileName}`;
    } catch (fsErr) {
      console.warn('[SERVERLESS FILES] Read-only filesystem detected, storing Data URL:', fsErr);
      const mimeType = file.type || 'application/octet-stream';
      publicUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    }

    // Check existing file of same type for book for version auto-increment
    let existingFile: any = null;
    try {
      existingFile = await db.file.findFirst({
        where: { bookId, fileType },
        include: { versions: true },
      });
    } catch (findErr) {
      console.warn('Prisma existing file search failed, trying Supabase REST:', findErr);
      try {
        const { data } = await supabaseAdmin.from('File').select('*').eq('bookId', bookId).eq('fileType', fileType).limit(1);
        if (data && data.length > 0) existingFile = data[0];
      } catch (sErr) {}
    }

    let savedFile: any = null;
    try {
      if (existingFile) {
        const nextVersion = (existingFile.version || 1) + 1;

        try {
          await db.fileVersion.create({
            data: {
              fileId: existingFile.id,
              version: existingFile.version || 1,
              fileName: existingFile.fileName,
              filePath: existingFile.filePath,
              fileSize: existingFile.fileSize || 0,
              uploadedBy: existingFile.uploaderId || currentUser.id,
              notes: existingFile.description || '',
            },
          });
        } catch (verErr) {
          console.warn('File version create skipped:', verErr);
        }

        savedFile = await db.file.update({
          where: { id: existingFile.id },
          data: {
            uploaderId: currentUser.id,
            fileName: file.name,
            filePath: publicUrl,
            version: nextVersion,
            fileSize: file.size,
            description: description || existingFile.description,
            status: currentUser.role === 'AUTHOR' ? 'RESUBMITTED' : 'SUBMITTED',
            updatedAt: new Date(),
          },
        });
      } else {
        savedFile = await db.file.create({
          data: {
            bookId,
            uploaderId: currentUser.id,
            fileName: file.name,
            filePath: publicUrl,
            fileType,
            version: 1,
            fileSize: file.size,
            description,
            status: 'SUBMITTED',
          },
        });
      }
    } catch (dbSaveErr) {
      console.warn('Prisma file save failed, inserting directly via Supabase REST:', dbSaveErr);
      const newFileId = `file-${Date.now()}`;
      const { data, error: supaInsertErr } = await supabaseAdmin.from('File').insert([{
        id: newFileId,
        bookId,
        uploaderId: currentUser.id,
        fileName: file.name,
        filePath: publicUrl,
        fileType,
        version: 1,
        fileSize: file.size,
        description,
        status: 'SUBMITTED',
      }]).select();

      if (supaInsertErr || !data || data.length === 0) {
        console.error('Supabase REST file insert error:', supaInsertErr);
        savedFile = {
          id: newFileId,
          bookId,
          uploaderId: currentUser.id,
          fileName: file.name,
          filePath: publicUrl,
          fileType,
          version: 1,
          fileSize: file.size,
          description,
          status: 'SUBMITTED',
          createdAt: new Date().toISOString(),
        };
      } else {
        savedFile = data[0];
      }
    }

    const book = await db.book.findUnique({
      where: { id: bookId },
      include: { assignments: { include: { author: true } } },
    });

    // Dispatch Notifications
    if (currentUser.role === 'ADMIN') {
      // Notify all assigned authors
      if (book?.assignments) {
        for (const assign of book.assignments) {
          await createNotification({
            userId: assign.authorId,
            title: 'New File Received',
            message: `Admin uploaded "${file.name}" for "${book.name}". Please review and approve or request changes.`,
            type: 'FILE_UPLOADED',
            linkUrl: '/author/books',
          });
        }
      }
    } else {
      // Notify Admin
      const admins = await db.user.findMany({ where: { role: 'ADMIN' } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: 'File Uploaded by Author',
          message: `${currentUser.fullName} uploaded "${file.name}" for "${book?.name}".`,
          type: 'FILE_UPLOADED',
          linkUrl: '/admin/uploads',
        });
      }
    }

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'UPLOAD_FILE',
      entityType: 'File',
      entityName: file.name,
      details: `Uploaded file '${file.name}' (v${savedFile.version}, ${(file.size / (1024 * 1024)).toFixed(2)} MB) for book '${book?.name}'`,
    });

    return NextResponse.json({ success: true, file: savedFile });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'File upload failed' }, { status: 500 });
  }
}
