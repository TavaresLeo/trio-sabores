'use client';

import Link from 'next/link';
import { Instagram, Facebook, MessageCircle, Clock3 } from 'lucide-react';
import { usePathname } from 'next/navigation';
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;
  return <footer className="bg-brown text-cream">
  <div className="benefits"><span>🚚 Entrega rápida e segura</span><span>🛡 Pagamento facilitado e seguro</span><span>♥ Produtos artesanais e de qualidade</span><span>☕ Atendimento personalizado</span></div>
  <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-3">
    <div className="flex items-start gap-4"><img src="/images/logomarca.jpeg" alt="Trio Sabores" className="footer-logo" /><div><p className="mt-2 max-w-sm text-sm opacity-85">Carinho para preparar. Tradição para inspirar. Sabor para reunir.</p></div></div>
    <div><h3 className="font-serif text-lg text-gold">Atendimento</h3><p className="mt-2 text-sm">Seg a Sáb: 08h às 20h<br/>Dom: 08h às 14h</p><p className="mt-2 text-sm">Rua das Flores, 123 — Centro</p></div>
    <div><h3 className="font-serif text-lg text-gold">Links</h3><div className="mt-2 flex flex-col gap-2 text-sm"><Link href="/politica-de-privacidade">Privacidade</Link><Link href="/cardapio">Cardápio</Link><Link href="/pedidos">Acompanhar pedido</Link></div></div>
  </div>
  <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-gold/20 px-5 py-5 text-xs opacity-75"><span>© 2026 Trio Sabores. Todos os direitos reservados.</span><div className="flex gap-3"><Instagram size={17}/><Facebook size={17}/><MessageCircle size={17}/><Clock3 size={17}/></div></div>
</footer> }
