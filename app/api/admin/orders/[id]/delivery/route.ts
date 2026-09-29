import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAdmin } from '@/lib/auth';
import { quoteDelivery } from '@/lib/delivery';
import { db } from '@/lib/db';

const schema = z.object({ distanceKm: z.number().min(0).max(100) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: 'Informe a distância conferida.' }, { status: 400 });
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: 'Distância inválida.' }, { status: 400 });

  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, status: true, fulfillmentType: true, subtotalCents: true, discountCents: true },
  });
  if (!order) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  if (order.status !== 'PENDING' || order.fulfillmentType !== 'DELIVERY') {
    return NextResponse.json({ error: 'Este pedido não aguarda conferência de entrega.' }, { status: 409 });
  }

  const quote = await quoteDelivery(parsed.data.distanceKm);
  if (!quote.available) return NextResponse.json({ error: quote.message }, { status: 422 });
  const totalCents = Math.max(0, order.subtotalCents + quote.feeCents - order.discountCents);
  const updated = await db.order.updateMany({
    where: { id, status: 'PENDING', fulfillmentType: 'DELIVERY' },
    data: { distanceKm: quote.distanceKm, deliveryFeeCents: quote.feeCents, totalCents, status: 'CONFIRMED' },
  });
  if (updated.count !== 1) {
    return NextResponse.json({ error: 'O pedido foi alterado. Atualize a página e tente novamente.' }, { status: 409 });
  }

  return NextResponse.json({ ok: true, distanceKm: quote.distanceKm, deliveryFeeCents: quote.feeCents, totalCents });
}
