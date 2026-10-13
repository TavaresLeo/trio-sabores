'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function CustomerDeleteButton({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    if (!window.confirm(`Excluir a conta de ${customerName}? Os pedidos anteriores serão mantidos no histórico.`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível excluir a conta.');
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
    <div>
      <button type="button" onClick={remove} disabled={deleting} className="text-xs font-semibold text-[#88152d] underline disabled:opacity-50">
        {deleting ? 'Excluindo...' : 'Excluir conta'}
      </button>
      {error && <p role="alert" className="mt-1 max-w-40 text-xs text-[#88152d]">{error}</p>}
    </div>
  );
}
