import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const book = await db.book.findUnique({
    where: { id },
    include: {
      assignments: {
        include: {
          author: {
            select: { id: true, fullName: true, username: true, email: true, phone: true, avatarUrl: true },
          },
        },
      },
      files: {
        include: {
          uploader: {
            select: { id: true, fullName: true, role: true, avatarUrl: true },
          },
          versions: {
            orderBy: { version: 'desc' },
          },
          changeRequests: {
            include: {
              user: { select: { fullName: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  if (currentUser.role === 'AUTHOR') {
    const isAssigned = book.assignments.some((a: any) => a.authorId === currentUser.id);
    if (!isAssigned) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json({ book });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, isbn, publicationDate, language, edition, bookType, status, description, coverImageUrl, assignedAuthorIds } = await req.json();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (isbn !== undefined) updateData.isbn = isbn || null;
    if (publicationDate !== undefined) updateData.publicationDate = publicationDate || null;
    if (language) updateData.language = language;
    if (edition) updateData.edition = edition;
    if (bookType) updateData.bookType = bookType;
    if (status) updateData.status = status;
    if (description !== undefined) updateData.description = description;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;

    const updatedBook = await db.book.update({
      where: { id },
      data: updateData,
    });

    if (Array.isArray(assignedAuthorIds)) {
      await db.bookAssignment.deleteMany({ where: { bookId: id } });
      if (assignedAuthorIds.length > 0) {
        await db.bookAssignment.createMany({
          data: assignedAuthorIds.map((authorId: string) => ({
            bookId: id,
            authorId,
          })),
        });
      }
    }

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'UPDATE_BOOK',
      entityType: 'Book',
      entityName: updatedBook.name,
      details: `Updated book information for '${updatedBook.name}'`,
    });

    return NextResponse.json({ success: true, book: updatedBook });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const book = await db.book.findUnique({ where: { id } });
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    await db.book.delete({ where: { id } });

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'DELETE_BOOK',
      entityType: 'Book',
      entityName: book.name,
      details: `Deleted book '${book.name}'`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }
}
