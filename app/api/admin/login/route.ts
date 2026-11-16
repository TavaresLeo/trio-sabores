import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authCookieOptions, authCookies, checkAdminCredentials, signAdminToken } from '@/lib/auth';
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
  login: z.string().trim().min(1).max(150),
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
  if (!parsed.success) return jsonError('Dados inválidos.', 400);

  const ipKey = rateLimitKey('admin-login:ip', clientIp(req));
  const accountKey = rateLimitKey('admin-login:account', parsed.data.login);
  const rule = RATE_LIMITS.adminLogin;

  try {
    const ipStatus = await getRateLimitStatus(ipKey, rule);
    if (!ipStatus.allowed) {
      logSecurityEvent('admin_login_blocked', { requestId, scope: 'ip' });
      return rateLimited(ipStatus.retryAfterSeconds, requestId);
    }
    // Limite adicional por conta: não revela se a conta existe.
    const accountStatus = await getRateLimitStatus(accountKey, rule);
    if (!accountStatus.allowed) {
      logSecurityEvent('admin_login_blocked', { requestId, scope: 'account' });
      return rateLimited(accountStatus.retryAfterSeconds, requestId);
    }
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, 'admin_login_rate_limit', error);
  }

  let user: Awaited<ReturnType<typeof checkAdminCredentials>> = null;
  try {
    user = await checkAdminCredentials(parsed.data.login, parsed.data.password);
  } catch (error) {
    return serverError(requestId, 'admin_login_credentials', error);
  }

  if (!user) {
    try {
      const ipAfter = await registerRateLimitAttempt(ipKey, rule);
      const accountAfter = await registerRateLimitAttempt(accountKey, rule);
      logSecurityEvent('admin_login_failed', { requestId });
      if (!ipAfter.allowed || !accountAfter.allowed) {
        return rateLimited(Math.max(ipAfter.retryAfterSeconds, accountAfter.retryAfterSeconds), requestId);
      }
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    }
    return jsonError('Credenciais inválidas.', 401);
  }

  await resetRateLimit(accountKey);

  const token = await signAdminToken(user.id, user.sessionVersion);
  const response = NextResponse.json(
    { ok: true, mustChangePassword: user.mustChangePassword },
    { headers: NO_STORE },
  );
  response.cookies.set(authCookies.admin, token, authCookieOptions());
  logSecurityEvent('admin_login_success', { requestId });
  return response;
}
