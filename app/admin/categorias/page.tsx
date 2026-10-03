import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { CategoryManager } from './client';

export default async function AdminCategorias() {
  if (!await verifyAdmin()) redirect('/admin/login');

  const categories = await db.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <main className="admin-dashboard">
      <div className="admin-page-title">
        <div><span>CARDÁPIO</span><h1>Categorias</h1></div>
        <p>Grupos exibidos no cardápio da loja</p>
      </div>
      <CategoryManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          sortOrder: category.sortOrder,
          active: category.active,
          productCount: category._count.products,
        }))}
      />
    </main>
  );
}
