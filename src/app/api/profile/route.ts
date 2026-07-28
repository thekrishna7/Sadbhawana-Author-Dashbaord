import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword, createSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fullName, phone, avatarUrl, email, newPassword } = await req.json();

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;

    if (avatarUrl !== undefined && avatarUrl !== null) {
      if (typeof avatarUrl === 'string' && avatarUrl.startsWith('data:image')) {
        // Extract base64 and save to public uploads directory
        const matches = avatarUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches[2]) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');

          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }

          const fileName = `avatar-${currentUser.id}.${ext}`;
          const filePath = path.join(uploadDir, fileName);
          await fs.writeFile(filePath, buffer);

          updateData.avatarUrl = `/uploads/avatars/${fileName}?v=${Date.now()}`;
        }
      } else {
        updateData.avatarUrl = avatarUrl;
      }
    }

    if (email) updateData.email = email.toLowerCase();

    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    // Update active cookie session safely
    await createSession({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      role: updatedUser.role as 'ADMIN' | 'AUTHOR',
      status: updatedUser.status as 'ACTIVE' | 'INACTIVE',
      avatarUrl: updatedUser.avatarUrl,
    });

    await logActivity({
      userId: currentUser.id,
      userName: updatedUser.fullName,
      action: 'UPDATE_PROFILE',
      entityType: 'User',
      entityName: updatedUser.username,
      details: 'Updated profile information and avatar photo',
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
