export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { db } from '@/lib/db';
import { ProductCard } from '@/components/product-card';
import { Heart, PackageCheck, ShieldCheck, Sparkles } from 'lucide-react';

export default async function Home() {
  const products = await db.product.findMany({ where: { featured: true, availability: { not: 'SOLD_OUT' } }, include: { category: true }, orderBy: { sortOrder: 'asc' }, take: 4 });
  const categories = await db.category.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 4 });
  const categoryImages: Record<string, string> = {
    'bolos-caseiros': '/images/bolo-de-laranja-caseiro.jpeg',
    'mini-pizzas': '/images/banner-vertical.jpeg',
    salgados: '/images/banner-vertical.jpeg',
    empadoes: '/images/banner-vertical.jpeg',
    doces: '/images/pudim-de-milho.jpeg',
    cafes: '/images/banner-vertical.jpeg',
  };

  return <main>
    <section className="hero-real" aria-label="Trio Sabores — Sabores que acolhem. Momentos que ficam.">
      <picture>
        <source media="(max-width: 700px)" srcSet="/images/banner-vertical.jpeg" />
        <img src="/images/banner-horizontal.jpeg" alt="Banner Trio Sabores com bolos, salgados, mini pizzas e a identidade visual da marca." />
      </picture>
    </section>

    <section className="benefits home-benefits" aria-label="Benefícios">
      <span><PackageCheck size={19}/> Entrega rápida e segura</span>
      <span><Sparkles size={19}/> Ingredientes selecionados</span>
      <span><Heart size={19}/> Feito com amor para sua família</span>
      <span><ShieldCheck size={19}/> Pagamento seguro e facilitado</span>
    </section>

    <section className="home-categories" aria-label="Categorias">
      <div className="home-categories-heading"><h2>Categorias</h2><Link href="/cardapio">Ver todas</Link></div>
      <div className="home-category-grid">
        {categories.map((category) => <Link key={category.id} href={`/cardapio?categoria=${category.slug}`} className={`home-category-card home-category-${category.slug}`}>
          <img src={categoryImages[category.slug] ?? '/images/banner-horizontal.jpeg'} alt="" />
          <span>{category.name}</span>
        </Link>)}
      </div>
    </section>

    <section className="home-featured">
      <div className="featured-heading"><h2>Produtos em Destaque <span>— ♥ —</span></h2><Link href="/cardapio">Ver Todos</Link></div>
      <div className="home-product-grid">{products.map(p => <ProductCard key={p.id} product={{ ...p, category: { name: p.category.name, slug: p.category.slug } }} />)}</div>
      <Link href="/cardapio" className="home-see-menu">Ver cardápio completo</Link>
    </section>
  </main>;
}
