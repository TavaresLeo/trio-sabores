import { db } from './db';
import { computeDeliveryQuote, type DeliveryQuote } from './delivery-core';

export type { DeliveryQuote };

export async function quoteDelivery(distanceKm: number): Promise<DeliveryQuote> {
  const rules = await db.deliveryRule.findMany({ where: { enabled: true }, orderBy: { minKm: 'asc' } });
  return computeDeliveryQuote(
    distanceKm,
    rules.map((rule) => ({
      minKm: Number(rule.minKm),
      maxKm: Number(rule.maxKm),
      baseFeeCents: rule.baseFeeCents,
      extraFeeCentsPerKm: rule.extraFeeCentsPerKm,
    })),
  );
}
