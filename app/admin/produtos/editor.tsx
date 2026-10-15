'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { formatBRL, parseBRL } from '@/lib/money';
import { productImageFor } from '@/lib/product-image';

export type Availability = 'AVAILABLE' | 'SOLD_OUT' | 'PREORDER';

export type EditableProduct = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
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
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(() => centsToInput(product.priceCents));
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [availability, setAvailability] = useState<Availability>(product.availability);
  const [imageUrl, setImageUrl] = useState(product.imageUrl || '');
  const [preview, setPreview] = useState(() => productImageFor(product));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setDescription(product.description);
    setPrice(centsToInput(product.priceCents));
    setCategoryId(product.categoryId);
    setAvailability(product.availability);
    setImageUrl(product.imageUrl || '');
    setPreview(productImageFor(product));
    setError('');
  };

  const toggle = () => {
    if (open) reset();
    setOpen(!open);
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError('');
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Falha ao enviar a foto.');
        return;
      }
      setImageUrl(data.url);
      setPreview(data.url);
    } catch {
      setError('Erro de conexão ao enviar a foto.');
    } finally {
      setUploading(false);
    }
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
        body: JSON.stringify({
          description,
          priceCents,
          categoryId,
          availability,
          imageUrl: imageUrl.trim() || undefined,
        }),
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

  const currentDisplayImage = preview || productImageFor(product);

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-[#faf7f2]/50">
        <td className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[#dfd0b8] bg-[#f9f6f0] shrink-0">
              <Image
                src={currentDisplayImage}
                alt={product.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-semibold text-brown">{product.name}</div>
              <div className="text-xs text-brown/50">/{product.slug}</div>
            </div>
          </div>
        </td>
        <td className="p-3">{categories.find((c) => c.id === product.categoryId)?.name ?? '—'}</td>
        <td className="p-3 font-medium">{formatBRL(product.priceCents)}</td>
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
          <td colSpan={5} className="p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="field md:col-span-3">
                <label htmlFor={`description-${product.id}`}>Descrição</label>
                <textarea
                  id={`description-${product.id}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  minLength={5}
                  maxLength={500}
                  required
                />
              </div>

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

              <div className="field md:col-span-3">
                <label>Foto do produto (upload de JPG, JPEG, PNG, WebP)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-1">
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[#dfd0b8] bg-[#f9f6f0] shrink-0">
                    <Image
                      src={currentDisplayImage}
                      alt="Foto atual"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                      onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                      className="block w-full text-xs text-brown file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-wine file:text-cream hover:file:opacity-90"
                    />
                    <input
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        setPreview(e.target.value);
                      }}
                      placeholder="/images/... ou /uploads/..."
                      className="text-xs"
                    />
                  </div>
                </div>
                {uploading && <span className="text-xs text-wine font-semibold mt-1 block">Enviando foto...</span>}
              </div>
            </div>

            {error && <p role="alert" className="mt-3 text-xs text-[#88152d]">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={save} disabled={saving || uploading} className="btn-primary text-sm">
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
