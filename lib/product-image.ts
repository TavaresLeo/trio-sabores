type ProductImageSource = {
  slug: string;
  imageUrl: string;
};

const productImages: Record<string, string> = {
  'bolo-de-laranja': '/images/bolo-de-laranja-caseiro.jpeg',
  'pudim-de-leite': '/images/pudim-leite-condensado.jpeg',
  'pudim-de-milho': '/images/pudim-de-milho.jpeg',
  'bolo-de-fuba': '/images/bolo-de-fuba-com-laranja.jpeg',
  'mini-pizzas': '/images/mini-pizzas.jpeg',
  'empadao-de-frango': '/images/empadao-artesanal.jpeg',
  'coxinha-de-frango': '/images/banner-vertical.jpeg',
  'bolo-de-chocolate': '/images/bolo-de-chocolate.jpeg',
  'bolo-de-cenoura': '/images/bolo-de-cenoura-com-chocolate.jpeg',
  'bolo-de-fuba-coco': '/images/bolo-de-fuba-com-coco.jpeg',
  'bolo-de-milho-cremoso': '/images/bolo-de-milho-cremoso.jpeg',
  'bolo-de-pudim': '/images/bolo-de-pudim.jpeg',
  'bolo-formigueiro': '/images/bolo-formigueiro.jpeg',
  'cappuccino': '/images/banner-vertical.jpeg',
  'combo-de-coxinhas': '/images/combo-de-coxinhas.jpeg',
  'salgadinhos-fritos': '/images/salgadinhos-fritos.jpeg',
};

const legacyProductImages: Record<string, string> = {
  '/products/bolo-laranja.svg': '/images/bolo-de-laranja-caseiro.jpeg',
  '/products/pudim.svg': '/images/pudim-leite-condensado.jpeg',
  '/products/bolo-fuba.svg': '/images/bolo-de-fuba-com-laranja.jpeg',
  '/products/mini-pizza.svg': '/images/banner-vertical.jpeg',
  '/products/empadao.svg': '/images/empadao-artesanal.jpeg',
  '/products/coxinha.svg': '/images/banner-vertical.jpeg',
  '/products/bolo-chocolate.svg': '/images/bolo-de-chocolate.jpeg',
  '/products/cafe.svg': '/images/banner-vertical.jpeg',
};

export function productImageFor(product: ProductImageSource) {
  return productImages[product.slug] ?? legacyProductImages[product.imageUrl] ?? product.imageUrl;
}
