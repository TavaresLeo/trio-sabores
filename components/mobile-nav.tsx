'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { House, ShoppingBag, UserRound, Utensils } from 'lucide-react';
import { useCart } from './shop-state';

const links = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/cardapio', label: 'Produtos', Icon: Utensils },
  { href: '/carrinho', label: 'Carrinho', Icon: ShoppingBag },
  { href: '/conta', label: 'Perfil', Icon: UserRound },
];

export function MobileNav() {
  const pathname = usePathname();
  const total = useCart((state) => state.totalItems());

  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">
      {links.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
          <span className="mobile-nav-icon">
            <Icon size={19} />
            {href === '/carrinho' && total > 0 && <span className="mobile-cart-badge">{total}</span>}
          </span>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
