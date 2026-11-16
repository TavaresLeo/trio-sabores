import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertAuthConfiguration, authCookieOptions, authCookies, hashPassword, signUserToken } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  NO_STORE,
  clientIp,
  crossOriginRejected,
  isSameOrigin,
  jsonError,
  logSecurityEvent,
  newRequestId,
  rateLimitUnavailable,
  rateLimited,
  serverError,
} from '@/lib/http';
import { RATE_LIMITS, RateLimitUnavailableError, rateLimitKey, registerRateLimitAttempt } from '@/lib/rate-limit';

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().min(10).max(20)
    .refine((value) => value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 15),
  password: z.string().min(8).max(72).refine((value) => new TextEncoder().encode(value).byteLength <= 72),
});

export async function POST(req: Request) {
  const requestId = newRequestId();
  if (!isSameOrigin(req)) return crossOriginRejected(requestId);

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonError('Dados inválidos.', 400);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return jsonError('Confira nome, e-mail, telefone e senha (mínimo de 8 caracteres).', 400);
  }

  try {
    const limit = await registerRateLimitAttempt(
      rateLimitKey('register:ip', clientIp(req)),
      RATE_LIMITS.register,
    );
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds, requestId);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, 'register_rate_limit', error);
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
    const response = NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, phone: user.phone } },
      { status: 201, headers: NO_STORE },
    );
    response.cookies.set(authCookies.user, token, authCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Mensagem neutra: não confirma explicitamente a existência do e-mail.
      logSecurityEvent('register_duplicate_email', { requestId });
      return jsonError(
        'Não foi possível concluir o cadastro com esses dados. Se já possui conta, entre com seu e-mail e senha.',
        409,
      );
    }
    return serverError(requestId, 'register_create_user', error);
  }
}
