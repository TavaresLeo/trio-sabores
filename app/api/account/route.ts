import { NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const user = await verifyUser();
  if (!user) return NextResponse.json({ error: 'Entre na sua conta para continuar.' }, { status: 401 });

  const [addresses, orders, orderCount] = await Promise.all([
    db.address.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, label: true, cep: true, street: true, number: true, complement: true, neighborhood: true, city: true, state: true },
    }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, publicNumber: true, status: true, totalCents: true, createdAt: true,
        items: { select: { id: true, productName: true, quantity: true } },
        address: { select: { street: true, number: true, neighborhood: true, city: true, state: true } },
      },
    }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone },
    addresses,
    orders,
    orderCount,
  });
}
