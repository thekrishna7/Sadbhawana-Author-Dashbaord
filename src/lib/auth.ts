import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'sadbhawana-secret-key-production-2026';
const TOKEN_NAME = 'sadbhawana_session';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'AUTHOR';
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: UserSession, rememberMe: boolean = true) {
  const expiresIn = rememberMe ? '30d' : '1d';
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl && user.avatarUrl.length < 500 ? user.avatarUrl : null,
    },
    JWT_SECRET,
    { expiresIn }
  );

  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
  });

  return token;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_NAME);
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_NAME)?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;

    // Verify user still active in DB
    const user = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, fullName: true, role: true, status: true, avatarUrl: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role as 'ADMIN' | 'AUTHOR',
      status: user.status as 'ACTIVE' | 'INACTIVE',
      avatarUrl: user.avatarUrl,
    };
  } catch (error) {
    return null;
  }
}
