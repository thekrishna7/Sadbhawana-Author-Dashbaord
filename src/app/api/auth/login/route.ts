import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { logActivity } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { usernameOrEmail, password, rememberMe } = await req.json();

    if (!usernameOrEmail || !password) {
      return NextResponse.json({ error: 'Username/Email and Password are required' }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { username: usernameOrEmail.trim() },
          { email: usernameOrEmail.trim().toLowerCase() },
        ],
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Account is deactivated. Please contact Admin.' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const sessionData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role as 'ADMIN' | 'AUTHOR',
      status: user.status as 'ACTIVE' | 'INACTIVE',
      avatarUrl: user.avatarUrl,
    };

    await createSession(sessionData, rememberMe ?? true);

    try {
      await logActivity({
        userId: user.id,
        userName: user.fullName,
        action: 'LOGIN',
        entityType: 'User',
        entityName: user.username,
        details: `User logged in successfully as ${user.role}`,
      });
    } catch (logErr) {
      console.error('Activity log error:', logErr);
    }

    return NextResponse.json({ success: true, user: sessionData });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error. Please check environment variables.' },
      { status: 500 }
    );
  }
}
