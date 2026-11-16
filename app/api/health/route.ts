import { NextResponse } from 'next/server';

/**
 * Liveness público: confirma apenas que o processo HTTP está respondendo.
 * Não consulta o banco nem devolve timestamp, versão, host ou mensagens internas.
 * A verificação de conectividade com o banco fica em `/api/admin/health`,
 * protegida por sessão administrativa.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { status: 'ok' },
    { status: 200, headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
