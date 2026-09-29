export type ShopProduct = {
  id: string; name: string; slug: string; description: string; priceCents: number; imageUrl: string; badge?: string | null; rating?: number; reviewsCount?: number; availability: 'AVAILABLE' | 'SOLD_OUT' | 'PREORDER'; featured: boolean; category: { name: string; slug: string };
};
export type CartItem = Pick<ShopProduct, 'id'|'slug'|'name'|'priceCents'|'imageUrl'> & { quantity: number };
