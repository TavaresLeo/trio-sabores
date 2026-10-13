'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function OrderDeleteButton({ orderId, orderNumber }: { orderId: string; orderNumber: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!window.confirm(`Excluir o pedido ${orderNumber}? Esta ação não pode ser desfeita.`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível excluir o pedido.');
        return;
      }
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="text-right">
      <button type="button" onClick={remove} disabled={deleting} className="text-xs font-semibold text-[#88152d] underline disabled:opacity-50">
        {deleting ? 'Excluindo...' : 'Excluir pedido'}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-[#88152d]">{error}</p>}
    </div>
  );
}
