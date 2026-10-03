'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatBRL, parseBRL } from '@/lib/money';

export type Availability = 'AVAILABLE' | 'SOLD_OUT' | 'PREORDER';

export type EditableProduct = {
  id: string;
  name: string;
  priceCents: number;
  categoryId: string;
  availability: Availability;
};

const availabilityLabels: Record<Availability, string> = {
  AVAILABLE: 'Disponível',
  SOLD_OUT: 'Esgotado',
  PREORDER: 'Pré-venda',
};

const pillClass: Record<Availability, string> = {
  AVAILABLE: 'status-green',
  SOLD_OUT: 'status-red',
  PREORDER: 'status-yellow',
};

export function availabilityLabel(value: Availability) {
  return availabilityLabels[value];
}

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

const actionClass =
  'rounded-md border border-[#dfd0b8] bg-[#fffdf9] px-2.5 py-1 text-xs font-semibold text-[#671528] hover:bg-[#f1e7d7] disabled:opacity-50';

export function ProductRow({ product, categories }: { product: EditableProduct; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(() => centsToInput(product.priceCents));
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [availability, setAvailability] = useState<Availability>(product.availability);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setPrice(centsToInput(product.priceCents));
    setCategoryId(product.categoryId);
    setAvailability(product.availability);
    setError('');
  };

  const toggle = () => {
    if (open) reset();
    setOpen(!open);
  };

  const save = async () => {
    const priceCents = parseBRL(price);
    if (priceCents < 1) {
      setError('Informe um preço maior que zero.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceCents, categoryId, availability }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível salvar o produto.');
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className="border-b last:border-0">
        <td className="p-3 font-semibold">{product.name}</td>
        <td className="p-3">{categories.find((c) => c.id === product.categoryId)?.name ?? '—'}</td>
        <td className="p-3">{formatBRL(product.priceCents)}</td>
        <td className="p-3">
          <span className={`status-pill ${pillClass[product.availability]}`}>
            {availabilityLabels[product.availability]}
          </span>
        </td>
        <td className="p-3 text-right">
          <button type="button" onClick={toggle} className={actionClass} aria-expanded={open}>
            {open ? 'Fechar' : 'Editar'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b bg-[#fffdf9]">
          <td colSpan={5} className="p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="field">
                <label htmlFor={`price-${product.id}`}>Preço</label>
                <input
                  id={`price-${product.id}`}
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="field">
                <label htmlFor={`category-${product.id}`}>Categoria</label>
                <select
                  id={`category-${product.id}`}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`availability-${product.id}`}>Status</label>
                <select
                  id={`availability-${product.id}`}
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value as Availability)}
                >
                  {(Object.keys(availabilityLabels) as Availability[]).map((value) => (
                    <option key={value} value={value}>{availabilityLabels[value]}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p role="alert" className="mt-3 text-xs text-[#88152d]">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={toggle} disabled={saving} className={actionClass}>
                Cancelar
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
