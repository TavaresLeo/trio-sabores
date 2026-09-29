'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '@/components/product-card';
import type { ShopProduct } from '@/types/shop';

export function CardapioClient({ initialCategory }: { initialCategory: string }) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => setProducts(data.products || []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => Array.from(new Map(products.map((product) => [product.category.slug, product.category])).values()),
    [products],
  );
  const shown = products.filter(
    (product) =>
      (!query || `${product.name} ${product.description}`.toLowerCase().includes(query.toLowerCase())) &&
      (!category || product.category.slug === category),
  );

  return (
    <main>
      <section className="catalog-hero bg-wine px-5 py-14 text-center text-cream">
        <div className="mx-auto max-w-4xl">
          <div className="text-gold">CARDÁPIO</div>
          <h1 className="mt-2 font-serif text-5xl">Nossos produtos</h1>
          <p className="mt-3 text-cream/80">Sabor, qualidade e muito carinho em cada detalhe.</p>
        </div>
      </section>
      <section className="catalog-content mx-auto max-w-7xl px-5 py-10">
        <div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-3" size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-xl border border-[#d7c9b6] bg-white py-3 pl-10 pr-4"
              placeholder="Buscar produtos..."
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-[#d7c9b6] bg-white px-4 py-3"
            >
              <option value="">Todas as categorias</option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <p>Carregando cardápio...</p>
        ) : (
          <div className="catalog-products grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
