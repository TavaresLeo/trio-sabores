import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAuthConfiguration, authCookieOptions, authCookies, hashPassword, signUserToken } from '@/lib/auth';
import { db } from '@/lib/db';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().min(10).max(20)
    .refine((value) => value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 15),
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
    return NextResponse.json({ error: 'Confira nome, e-mail, telefone e senha (mínimo de 8 caracteres).' }, { status: 400 });
  }
  assertAuthConfiguration();

  try {
    const user = await db.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        passwordHash: await hashPassword(parsed.data.password),
        role: 'USER',
      },
      select: { id: true, name: true, email: true, phone: true, sessionVersion: true },
    });
    const token = await signUserToken(user.id, user.sessionVersion);
    const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone } }, { status: 201 });
    response.cookies.set(authCookies.user, token, authCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este e-mail já possui cadastro. Entre na sua conta.' }, { status: 409 });
    }
    throw error;
  }
}
