import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authCookieOptions, authCookies, hashPassword, verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const passwordSchema = z.string().min(8).max(72).refine((value) => new TextEncoder().encode(value).byteLength <= 72);
const schema = z.object({ currentPassword: passwordSchema, newPassword: passwordSchema });

export async function POST(req: Request) {
  const admin = await verifyAdmin(true);
  if (!admin) return NextResponse.json({ error: 'Sessão administrativa inválida.' }, { status: 401 });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'As senhas devem ter pelo menos 8 caracteres e até 72 bytes.' }, { status: 400 });
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json({ error: 'Escolha uma senha diferente da atual.' }, { status: 400 });
  }

  const currentAdmin = await db.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!currentAdmin || !(await bcrypt.compare(parsed.data.currentPassword, currentAdmin.passwordHash))) {
    return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 401 });
  }

  await db.user.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(authCookies.admin, '', authCookieOptions(0));
  return response;
}
