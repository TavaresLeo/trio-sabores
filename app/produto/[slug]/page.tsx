import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';
import { AddToCart } from '@/components/shop-state';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { productImageFor } from '@/lib/product-image';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { category: true } });
  if (!product) notFound();

  return (
    <main className="product-page">
      <section className="mx-auto max-w-7xl px-5 py-8">
        <div className="product-breadcrumb">
          <Link href="/">Início</Link><span>›</span><Link href="/cardapio">Produtos</Link><span>›</span>
          <Link href={`/cardapio?categoria=${product.category.slug}`}>{product.category.name}</Link><span>›</span><span>{product.name}</span>
        </div>
        <div className="product-detail-grid">
          <div className="product-detail-photo">
            <img src={productImageFor(product)} alt={product.name} className={`product-image-${product.slug}`} />
          </div>
          <div className="product-detail-content">
            <div className="product-rating">
              <span className="stars"><Star size={15} fill="currentColor" /> {product.rating.toFixed(1)}</span>
              <span className="review-count">({product.reviewsCount} avaliações)</span>
            </div>
            <h1 className="font-serif">{product.name}</h1>
            <strong className="product-detail-price">{formatBRL(product.priceCents)}</strong>
            <p className="product-description">{product.description}</p>
            <AddToCart product={{ ...product, category: { name: product.category.name, slug: product.category.slug } }} showQuantity />
            <div className="product-promises">
              <span>♧<b>Produção artesanal</b></span>
              <span>✦<b>Ingredientes selecionados</b></span>
              <span>♥<b>Sabor caseiro</b></span>
            </div>
            <details className="product-description-details">
              <summary>Descrição completa</summary>
              <p>Preparado com ingredientes selecionados e muito carinho. Consulte nossa equipe sobre ingredientes e alergênicos antes de finalizar o pedido.</p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}
