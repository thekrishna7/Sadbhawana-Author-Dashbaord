import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import { createNotification } from '@/lib/notifications';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.id !== id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { fullName, phone, avatarUrl, status, newPassword, assignedBookIds } = await req.json();

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (status && currentUser.role === 'ADMIN') updateData.status = status;

    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
    });

    // Update book assignments if provided by Admin
    if (currentUser.role === 'ADMIN' && Array.isArray(assignedBookIds)) {
      // Remove old assignments
      await db.bookAssignment.deleteMany({
        where: { authorId: id },
      });

      // Add new assignments
      if (assignedBookIds.length > 0) {
        await db.bookAssignment.createMany({
          data: assignedBookIds.map((bookId: string) => ({
            bookId,
            authorId: id,
          })),
        });
      }
    }

    if (newPassword) {
      await createNotification({
        userId: id,
        title: 'Password Changed',
        message: 'Your account password was updated successfully.',
        type: 'PASSWORD_CHANGED',
      });
    }

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'UPDATE_AUTHOR',
      entityType: 'User',
      entityName: updatedUser.fullName,
      details: `Updated author profile details for ${updatedUser.username}`,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Update author error:', error);
    return NextResponse.json({ error: 'Failed to update author' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUser = await getCurrentUser();
  const { id } = await params;

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userToDelete = await db.user.findUnique({ where: { id } });
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db.user.delete({ where: { id } });

    await logActivity({
      userId: currentUser.id,
      userName: currentUser.fullName,
      action: 'DELETE_AUTHOR',
      entityType: 'User',
      entityName: userToDelete.fullName,
      details: `Deleted author account: ${userToDelete.username}`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete author' }, { status: 500 });
  }
}
