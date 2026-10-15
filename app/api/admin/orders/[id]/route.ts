import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';

const statusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { id } = await params;
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Status do pedido inválido.' }, { status: 400 });
  }

  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  const updated = await db.order.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true, order: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  const { id } = await params;
  const result = await db.order.deleteMany({ where: { id } });
  if (result.count === 0) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

  return NextResponse.json({ ok: true });
}
