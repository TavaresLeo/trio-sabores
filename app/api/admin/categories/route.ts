import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { verifyAdmin } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2).max(60),
  sortOrder: z.number().int().min(0).max(999).optional(),
  active: z.boolean().optional(),
});

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || 'categoria';
  const taken = await db.category.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } });
  const used = new Set(taken.map((category) => category.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function POST(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  try {
    const body = schema.parse(await req.json());
    const duplicate = await db.category.findFirst({
      where: { name: { equals: body.name, mode: 'insensitive' } },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: 'Já existe uma categoria com esse nome.' }, { status: 409 });

    const last = await db.category.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const category = await db.category.create({
      data: {
        name: body.name,
        slug: await uniqueSlug(body.name),
        sortOrder: body.sortOrder ?? (last ? last.sortOrder + 1 : 0),
        active: body.active ?? true,
      },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao criar categoria.' }, { status: 400 });
  }
}
