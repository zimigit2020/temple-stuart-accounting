import { NextRequest } from 'next/server';
import { decode, encode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export interface UserPayload {
  userId: string;
  email?: string;
}

function getJwtSecret(): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return JWT_SECRET;
}

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return null;
    }

    const decoded = await decode({
      token,
      secret: getJwtSecret(),
    }) as UserPayload | null;

    if (!decoded?.userId) {
      return null;
    }

    return decoded.userId;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

export async function createAuthToken(userId: string, email?: string): Promise<string> {
  return encode({
    token: { userId, email } as JWT,
    secret: getJwtSecret(),
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

export function setAuthCookie(token: string) {
  return {
    'Set-Cookie': `auth-token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${7 * 24 * 60 * 60}; ${
      process.env.NODE_ENV === 'production' ? 'Secure;' : ''
    }`
  };
}
