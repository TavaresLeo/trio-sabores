import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

const ADMIN_COOKIE = 'trio_admin';
const USER_COOKIE = 'trio_user';

function getSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || new TextEncoder().encode(value).byteLength < 32) {
    throw new Error('JWT_SECRET must contain at least 32 UTF-8 bytes.');
  }
  return new TextEncoder().encode(value);
}

export function assertAuthConfiguration() {
  getSecret();
}

async function signToken(userId: string, role: 'ADMIN' | 'USER', sessionVersion: number) {
  return new SignJWT({ sub: userId, role, sv: sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getSecret());
}

export async function signAdminToken(userId: string, sessionVersion: number) {
  return signToken(userId, 'ADMIN', sessionVersion);
}

export async function signUserToken(userId: string, sessionVersion: number) {
  return signToken(userId, 'USER', sessionVersion);
}

async function readSession(cookieName: string, role: 'ADMIN' | 'USER') {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;

  const secret = getSecret();
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, secret));
  } catch {
    return null;
  }

  if (payload.role !== role || typeof payload.sub !== 'string' || typeof payload.sv !== 'number') return null;
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, phone: true, role: true, sessionVersion: true, mustChangePassword: true },
  });
  if (!user || user.role !== role || user.sessionVersion !== payload.sv) return null;
  return user;
}

export async function verifyAdmin(allowPasswordChangeRequired = false) {
  const user = await readSession(ADMIN_COOKIE, 'ADMIN');
  if (!user || (user.mustChangePassword && !allowPasswordChangeRequired)) return null;
  return user;
}

export async function verifyUser() {
  return readSession(USER_COOKIE, 'USER');
}

export async function checkAdminCredentials(login: string, password: string) {
  const email = login.trim().toLowerCase() === 'admin' ? 'admin@triosabores.local' : login.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.role !== 'ADMIN') return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

export async function checkUserCredentials(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.role !== 'USER') return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

export async function hashPassword(password: string) {
  if (new TextEncoder().encode(password).byteLength > 72) {
    throw new Error('A senha não pode exceder 72 bytes em UTF-8.');
  }
  return bcrypt.hash(password, 12);
}

export const authCookies = { admin: ADMIN_COOKIE, user: USER_COOKIE };

export function authCookieOptions(maxAge = 60 * 60 * 2) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge };
}
