import { redirect } from 'next/navigation';
import { ShoppingBag, UserCheck, Users, Wallet } from 'lucide-react';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';

type Customer = {
  email: string;
  name: string;
  phone: string | null;
  registered: boolean;
  orders: number;
  totalCents: number;
  lastOrderAt: Date;
};

const normalize = (email: string) => email.trim().toLowerCase();

export default async function AdminClientes() {
  if (!await verifyAdmin()) redirect('/admin/login');

  const [users, totals, contacts] = await Promise.all([
    db.user.findMany({
      where: { role: 'USER' },
      select: { name: true, email: true, phone: true, createdAt: true },
    }),
    db.order.groupBy({
      by: ['customerEmail'],
      _count: { _all: true },
      _sum: { totalCents: true },
      _max: { createdAt: true },
    }),
    db.order.findMany({
      distinct: ['customerEmail'],
      orderBy: { createdAt: 'desc' },
      select: { customerName: true, customerEmail: true, customerPhone: true },
    }),
  ]);

  const byEmail = new Map<string, Customer>();
  const contactByEmail = new Map(contacts.map((contact) => [normalize(contact.customerEmail), contact]));

  for (const total of totals) {
    const email = normalize(total.customerEmail);
    const contact = contactByEmail.get(email);
    byEmail.set(email, {
      email,
      name: contact?.customerName || total.customerEmail,
      phone: contact?.customerPhone || null,
      registered: false,
      orders: total._count._all,
      totalCents: total._sum.totalCents ?? 0,
      lastOrderAt: total._max.createdAt ?? new Date(0),
    });
  }

  for (const user of users) {
    const email = normalize(user.email);
    const existing = byEmail.get(email);
    if (existing) {
      existing.registered = true;
      existing.name = user.name || existing.name;
      existing.phone = existing.phone ?? user.phone;
      continue;
    }
    byEmail.set(email, {
      email,
      name: user.name,
      phone: user.phone,
      registered: true,
      orders: 0,
      totalCents: 0,
      lastOrderAt: user.createdAt,
    });
  }

  const customers = [...byEmail.values()].sort((a, b) => b.lastOrderAt.getTime() - a.lastOrderAt.getTime());
  const revenue = customers.reduce((sum, customer) => sum + customer.totalCents, 0);
  const repeat = customers.filter((customer) => customer.orders > 1).length;

  return (
    <main className="admin-dashboard">
      <div className="admin-page-title">
        <div><span>BASE DE CLIENTES</span><h1>Clientes</h1></div>
        <p>Cadastrados e compradores feitos no cardápio</p>
      </div>

      <section className="admin-stat-grid admin-stat-grid-4">
        <Stat title="Total de Clientes" value={String(customers.length)} caption="E-mails distintos" Icon={Users} />
        <Stat title="Clientes Cadastrados" value={String(customers.filter((c) => c.registered).length)} caption="Com conta no site" Icon={UserCheck} />
        <Stat title="Compradores Recorrentes" value={String(repeat)} caption="Com 2 ou mais pedidos" Icon={ShoppingBag} />
        <Stat title="Faturamento" value={formatBRL(revenue)} caption="Somado por cliente" Icon={Wallet} />
      </section>

      <section className="admin-dashboard-card mt-[13px]">
        <div className="admin-card-heading">
          <div><h2>Lista de Clientes</h2><p>Ordenados pelo pedido mais recente</p></div>
        </div>
        {customers.length === 0 ? (
          <p className="admin-empty-state">Os clientes aparecerão aqui após o primeiro pedido.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr><th>Cliente</th><th>E-mail</th><th>Telefone</th><th>Pedidos</th><th>Total gasto</th><th>Último pedido</th></tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.email}>
                    <td>
                      <b>{customer.name}</b>
                      {customer.registered && <span className="status-pill status-green ml-2">Cadastrado</span>}
                    </td>
                    <td>{customer.email}</td>
                    <td>{customer.phone ?? '—'}</td>
                    <td>{customer.orders}</td>
                    <td>{formatBRL(customer.totalCents)}</td>
                    <td>{customer.lastOrderAt.getFullYear() < 2000 ? '—' : customer.lastOrderAt.toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({
  title, value, caption, Icon,
}: {
  title: string; value: string; caption: string; Icon: typeof Users;
}) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-icon"><Icon size={19} /></div>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </article>
  );
}
