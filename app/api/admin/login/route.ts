import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authCookieOptions, authCookies, checkAdminCredentials, signAdminToken } from '@/lib/auth';

const schema = z.object({
  login: z.string().trim().min(1).max(150),
  password: z.string().min(8).max(72).refine((value) => new TextEncoder().encode(value).byteLength <= 72),
});

export async function POST(req: Request) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const user = await checkAdminCredentials(parsed.data.login, parsed.data.password);
  if (!user) return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
  const token = await signAdminToken(user.id, user.sessionVersion);
  const response = NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
  response.cookies.set(authCookies.admin, token, authCookieOptions());
  return response;
}
