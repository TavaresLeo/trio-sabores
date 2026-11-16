import { NextResponse } from 'next/server';

export const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' } as const;

export function newRequestId() {
  return globalThis.crypto.randomUUID();
}

/** IP do cliente atrás de proxy (Vercel envia x-forwarded-for). */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * Aceita apenas requisições same-origin para operações que alteram estado.
 * Requisições sem `Origin` (clientes não-navegador, curl, webhooks internos)
 * são permitidas; se houver `Origin`, ele precisa bater com o host da aplicação.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(message: string, status: number, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { ...NO_STORE, ...extraHeaders } });
}

export function crossOriginRejected(requestId: string) {
  logSecurityEvent('cross_origin_rejected', { requestId });
  return jsonError('Requisição não permitida.', 403);
}

export function rateLimited(retryAfterSeconds: number, requestId: string) {
  const retryAfter = Math.max(1, Math.ceil(retryAfterSeconds));
  logSecurityEvent('rate_limited', { requestId, retryAfter });
  return jsonError('Muitas tentativas. Aguarde alguns minutos e tente novamente.', 429, {
    'Retry-After': String(retryAfter),
  });
}

export function rateLimitUnavailable(requestId: string) {
  logServerError('rate_limit_store_unavailable', new Error('rate limit store unavailable'), requestId);
  return jsonError('Serviço temporariamente indisponível. Tente novamente em instantes.', 503);
}

/** Registro técnico interno. Nunca inclui senhas, tokens, e-mails ou corpos de requisição. */
export function logServerError(context: string, error: unknown, requestId?: string) {
  console.error(
    JSON.stringify({
      level: 'error',
      context,
      requestId,
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined,
    }),
  );
}

/** Evento de segurança estruturado, sem dados pessoais. */
export function logSecurityEvent(event: string, details: Record<string, string | number | boolean> = {}) {
  console.warn(JSON.stringify({ level: 'warn', event, ...details }));
}

export function serverError(requestId: string, context: string, error: unknown) {
  logServerError(context, error, requestId);
  return jsonError('Não foi possível concluir a operação. Tente novamente.', 500);
}
