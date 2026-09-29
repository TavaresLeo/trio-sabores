import { redirect } from 'next/navigation';
import { AdminDeliveryReview } from '@/components/admin-delivery-review';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';

export default async function AdminPedidos() {
  if (!await verifyAdmin()) redirect('/admin/login');
  const orders = await db.order.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 50,
    include: { items: true, address: true },
  });

  return (
    <main className="min-h-[70vh] bg-[#f5f1e9] px-5 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-serif text-4xl text-wine">Gerenciar pedidos</h1>
        <p className="mt-2 text-sm text-brown/60">Pedidos de entrega ficam pendentes até a conferência manual da distância e da taxa.</p>
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="form-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <b>{order.publicNumber}</b>
                  <div className="text-xs text-brown/60">{order.customerName} • {new Date(order.createdAt).toLocaleString('pt-BR')}</div>
                </div>
                <span className="status-pill status-yellow">{order.status === 'PENDING' && order.fulfillmentType === 'DELIVERY' ? 'Aguardando taxa' : order.status}</span>
                <b>{formatBRL(order.totalCents)}</b>
              </div>
              <div className="mt-3 text-sm text-brown/70">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' • ')}</div>
              {order.address && (
                <p className="mt-2 text-sm text-brown/70">
                  Entrega: {order.address.street}, {order.address.number}
                  {order.address.complement ? `, ${order.address.complement}` : ''} · {order.address.neighborhood}, {order.address.city}/{order.address.state} · CEP {order.address.cep}
                </p>
              )}
              {order.status === 'PENDING' && order.fulfillmentType === 'DELIVERY' && (
                <AdminDeliveryReview orderId={order.id} estimatedDistanceKm={order.distanceKm === null ? null : Number(order.distanceKm)} />
              )}
            </article>
          ))}
          {orders.length === 0 && <p className="form-card text-sm text-brown/60">Ainda não há pedidos.</p>}
        </div>
      </div>
    </main>
  );
}
