import { redirect } from 'next/navigation';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { ProductAdminForm } from './client';
import { ProductRow } from './editor';

export default async function AdminProdutos() {
  if (!await verifyAdmin()) redirect('/admin/login');

  const [products, categories] = await Promise.all([
    db.product.findMany({ orderBy: { name: 'asc' } }),
    db.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  ]);

  const allCategories = categories.map(({ id, name }) => ({ id, name }));
  const activeCategories = categories.filter((category) => category.active).map(({ id, name }) => ({ id, name }));

  return (
    <main className="bg-[#f5f1e9] px-5 py-10 min-h-[70vh]">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-4xl text-wine">Gerenciar produtos</h1>
          <ProductAdminForm categories={activeCategories} />
        </div>
        <div className="form-card mt-8 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-3">Produto</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    priceCents: product.priceCents,
                    categoryId: product.categoryId,
                    availability: product.availability,
                  }}
                  categories={allCategories}
                />
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="p-3 text-sm text-brown/60">Ainda não há produtos cadastrados.</p>}
        </div>
      </div>
    </main>
  );
}
