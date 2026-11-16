'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart, useCartHydrated } from '@/components/shop-state';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { formatBRL } from '@/lib/money';
import { productImageFor } from '@/lib/product-image';

export default function Carrinho() {
  const { items, remove, setQty, subtotal, clear } = useCart();
  const hydrated = useCartHydrated();
  const [confirmClear, setConfirmClear] = useState(false);
  const total = subtotal();

  if (!hydrated) {
    return (
      <main className="cart-page">
        <div className="cart-layout">
          <div className="cart-empty" aria-live="polite">
            <h2>Carregando seu carrinho...</h2>
            <p>Recuperando os itens salvos neste dispositivo.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-page-heading">
        <div>
          <h1>Seu Carrinho</h1>
          <p>Confira seus sabores antes de finalizar o pedido.</p>
        </div>
        <Link href="/cardapio" className="text-link">Continuar comprando</Link>
      </div>
      <section className="cart-layout">
        <div className="cart-items-panel">
          {items.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBagIcon />
              <h2>Seu carrinho está vazio</h2>
              <p>Escolha seus produtos favoritos para continuar.</p>
              <Link href="/cardapio" className="btn-primary">Ver cardápio</Link>
            </div>
          ) : (
            <>
              <div className="cart-panel-title"><h2>Produtos</h2><span>{items.length} itens</span></div>
              {items.map((item) => (
                <article className="cart-row" key={item.id}>
                  <Image src={productImageFor(item)} alt={item.name} width={72} height={72} className="cart-thumb object-cover" />
                  <div className="cart-item-details">
                    <h3>{item.name}</h3>
                    <span>{formatBRL(item.priceCents)} cada</span>
                    <div className="cart-mobile-controls">
                      <QuantityControl quantity={item.quantity} decrease={() => setQty(item.id, item.quantity - 1)} increase={() => setQty(item.id, item.quantity + 1)} />
                      <b>{formatBRL(item.priceCents * item.quantity)}</b>
                      <button type="button" className="cart-mobile-remove" onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                    </div>
                  </div>
                  <QuantityControl quantity={item.quantity} decrease={() => setQty(item.id, item.quantity - 1)} increase={() => setQty(item.id, item.quantity + 1)} />
                  <div className="cart-item-total">
                    <b>{formatBRL(item.priceCents * item.quantity)}</b>
                    <button type="button" onClick={() => remove(item.id)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button>
                  </div>
                </article>
              ))}
              <button type="button" className="cart-clear" onClick={() => setConfirmClear(true)}>Limpar carrinho</button>
            </>
          )}
        </div>
        <aside className="cart-summary">
          <h2>Resumo do Pedido</h2>
          <div className="cart-summary-line"><span>Subtotal</span><b>{formatBRL(total)}</b></div>
          <div className="cart-summary-line"><span>Entrega</span><span>A calcular</span></div>
          <div className="cart-summary-total"><span>Total</span><b>{formatBRL(total)}</b></div>
          <Link href={items.length ? '/checkout' : '/cardapio'} className="btn-primary">{items.length ? 'Finalizar Pedido' : 'Escolher produtos'}</Link>
          <p>Entrega e descontos calculados no checkout.</p>
        </aside>
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="Limpar o carrinho?"
        description="Todos os itens selecionados serão removidos. Você poderá adicioná-los novamente pelo cardápio."
        confirmLabel="Sim, limpar carrinho"
        cancelLabel="Manter itens"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
      />
    </main>
  );
}

function QuantityControl({ quantity, decrease, increase }: { quantity: number; decrease: () => void; increase: () => void }) {
  return (
    <div className="quantity-stepper cart-quantity">
      <button type="button" onClick={decrease} aria-label="Diminuir quantidade"><Minus size={13} /></button>
      <span>{quantity}</span>
      <button type="button" onClick={increase} aria-label="Aumentar quantidade"><Plus size={13} /></button>
    </div>
  );
}

function ShoppingBagIcon() {
  return <span className="cart-empty-icon"><ShoppingBag size={25} /></span>;
}
