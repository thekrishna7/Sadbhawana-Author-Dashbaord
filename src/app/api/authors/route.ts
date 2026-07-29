import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const authors = await db.user.findMany({
    where: { role: 'AUTHOR' },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assignments: {
        include: {
          book: {
            select: {
              id: true,
              name: true,
              isbn: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ authors });
}

export async function POST(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { fullName, username, email, password, phone, avatarUrl, assignedBookIds, status } = await req.json();

    if (!fullName || !username || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields: Name, Username, Email, Password' }, { status: 400 });
    }

    // Check unique username & email
    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, { email: email.toLowerCase() }],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username or Email is already registered' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const author = await db.user.create({
      data: {
        fullName,
        username,
        email: email.toLowerCase(),
        passwordHash,
        phone: phone || null,
        avatarUrl: avatarUrl || null,
        role: 'AUTHOR',
        status: status || 'ACTIVE',
      },
    });

    // Handle book assignments
    if (Array.isArray(assignedBookIds) && assignedBookIds.length > 0) {
      try {
        const assignmentData = assignedBookIds.map((bookId: string) => ({
          bookId,
          authorId: author.id,
        }));
        await db.bookAssignment.createMany({
          data: assignmentData,
        });

        // Send notifications for each book
        for (const bookId of assignedBookIds) {
          try {
            const book = await db.book.findUnique({ where: { id: bookId } });
            if (book) {
              await createNotification({
                userId: author.id,
                title: 'Book Assigned',
                message: `Admin assigned "${book.name}" to your portal. Login to review received files.`,
                type: 'BOOK_ASSIGNED',
                linkUrl: '/author/books',
              });
            }
          } catch (notifErr) {
            console.error('Failed to create book assignment notification:', notifErr);
          }
        }
      } catch (assignErr) {
        console.error('Failed to assign books:', assignErr);
      }
    }

    try {
      await logActivity({
        userId: currentUser.id,
        userName: currentUser.fullName,
        action: 'CREATE_AUTHOR',
        entityType: 'User',
        entityName: author.fullName,
        details: `Created author account username: ${author.username}`,
      });
    } catch (logErr) {
      console.error('Failed to log activity:', logErr);
    }

    return NextResponse.json({ success: true, author });
  } catch (error: any) {
    console.error('Create author error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create author' }, { status: 500 });
  }
}
