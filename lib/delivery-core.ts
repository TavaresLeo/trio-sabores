export const MAX_DELIVERY_KM = 12;

export type DeliveryRuleLike = {
  minKm: number;
  maxKm: number;
  baseFeeCents: number;
  extraFeeCentsPerKm: number;
};

export type DeliveryQuote = {
  available: boolean;
  distanceKm: number;
  feeCents: number;
  message: string;
};

/**
 * Cálculo puro da taxa de entrega — todos os valores permanecem em centavos
 * inteiros, com arredondamento único ao final.
 */
export function computeDeliveryQuote(distanceKm: number, rules: DeliveryRuleLike[]): DeliveryQuote {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return { available: false, distanceKm: 0, feeCents: 0, message: 'Distância inválida.' };
  }
  if (distanceKm > MAX_DELIVERY_KM) {
    return {
      available: false,
      distanceKm,
      feeCents: 0,
      message: 'Desculpe, não realizamos entregas para esta distância.',
    };
  }
  const rule = rules.find((item) => distanceKm >= item.minKm && distanceKm <= item.maxKm);
  if (!rule) {
    return {
      available: false,
      distanceKm,
      feeCents: 0,
      message: 'Não há uma regra de entrega configurada para esta distância.',
    };
  }
  const extraKm = Math.max(0, distanceKm - rule.minKm);
  const feeCents = Math.round(rule.baseFeeCents + extraKm * rule.extraFeeCentsPerKm);
  return { available: true, distanceKm, feeCents, message: `Distância estimada: ${distanceKm.toFixed(1)} km` };
}
