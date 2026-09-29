import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authCookieOptions, authCookies, checkUserCredentials, signUserToken } from '@/lib/auth';

const schema = z.object({
  email: z.string().trim().email().max(150),
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
    return NextResponse.json({ error: 'Informe um e-mail e senha válidos.' }, { status: 400 });
  }

  const user = await checkUserCredentials(parsed.data.email, parsed.data.password);
  if (!user) return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
  const token = await signUserToken(user.id, user.sessionVersion);
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  response.cookies.set(authCookies.user, token, authCookieOptions());
  return response;
}
