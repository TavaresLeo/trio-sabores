import { db } from './db';

export async function quoteDelivery(distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error('Distância inválida.');
  const rules = await db.deliveryRule.findMany({ where: { enabled: true }, orderBy: { minKm: 'asc' } });
  if (distanceKm > 12) return { available: false, distanceKm, feeCents: 0, message: 'Desculpe, não realizamos entregas para esta distância.' };
  const rule = rules.find((r) => distanceKm >= Number(r.minKm) && distanceKm <= Number(r.maxKm));
  if (!rule) return { available: false, distanceKm, feeCents: 0, message: 'Não há uma regra de entrega configurada para esta distância.' };
  const extraKm = Math.max(0, distanceKm - Number(rule.minKm));
  const feeCents = Math.round(rule.baseFeeCents + extraKm * rule.extraFeeCentsPerKm);
  return { available: true, distanceKm, feeCents, message: `Distância estimada: ${distanceKm.toFixed(1)} km` };
}
