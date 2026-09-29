'use client';
import Link from 'next/link';
import { Search, ShoppingBag, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from './shop-state';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const total = useCart((s) => s.totalItems());
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);
  const links = [['Início','/'],['Produtos','/cardapio'],['Minha Conta','/conta'],['Sobre Nós','/sobre'],['Entrega','/contato'],['Fale Conosco','/contato']];
  if (pathname.startsWith('/admin')) return null;
  return <header className="site-header sticky top-0 z-50 bg-wine text-cream">
    <div className="site-header-inner mx-auto flex max-w-7xl items-center justify-between px-4">
      <button className="site-mobile-menu-trigger md:hidden" onClick={() => setOpen(!open)} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
      <Link href="/" className="brand-image-link" aria-label="Trio Sabores — início"><img src="/images/logomarca.jpeg" alt="" className="brand-image" /><span className="site-wordmark">Trio <b>Sabores</b></span></Link>
      <nav className="hidden items-center gap-7 md:flex">{links.map(([label, href]) => <Link key={`${label}-${href}`} href={href} className="nav-link">{label}</Link>)}</nav>
      <div className="flex items-center gap-1">
        <Link href="/cardapio" aria-label="Buscar produtos" className="icon-button"><Search size={18}/></Link>
        <Link href="/carrinho" aria-label="Carrinho" className="icon-button relative"><ShoppingBag size={19}/>{total > 0 && <span className="cart-badge">{total}</span>}</Link>
      </div>
    </div>
    {open && <nav className="mobile-menu border-t border-gold/30 bg-wine px-5 py-3 md:hidden">{links.map(([label, href]) => <Link onClick={() => setOpen(false)} key={`${label}-${href}`} href={href} className="block border-b border-gold/20 py-3">{label}</Link>)}</nav>}
  </header>;
}
