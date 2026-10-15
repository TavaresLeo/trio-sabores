'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'PREPARING', label: 'Em preparo' },
  { value: 'OUT_FOR_DELIVERY', label: 'Saiu para entrega' },
  { value: 'DELIVERED', label: 'Entregue / Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const;

export function OrderStatusController({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateStatus = async (newStatus: string) => {
    if (newStatus === status) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'Erro ao atualizar status.');
        return;
      }
      setStatus(newStatus);
      router.refresh();
    } catch {
      setError('Falha na conexão com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`order-status-${orderId}`} className="text-xs font-semibold text-brown/70">
        Status:
      </label>
      <select
        id={`order-status-${orderId}`}
        value={status}
        disabled={saving}
        onChange={(e) => updateStatus(e.target.value)}
        className="rounded border border-[#dfd0b8] bg-[#fffdf9] px-2 py-1 text-xs font-semibold text-[#671528] focus:outline-none focus:ring-1 focus:ring-wine disabled:opacity-50"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {saving && <span className="text-xs text-brown/60">Atualizando...</span>}
      {error && <span role="alert" className="text-xs text-[#88152d]">{error}</span>}
    </div>
  );
}
