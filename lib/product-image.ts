type ProductImageSource = {
  slug: string;
  imageUrl: string;
};

const productImages: Record<string, string> = {
  'bolo-de-laranja': '/images/bolo-de-laranja-caseiro.jpeg',
  'pudim-de-leite': '/images/pudim-leite-condensado.jpeg',
  'pudim-de-milho': '/images/pudim-de-milho.jpeg',
  'bolo-de-fuba': '/images/bolo-de-fuba-com-laranja.jpeg',
  'mini-pizzas': '/images/banner-vertical.jpeg',
  'empadao-de-frango': '/images/banner-vertical.jpeg',
  'coxinha-de-frango': '/images/banner-vertical.jpeg',
  'bolo-de-chocolate': '/images/bolo-de-laranja-com-chocolate.jpeg',
  cappuccino: '/images/banner-vertical.jpeg',
};

const legacyProductImages: Record<string, string> = {
  '/products/bolo-laranja.svg': '/images/bolo-de-laranja-caseiro.jpeg',
  '/products/pudim.svg': '/images/pudim-leite-condensado.jpeg',
  '/products/bolo-fuba.svg': '/images/bolo-de-fuba-com-laranja.jpeg',
  '/products/mini-pizza.svg': '/images/banner-vertical.jpeg',
  '/products/empadao.svg': '/images/banner-vertical.jpeg',
  '/products/coxinha.svg': '/images/banner-vertical.jpeg',
  '/products/bolo-chocolate.svg': '/images/bolo-de-laranja-com-chocolate.jpeg',
  '/products/cafe.svg': '/images/banner-vertical.jpeg',
};

export function productImageFor(product: ProductImageSource) {
  return productImages[product.slug] ?? legacyProductImages[product.imageUrl] ?? product.imageUrl;
}
