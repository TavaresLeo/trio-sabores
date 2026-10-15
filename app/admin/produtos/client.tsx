'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { parseBRL } from '@/lib/money';

export function ProductAdminForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    imageUrl: '/images/empadao-artesanal.jpeg',
    categoryId: categories[0]?.id || '',
    badge: '',
    featured: false,
  });
  const [preview, setPreview] = useState<string>('/images/empadao-artesanal.jpeg');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const u = (k: string, v: any) => setF((x) => ({ ...x, [k]: v }));

  const handleNameChange = (name: string) => {
    u('name', name);
    // Se o slug ainda não foi editado manualmente ou está vazio, auto-gera o slug
    const autoSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    u('slug', autoSlug);
  };

  const upload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(false);
    setUploadError('');

    // Prévia instantânea
    const localPreviewUrl = URL.createObjectURL(file);
    setPreview(localPreviewUrl);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || 'Falha no upload da imagem.');
        return;
      }
      u('imageUrl', data.url);
      setPreview(data.url);
      setUploadSuccess(true);
    } catch {
      setUploadError('Erro de conexão ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = parseBRL(f.price);
    if (priceCents < 1) {
      alert('Informe um preço válido maior que zero.');
      return;
    }

    // Normaliza imageUrl: se o usuário digitou sem extensão, garante fallback seguro
    let finalImageUrl = f.imageUrl.trim();
    if (!finalImageUrl || (!finalImageUrl.startsWith('/') && !finalImageUrl.startsWith('http'))) {
      finalImageUrl = `/images/banner-horizontal.jpeg`;
    }

    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: f.name,
        slug: f.slug,
        description: f.description,
        priceCents,
        imageUrl: finalImageUrl,
        categoryId: f.categoryId,
        badge: f.badge || undefined,
        featured: f.featured,
      }),
    });

    if (!res.ok) {
      alert((await res.json()).error || 'Erro ao cadastrar produto');
      return;
    }

    setOpen(false);
    setF({
      name: '',
      slug: '',
      description: '',
      price: '',
      imageUrl: '/images/empadao-artesanal.jpeg',
      categoryId: categories[0]?.id || '',
      badge: '',
      featured: false,
    });
    setPreview('/images/empadao-artesanal.jpeg');
    setUploadSuccess(false);
    router.refresh();
  };

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(!open)}>
        {open ? 'Fechar' : 'Novo produto'}
      </button>
      {open && (
        <form onSubmit={save} className="form-card mt-5 grid gap-4 md:grid-cols-2">
          <div className="field">
            <label>Nome do produto</label>
            <input required value={f.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex.: Empadão Artesanal" />
          </div>
          <div className="field">
            <label>Slug (URL amigável)</label>
            <input required value={f.slug} onChange={(e) => u('slug', e.target.value)} placeholder="empadao-artesanal" />
          </div>
          <div className="field md:col-span-2">
            <label>Descrição</label>
            <textarea required rows={3} value={f.description} onChange={(e) => u('description', e.target.value)} placeholder="Ingredientes e detalhes do produto..." />
          </div>
          <div className="field">
            <label>Preço (R$)</label>
            <input
              required
              inputMode="decimal"
              placeholder="0,00"
              value={f.price}
              onChange={(e) => u('price', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Categoria</label>
            <select value={f.categoryId} onChange={(e) => u('categoryId', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field md:col-span-2">
            <label>Foto do produto (JPEG, PNG, WebP)</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-1">
              {preview && (
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-[#dfd0b8] bg-[#f9f6f0] shrink-0">
                  <Image
                    src={preview}
                    alt="Prévia da foto"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 w-full space-y-2">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
                  onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
                  className="block w-full text-xs text-brown file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-wine file:text-cream hover:file:opacity-90"
                />
                <input
                  value={f.imageUrl}
                  onChange={(e) => {
                    u('imageUrl', e.target.value);
                    setPreview(e.target.value);
                  }}
                  placeholder="/images/... ou /uploads/..."
                  className="text-xs"
                />
              </div>
            </div>
            {uploading && <span className="text-xs text-wine font-semibold mt-1 block">Enviando e processando imagem...</span>}
            {uploadSuccess && <span className="text-xs text-green-700 font-semibold mt-1 block">✓ Imagem carregada com sucesso!</span>}
            {uploadError && <span role="alert" className="text-xs text-red mt-1 block">{uploadError}</span>}
          </div>

          <button className="btn-primary md:col-span-2" disabled={uploading}>
            {uploading ? 'Aguarde o envio da foto...' : 'Salvar produto'}
          </button>
        </form>
      )}
    </>
  );
}
