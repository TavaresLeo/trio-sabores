import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Guarda de navegação para o painel administrativo.
 *
 * Verifica apenas a assinatura/validade do JWT e o papel `ADMIN` — a autorização
 * definitiva (inclusive `sessionVersion` e `mustChangePassword`) continua sendo
 * feita no servidor, em cada página e em cada rota `/api/admin/*`, via
 * `verifyAdmin()`. Esta camada só evita renderizar o shell do painel para
 * visitantes anônimos.
 */
const ADMIN_COOKIE = 'trio_admin';

async function hasValidAdminToken(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    return payload.role === 'ADMIN' && typeof payload.sub === 'string';
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout'
  ) {
    return NextResponse.next();
  }

  if (await hasValidAdminToken(request)) return NextResponse.next();

  if (pathname.startsWith('/api/admin')) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  return NextResponse.redirect(new URL('/admin/login', request.url));
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
