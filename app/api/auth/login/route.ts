import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authCookieOptions, authCookies, checkUserCredentials, signUserToken } from '@/lib/auth';
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
import {
  RATE_LIMITS,
  RateLimitUnavailableError,
  getRateLimitStatus,
  rateLimitKey,
  registerRateLimitAttempt,
  resetRateLimit,
} from '@/lib/rate-limit';

const schema = z.object({
  email: z.string().trim().email().max(150),
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
  if (!parsed.success) return jsonError('Informe um e-mail e senha válidos.', 400);

  const ipKey = rateLimitKey('user-login:ip', clientIp(req));
  const accountKey = rateLimitKey('user-login:account', parsed.data.email);
  const rule = RATE_LIMITS.userLogin;

  try {
    const ipStatus = await getRateLimitStatus(ipKey, rule);
    if (!ipStatus.allowed) return rateLimited(ipStatus.retryAfterSeconds, requestId);
    const accountStatus = await getRateLimitStatus(accountKey, rule);
    if (!accountStatus.allowed) return rateLimited(accountStatus.retryAfterSeconds, requestId);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, 'user_login_rate_limit', error);
  }

  let user: Awaited<ReturnType<typeof checkUserCredentials>> = null;
  try {
    user = await checkUserCredentials(parsed.data.email, parsed.data.password);
  } catch (error) {
    return serverError(requestId, 'user_login_credentials', error);
  }

  if (!user) {
    try {
      const ipAfter = await registerRateLimitAttempt(ipKey, rule);
      const accountAfter = await registerRateLimitAttempt(accountKey, rule);
      logSecurityEvent('user_login_failed', { requestId });
      if (!ipAfter.allowed || !accountAfter.allowed) {
        return rateLimited(Math.max(ipAfter.retryAfterSeconds, accountAfter.retryAfterSeconds), requestId);
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    }
    return jsonError('E-mail ou senha incorretos.', 401);
  }

  await resetRateLimit(accountKey);

  const token = await signUserToken(user.id, user.sessionVersion);
  const response = NextResponse.json(
    { user: { id: user.id, name: user.name, email: user.email, phone: user.phone } },
    { headers: NO_STORE },
  );
  response.cookies.set(authCookies.user, token, authCookieOptions());
  return response;
}
