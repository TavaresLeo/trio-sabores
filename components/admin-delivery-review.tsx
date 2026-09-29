'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AdminDeliveryReview({ orderId, estimatedDistanceKm }: { orderId: string; estimatedDistanceKm: number | null }) {
  const router = useRouter();
  const [distanceKm, setDistanceKm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distanceKm: Number(distanceKm) }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Não foi possível confirmar a taxa.');
        return;
      }
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="delivery-review-card" onSubmit={submit}>
      <p>Revise o endereço e confirme a distância pela rota. Estimativa informada: {estimatedDistanceKm ?? 'não informada'} km.</p>
      <div className="delivery-review-controls">
        <label htmlFor={`delivery-distance-${orderId}`}>Distância conferida (km)</label>
        <input id={`delivery-distance-${orderId}`} type="number" min="0" max="12" step="0.1" value={distanceKm} onChange={(event) => setDistanceKm(event.target.value)} required />
        <button className="btn-primary" disabled={saving}>{saving ? 'Confirmando...' : 'Confirmar taxa e pedido'}</button>
      </div>
      {error && <p role="alert" className="text-sm text-red">{error}</p>}
    </form>
  );
}
