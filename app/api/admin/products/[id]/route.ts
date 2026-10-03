import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const schema = z.object({
  name: z.string().min(2).max(120).optional(),
  priceCents: z.number().int().positive().optional(),
  categoryId: z.string().min(1).optional(),
  availability: z.enum(['AVAILABLE', 'SOLD_OUT', 'PREORDER']).optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const { id } = await params;
  try {
    const body = schema.parse(await req.json());
    if (body.categoryId) {
      const category = await db.category.findUnique({ where: { id: body.categoryId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
    }
    const product = await db.product.update({ where: { id }, data: body });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: 'Produto não encontrado ou dados inválidos.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Não foi possível excluir.' }, { status: 400 });
  }
}
