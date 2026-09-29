'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, ShopProduct } from '@/types/shop';
import { productImageFor } from '@/lib/product-image';
import { useState } from 'react';

type CartState = { items: CartItem[]; drawerOpen: boolean; add: (p: ShopProduct, qty?: number) => void; remove: (id: string) => void; setQty: (id: string, quantity: number) => void; clear: () => void; open: () => void; close: () => void; totalItems: () => number; subtotal: () => number; };
export const useCart = create<CartState>()(persist((set, get) => ({
  items: [], drawerOpen: false,
  add: (p, qty = 1) => set((s) => { const found = s.items.find(i => i.id === p.id); return { items: found ? s.items.map(i => i.id === p.id ? {...i, quantity: Math.min(i.quantity + qty, 99)} : i) : [...s.items, {id:p.id,slug:p.slug,name:p.name,priceCents:p.priceCents,imageUrl:productImageFor(p),quantity:Math.min(qty,99)}] }; }),
  remove: (id) => set(s => ({items:s.items.filter(i=>i.id!==id)})),
  setQty: (id, quantity) => set(s => ({items: quantity > 0 ? s.items.map(i => i.id===id ? {...i, quantity: Math.min(quantity,99)} : i) : s.items.filter(i=>i.id!==id)})),
  clear: () => set({items:[]}), open:()=>set({drawerOpen:true}), close:()=>set({drawerOpen:false}),
  totalItems:()=>get().items.reduce((a,i)=>a+i.quantity,0), subtotal:()=>get().items.reduce((a,i)=>a+i.quantity*i.priceCents,0),
}), {name:'trio-sabores-cart',skipHydration:true}));

export function AddToCart({product, quantity=1, showQuantity=false}: {product: ShopProduct; quantity?: number; showQuantity?: boolean}) {
  const add=useCart(s=>s.add);
  const [amount,setAmount]=useState(quantity);
  const soldOut=product.availability==='SOLD_OUT';
  return <div className="add-to-cart">
    {showQuantity&&<div className="quantity-stepper" aria-label={`Quantidade de ${product.name}`}>
      <button type="button" aria-label="Diminuir quantidade" onClick={()=>setAmount(Math.max(1,amount-1))}>−</button>
      <span>{amount}</span>
      <button type="button" aria-label="Aumentar quantidade" onClick={()=>setAmount(Math.min(99,amount+1))}>+</button>
    </div>}
    <button className="btn-primary w-full" disabled={soldOut} onClick={()=>{add(product,showQuantity?amount:quantity); useCart.getState().open();}}>{soldOut?'Esgotado':'Adicionar ao carrinho'}</button>
  </div>;
}
