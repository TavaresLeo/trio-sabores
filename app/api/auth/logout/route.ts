import { NextResponse } from 'next/server';
import { authCookieOptions, authCookies } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookies.user, '', authCookieOptions(0));
  return response;
}
