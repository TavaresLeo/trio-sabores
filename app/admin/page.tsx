import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowUpRight, ShoppingBag, Users, Wallet } from 'lucide-react';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';

export default async function Admin() {
  if (!await verifyAdmin()) redirect('/admin/login');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const [ordersToday, productCount, revenue, customers, weekOrders, recentOrders] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.product.count(),
    db.order.aggregate({ where: { status: { not: 'CANCELLED' } }, _sum: { totalCents: true } }),
    db.order.groupBy({ by: ['customerEmail'] }),
    db.order.findMany({ where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } }, select: { createdAt: true } }),
    db.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }),
  ]);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return {
      date,
      label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
      count: weekOrders.filter((order) => order.createdAt.toDateString() === date.toDateString()).length,
    };
  });
  const maxCount = Math.max(...days.map((day) => day.count), 1);
  const points = days.map((day, index) => `${36 + index * 82},${140 - (day.count / maxCount) * 105}`).join(' ');

  return (
    <main className="admin-dashboard">
      <div className="admin-page-title"><div><span>VISÃO GERAL</span><h1>Dashboard</h1></div><p>Resumo da sua loja Trio Sabores</p></div>
      <section className="admin-stat-grid">
        <Stat title="Total de Pedidos" value={String(ordersToday)} caption="Pedidos recebidos hoje" Icon={ShoppingBag} />
        <Stat title="Faturamento" value={formatBRL(revenue._sum.totalCents ?? 0)} caption="Acumulado em pedidos" Icon={Wallet} />
        <Stat title="Clientes" value={String(customers.length)} caption="Clientes com pedidos" Icon={Users} />
      </section>
      <section className="admin-dashboard-grid">
        <div className="admin-dashboard-card admin-chart-card">
          <div className="admin-card-heading"><div><h2>Pedidos</h2><p>Últimos 7 dias</p></div><Link href="/admin/pedidos" aria-label="Ver todos os pedidos"><ArrowUpRight size={18} /></Link></div>
          <div className="admin-chart">
            <div className="admin-chart-y"><span>{maxCount}</span><span>{Math.ceil(maxCount / 2)}</span><span>0</span></div>
            <svg viewBox="0 0 520 160" role="img" aria-label="Quantidade de pedidos dos últimos sete dias">
              <path d="M36 35H528M36 88H528M36 140H528" className="chart-gridline" />
              <polyline points={points} className="chart-line" />
              {days.map((day, index) => <circle key={day.label} cx={36 + index * 82} cy={140 - (day.count / maxCount) * 105} r="4" className="chart-dot" />)}
            </svg>
          </div>
          <div className="admin-chart-x">{days.map((day, index) => <span key={`${day.label}-${index}`}>{day.label}</span>)}</div>
        </div>
        <div className="admin-dashboard-card admin-products-card">
          <div className="admin-card-heading"><div><h2>Produtos</h2><p>Itens no seu cardápio</p></div><Link href="/admin/produtos" aria-label="Gerenciar produtos"><ArrowUpRight size={18} /></Link></div>
          <div className="admin-product-total">{productCount}</div>
          <div className="admin-product-progress"><span style={{ width: `${Math.min(100, productCount * 10)}%` }} /></div>
          <Link className="admin-manage-link" href="/admin/produtos">Gerenciar produtos</Link>
        </div>
      </section>
      <section className="admin-dashboard-card admin-recent-orders">
        <div className="admin-card-heading"><div><h2>Pedidos Recentes</h2><p>Últimos pedidos recebidos</p></div><Link href="/admin/pedidos" className="admin-manage-link">Ver todos</Link></div>
        {recentOrders.length === 0 ? <p className="admin-empty-state">Os pedidos recentes aparecerão aqui.</p> : (
          <div className="admin-table-wrap"><table className="admin-orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Itens</th><th>Status</th><th>Total</th></tr></thead><tbody>
            {recentOrders.map((order) => <tr key={order.id}>
              <td>{order.publicNumber}</td><td>{order.customerName}</td>
              <td>{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(', ')}</td>
              <td><span className={`status-pill ${order.status === 'DELIVERED' ? 'status-green' : order.status === 'CANCELLED' ? 'status-red' : 'status-yellow'}`}>{order.status.replaceAll('_', ' ')}</span></td>
              <td>{formatBRL(order.totalCents)}</td>
            </tr>)}
          </tbody></table></div>
        )}
      </section>
    </main>
  );
}

function Stat({
  title, value, caption, Icon,
}: {
  title: string; value: string; caption: string; Icon: typeof ShoppingBag;
}) {
  return <article className="admin-stat-card"><div className="admin-stat-icon"><Icon size={19} /></div><span>{title}</span><strong>{value}</strong><small>{caption}</small></article>;
}
