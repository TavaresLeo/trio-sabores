import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { NO_STORE, jsonError, logServerError, newRequestId } from '@/lib/http';

/**
 * Readiness protegido: apenas administradores autenticados podem verificar a
 * conectividade com o banco. A resposta não inclui mensagens do PostgreSQL,
 * credenciais, host ou detalhes de execução.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const requestId = newRequestId();
  if (!(await verifyAdmin())) return jsonError('Não autorizado.', 401);

  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'ok' }, { headers: NO_STORE });
  } catch (error) {
    logServerError('admin_health_database_check', error, requestId);
    return NextResponse.json(
      { status: 'degraded', database: 'error' },
      { status: 503, headers: { ...NO_STORE, 'x-request-id': requestId } },
    );
  }
}
