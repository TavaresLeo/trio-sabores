import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { id } = await params;
  const result = await db.order.deleteMany({ where: { id } });
  if (result.count === 0) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
