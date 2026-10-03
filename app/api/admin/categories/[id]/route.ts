import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const { id } = await params;
  try {
    const body = schema.parse(await req.json());
    if (body.name) {
      const duplicate = await db.category.findFirst({
        where: { name: { equals: body.name, mode: 'insensitive' }, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) return NextResponse.json({ error: 'Já existe uma categoria com esse nome.' }, { status: 409 });
    }
    const category = await db.category.update({ where: { id }, data: body });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Categoria não encontrada ou dados inválidos.' }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  const { id } = await params;
  const products = await db.product.count({ where: { categoryId: id } });
  if (products > 0) {
    return NextResponse.json(
      { error: 'Mova ou exclua os produtos dessa categoria antes de removê-la.' },
      { status: 409 },
    );
  }
  try {
    await db.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 });
  }
}
