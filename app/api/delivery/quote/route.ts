import { NextResponse } from 'next/server';
import { quoteDelivery } from '@/lib/delivery';
import { jsonError, newRequestId, serverError } from '@/lib/http';

export async function POST(req: Request) {
  const requestId = newRequestId();

  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return jsonError('Dados inválidos.', 400);
  }

  const distanceKm = Number((input as { distanceKm?: unknown } | null)?.distanceKm);
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm > 100) {
    return jsonError('Informe uma distância válida.', 400);
  }

  try {
    const result = await quoteDelivery(distanceKm);
    return NextResponse.json(result, { status: result.available ? 200 : 422 });
  } catch (error) {
    return serverError(requestId, 'delivery_quote', error);
  }
}
