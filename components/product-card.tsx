import Image from 'next/image';
import Link from 'next/link';
import type { ShopProduct } from '@/types/shop';
import { formatBRL } from '@/lib/money';
import { AddToCart } from './shop-state';
import { productImageFor } from '@/lib/product-image';

export function ProductCard({ product }: { product: ShopProduct }) {
  const reviewsCount = product.reviewsCount ?? 0;
  const rating = product.rating ?? null;
  const hasReviews = reviewsCount > 0 && rating !== null;

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
        {hasReviews && (
          <div className="product-rating">
            <span className="stars" aria-label={`${rating.toFixed(1)} de 5 estrelas`}>★★★★★</span>
            <span>{rating.toFixed(1)}</span>
            <span className="review-count">({reviewsCount} avaliações)</span>
          </div>
        )}
        <Link href={`/produto/${product.slug}`}>
          <h3 className="font-serif text-lg text-brown hover:text-wine">{product.name}</h3>
        </Link>
        <strong className="product-price">{formatBRL(product.priceCents)}</strong>
        <AddToCart product={product} showQuantity />
      </div>
    </article>
  );
}
