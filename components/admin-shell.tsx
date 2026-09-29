'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChartNoAxesCombined, ClipboardList, CookingPot, LayoutDashboard, LogOut, Settings, Users } from 'lucide-react';
import { useState } from 'react';

const links = [
  { href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/admin/pedidos', label: 'Pedidos', Icon: ClipboardList },
  { href: '/admin/produtos', label: 'Produtos', Icon: CookingPot },
  { href: '/admin/configuracoes', label: 'Categorias', Icon: ChartNoAxesCombined },
  { href: '/admin/configuracoes', label: 'Clientes', Icon: Users },
  { href: '/admin/configuracoes', label: 'Configurações', Icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState('');

  if (pathname === '/admin/login') return <div className="admin-login-shell">{children}</div>;

  const logout = async () => {
    setLogoutError('');
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) {
        setLogoutError('Não foi possível encerrar a sessão administrativa.');
        return;
      }
      router.push('/admin/login');
      router.refresh();
    } catch {
      setLogoutError('Não foi possível conectar para encerrar a sessão.');
    }
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <img src="/images/logomarca.jpeg" alt="" />
          <span>Trio <b>Sabores</b><small>PAINEL ADMINISTRATIVO</small></span>
        </Link>
        <nav aria-label="Menu administrativo">
          {links.map(({ href, label, Icon }) => (
            <Link key={label} href={href} className={`admin-sidebar-link ${pathname === href && (label !== 'Clientes' && label !== 'Categorias') ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        {logoutError && <p role="alert" className="admin-logout-error">{logoutError}</p>}
        <button className="admin-logout" onClick={logout}><LogOut size={17} /> Sair</button>
      </aside>
      <div className="admin-content">
        <div className="admin-topbar"><span>Olá, Administrador</span><span className="admin-avatar">A</span></div>
        {children}
      </div>
    </div>
  );
}
