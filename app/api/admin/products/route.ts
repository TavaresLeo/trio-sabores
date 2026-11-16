import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';
import { isSafeImageUrl } from '@/lib/validators';
import { crossOriginRejected, isSameOrigin, jsonError, newRequestId, serverError } from '@/lib/http';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120),
  description: z.string().trim().min(5).max(500),
  priceCents: z.number().int().positive().max(100_000_000),
  imageUrl: z.string().trim().min(1).max(500).refine(isSafeImageUrl, 'Informe uma URL de imagem válida.'),
  categoryId: z.string().min(1),
  badge: z.string().trim().max(40).nullable().optional(),
  featured: z.boolean().optional(),
});

export async function POST(req: Request) {
  const requestId = newRequestId();
  if (!isSameOrigin(req)) return crossOriginRejected(requestId);
  if (!(await verifyAdmin())) return jsonError('Não autorizado.', 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError('Dados inválidos.', 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError('Confira os dados do produto.', 400);
  }

  try {
    const category = await db.category.findUnique({ where: { id: parsed.data.categoryId }, select: { id: true } });
    if (!category) return jsonError('Categoria não encontrada.', 404);

    const product = await db.product.create({ data: parsed.data });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return serverError(requestId, 'admin_create_product', error);
  }
}
