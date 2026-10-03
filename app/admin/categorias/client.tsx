'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  active: boolean;
  productCount: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const request = async (url: string, init: RequestInit) => {
    try {
      const response = await fetch(url, init);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível concluir a operação.');
        return false;
      }
      setError('');
      router.refresh();
      return true;
    } catch {
      setError('Não foi possível conectar ao servidor.');
      return false;
    }
  };

  const send = async (id: string, url: string, init: RequestInit) => {
    setBusyId(id);
    const ok = await request(url, init);
    setBusyId('');
    return ok;
  };

  const json = (body: unknown): RequestInit => ({
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await send('new', '/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })) setName('');
  };

  const toggle = (category: CategoryRow) =>
    send(category.id, `/api/admin/categories/${category.id}`, json({ active: !category.active }));

  const move = (category: CategoryRow, direction: -1 | 1) =>
    send(category.id, `/api/admin/categories/${category.id}`, json({ sortOrder: category.sortOrder + direction }));

  const remove = (category: CategoryRow) => {
    if (!confirm(`Excluir a categoria "${category.name}"?`)) return;
    return send(category.id, `/api/admin/categories/${category.id}`, { method: 'DELETE' });
  };

  return (
    <>
      <form onSubmit={create} className="admin-dashboard-card">
        <div className="admin-card-heading">
          <div><h2>Nova categoria</h2><p>O slug é gerado automaticamente a partir do nome</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="field grow">
            <label htmlFor="category-name">Nome</label>
            <input
              id="category-name"
              required
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Doces"
            />
          </div>
          <button className="btn-primary" disabled={busyId === 'new'}>{busyId === 'new' ? 'Criando...' : 'Criar categoria'}</button>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-[#88152d]">{error}</p>}
      </form>

      <section className="admin-dashboard-card mt-[13px]">
        <div className="admin-card-heading">
          <div><h2>Categorias cadastradas</h2><p>{categories.length} no total</p></div>
        </div>
        {categories.length === 0 ? (
          <p className="admin-empty-state">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-orders-table">
              <thead>
                <tr><th>Ordem</th><th>Nome</th><th>Slug</th><th>Produtos</th><th>Status</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {categories.map((category, index) => {
                  const busy = busyId === category.id;
                  return (
                    <tr key={category.id}>
                      <td>{category.sortOrder}</td>
                      <td><b>{category.name}</b></td>
                      <td>{category.slug}</td>
                      <td>{category.productCount}</td>
                      <td>
                        <span className={`status-pill ${category.active ? 'status-green' : 'status-red'}`}>
                          {category.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            aria-label={`Subir ${category.name}`}
                            disabled={busy || index === 0}
                            onClick={() => move(category, -1)}
                            className="admin-row-action"
                          >↑</button>
                          <button
                            type="button"
                            aria-label={`Descer ${category.name}`}
                            disabled={busy || index === categories.length - 1}
                            onClick={() => move(category, 1)}
                            className="admin-row-action"
                          >↓</button>
                          <button type="button" disabled={busy} onClick={() => toggle(category)} className="admin-row-action">
                            {category.active ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(category)}
                            className="admin-row-action admin-row-action-danger"
                          >Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
