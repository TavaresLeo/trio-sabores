import Image from 'next/image';
import Link from 'next/link';
import type { ShopProduct } from '@/types/shop';
import { formatBRL } from '@/lib/money';
import { AddToCart } from './shop-state';
import { productImageFor } from '@/lib/product-image';

export function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <article className="product-card group">
      <Link href={`/produto/${product.slug}`} className="product-card-image-link">
        <div className="product-image-wrap">
          <Image
            src={productImageFor(product)}
            alt={product.name}
            width={300}
            height={220}
            className={`product-image product-image-${product.slug} object-cover`}
          />
          {product.badge && <span className="badge">{product.badge}</span>}
        </div>
      </Link>
      <div className="product-card-info">
        <div className="product-rating">
          <span className="stars" aria-label={`${product.rating ?? 4.9} de 5 estrelas`}>★★★★★</span>
          <span>{(product.rating ?? 4.9).toFixed(1)}</span>
          <span className="review-count">({product.reviewsCount ?? 24} avaliações)</span>
        </div>
        <Link href={`/produto/${product.slug}`}>
          <h3 className="font-serif text-lg text-brown hover:text-wine">{product.name}</h3>
        </Link>
        <strong className="product-price">{formatBRL(product.priceCents)}</strong>
        <AddToCart product={product} showQuantity />
      </div>
    </article>
  );
}
