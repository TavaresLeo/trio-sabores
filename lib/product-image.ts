type ProductImageSource = {
  slug: string;
  imageUrl: string;
  name?: string;
};

const productImages: Record<string, string> = {
  'bolo-de-laranja': '/images/bolo-de-laranja-caseiro.jpeg',
  'pudim-de-leite': '/images/pudim-leite-condensado.jpeg',
  'pudim-de-milho': '/images/pudim-de-milho.jpeg',
  'bolo-de-fuba': '/images/bolo-de-fuba-com-laranja.jpeg',
  'mini-pizzas': '/images/mini-pizzas.jpeg',
  'empadao': '/images/empadao-artesanal.jpeg',
  'empadao-de-frango': '/images/empadao-artesanal.jpeg',
  'coxinha-de-frango': '/images/combo-de-coxinhas.jpeg',
  'coxinha': '/images/combo-de-coxinhas.jpeg',
  'coxinhas': '/images/combo-de-coxinhas.jpeg',
  'combo-de-coxinhas': '/images/combo-de-coxinhas.jpeg',
  'salgadinhos-fritos': '/images/salgadinhos-fritos.jpeg',
  'salgados': '/images/salgadinhos-fritos.jpeg',
  'bolo-de-chocolate': '/images/bolo-de-chocolate.jpeg',
  'bolo-de-cenoura': '/images/bolo-de-cenoura-com-chocolate.jpeg',
  'bolo-de-fuba-coco': '/images/bolo-de-fuba-com-coco.jpeg',
  'bolo-de-milho-cremoso': '/images/bolo-de-milho-cremoso.jpeg',
  'bolo-de-pudim': '/images/bolo-de-pudim.jpeg',
  'bolo-formigueiro': '/images/bolo-formigueiro.jpeg',
  'cappuccino': '/images/banner-vertical.jpeg',
};

const legacyProductImages: Record<string, string> = {
  '/products/bolo-laranja.svg': '/images/bolo-de-laranja-caseiro.jpeg',
  '/products/pudim.svg': '/images/pudim-leite-condensado.jpeg',
  '/products/bolo-fuba.svg': '/images/bolo-de-fuba-com-laranja.jpeg',
  '/products/mini-pizza.svg': '/images/mini-pizzas.jpeg',
  '/products/empadao.svg': '/images/empadao-artesanal.jpeg',
  '/products/empadao': '/images/empadao-artesanal.jpeg',
  '/produtos/empadao': '/images/empadao-artesanal.jpeg',
  '/products/coxinha.svg': '/images/combo-de-coxinhas.jpeg',
  '/products/bolo-chocolate.svg': '/images/bolo-de-chocolate.jpeg',
  '/products/cafe.svg': '/images/banner-vertical.jpeg',
};

const VALID_IMAGE_EXTENSIONS = /\.(jpeg|jpg|png|webp|avif|svg)$/i;

function isValidImageUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if ((trimmed.startsWith('/') || trimmed.startsWith('./')) && VALID_IMAGE_EXTENSIONS.test(trimmed)) {
    return true;
  }
  return false;
}

export function productImageFor(product: ProductImageSource): string {
  // 1. Prioridade para mapeamento exato de slug
  if (product.slug && productImages[product.slug]) {
    return productImages[product.slug];
  }

  // 2. Prioridade para legados conhecidos
  if (product.imageUrl && legacyProductImages[product.imageUrl]) {
    return legacyProductImages[product.imageUrl];
  }

  // 3. Se a URL informada for válida (upload novo, caminho direto em /images/ ou /uploads/ ou link externo)
  if (isValidImageUrl(product.imageUrl)) {
    return product.imageUrl;
  }

  // 4. Heurística inteligente baseada no slug ou nome para não deixar imagem quebrada
  const key = `${product.slug || ''} ${product.name || ''} ${product.imageUrl || ''}`.toLowerCase();
  if (key.includes('empad')) return '/images/empadao-artesanal.jpeg';
  if (key.includes('coxinha')) return '/images/combo-de-coxinhas.jpeg';
  if (key.includes('pizza')) return '/images/mini-pizzas.jpeg';
  if (key.includes('milho')) return '/images/bolo-de-milho-cremoso.jpeg';
  if (key.includes('pudim')) return '/images/pudim-leite-condensado.jpeg';
  if (key.includes('salgad')) return '/images/salgadinhos-fritos.jpeg';
  if (key.includes('cenoura')) return '/images/bolo-de-cenoura-com-chocolate.jpeg';
  if (key.includes('chocolate')) return '/images/bolo-de-chocolate.jpeg';
  if (key.includes('laranja')) return '/images/bolo-de-laranja-caseiro.jpeg';
  if (key.includes('fuba') || key.includes('fubá')) return '/images/bolo-de-fuba-com-laranja.jpeg';

  // 5. Fallback padrão seguro existente
  return '/images/banner-horizontal.jpeg';
}
