'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { formatBRL } from '@/lib/money';

type AccountData = {
  user: { id: string; name: string; email: string; phone: string | null };
  orderCount: number;
  addresses: Array<{ id: string; label: string; cep: string; street: string; number: string; complement: string | null; neighborhood: string; city: string; state: string }>;
  orders: Array<{
    id: string; publicNumber: string; status: string; totalCents: number; createdAt: string;
    items: Array<{ id: string; productName: string; quantity: number }>;
    address: { street: string; number: string; neighborhood: string; city: string; state: string } | null;
  }>;
};

export default function Conta() {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [registering, setRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });

  const loadAccount = async () => {
    try {
      const response = await fetch('/api/account', { cache: 'no-store' });
      if (response.ok) setAccount(await response.json() as AccountData);
      else if (response.status !== 401) setError('Não foi possível carregar sua conta.');
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/account', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Não foi possível carregar sua conta.');
        return response.json() as Promise<AccountData>;
      })
      .then((data) => {
        if (active && data) setAccount(data);
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar sua conta.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch(registering ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Não foi possível acessar sua conta.');
        return;
      }
      await loadAccount();
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setError('Não foi possível encerrar sua sessão.');
        return;
      }
      setAccount(null);
    } catch {
      setError('Não foi possível conectar ao servidor para encerrar sua sessão.');
    }
  };

  if (loading) return <main className="account-page"><div className="form-card">Carregando sua conta...</div></main>;

  if (!account) {
    return (
      <main className="account-page">
        <form className="form-card account-auth-card" onSubmit={submit}>
          <span className="text-sm text-red">TRIO SABORES</span>
          <h1 className="font-serif text-3xl text-wine">{registering ? 'Crie sua conta' : 'Entre na sua conta'}</h1>
          <p className="text-sm text-brown/60">Acompanhe seus pedidos e mantenha seus dados de entrega em um só lugar.</p>
          {registering && <>
            <AccountField label="Nome completo" value={form.name} onChange={(name) => setForm({ ...form, name })} autoComplete="name" />
            <AccountField label="Telefone / WhatsApp" type="tel" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} autoComplete="tel" />
          </>}
          <AccountField label="E-mail" type="email" value={form.email} onChange={(email) => setForm({ ...form, email })} autoComplete="email" />
          <AccountField label="Senha" type="password" value={form.password} onChange={(password) => setForm({ ...form, password })} autoComplete={registering ? 'new-password' : 'current-password'} />
          {registering && <p className="text-xs text-brown/60">Use pelo menos 8 caracteres. Seus dados serão usados para facilitar pedidos e entrega.</p>}
          {error && <p role="alert" className="text-sm text-red">{error}</p>}
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Aguarde...' : registering ? 'Criar conta' : 'Entrar'}</button>
          <button type="button" className="w-full text-sm text-wine underline" onClick={() => { setRegistering(!registering); setError(''); }}>
            {registering ? 'Já tenho uma conta' : 'Ainda não tenho conta — cadastrar'}
          </button>
          <Link className="block text-center text-sm text-brown/60" href="/cardapio">Continuar comprando sem entrar</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="account-page">
      <div className="account-heading">
        <div><p className="text-sm text-red">MINHA CONTA</p><h1 className="font-serif text-3xl text-wine">Olá, {account.user.name}</h1></div>
        <button className="btn-secondary" onClick={logout}>Sair</button>
      </div>
      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      <div className="account-content">
        <section className="form-card">
          <h2 className="font-serif text-2xl text-wine">Meus pedidos</h2>
          <p className="mt-1 text-sm text-brown/60">{account.orderCount} pedido(s) no histórico</p>
          {account.orders.length === 0 ? (
            <div className="account-empty"><p>Seus pedidos aparecerão aqui quando você finalizar uma compra com esta conta.</p><Link href="/cardapio" className="btn-primary">Ver cardápio</Link></div>
          ) : <div className="mt-5 space-y-3">{account.orders.map((order) => (
            <article key={order.id} className="account-order">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><b>{order.publicNumber}</b><div className="text-xs text-brown/60">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</div></div>
                <span className="status-pill status-yellow">{order.status === 'PENDING' ? 'Aguardando confirmação' : order.status.replaceAll('_', ' ')}</span>
                <b>{formatBRL(order.totalCents)}</b>
              </div>
              <p className="mt-2 text-sm text-brown/70">{order.items.map((item) => `${item.quantity}× ${item.productName}`).join(' · ')}</p>
              {order.address && <p className="mt-1 text-xs text-brown/60">{order.address.street}, {order.address.number} · {order.address.neighborhood}, {order.address.city}/{order.address.state}</p>}
            </article>
          ))}</div>}
        </section>
        <section className="form-card">
          <h2 className="font-serif text-2xl text-wine">Meus dados</h2>
          <p className="mt-3 text-sm"><b>E-mail:</b> {account.user.email}</p>
          <p className="mt-1 text-sm"><b>Telefone:</b> {account.user.phone || 'Não informado'}</p>
          <h3 className="mt-6 font-semibold text-wine">Endereços usados</h3>
          {account.addresses.length === 0 ? <p className="mt-2 text-sm text-brown/60">Seu endereço será salvo aqui no primeiro pedido feito com esta conta.</p> : (
            <div className="mt-2 space-y-2">{account.addresses.map((address) => (
              <div key={address.id} className="rounded-lg border p-3 text-sm">
                <b>{address.label}</b><p>{address.street}, {address.number}{address.complement ? `, ${address.complement}` : ''}</p>
                <p>{address.neighborhood} · {address.city}/{address.state} · CEP {address.cep}</p>
              </div>
            ))}</div>
          )}
          <p className="mt-6 text-xs text-brown/60">Seu histórico de compras permitirá oferecer descontos e benefícios por fidelidade no futuro.</p>
        </section>
      </div>
    </main>
  );
}

function AccountField({ label, value, onChange, type = 'text', autoComplete }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; autoComplete: string;
}) {
  return <div className="field"><label>{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required /></div>;
}
