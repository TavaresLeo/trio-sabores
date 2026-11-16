import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeImageUrl, orderSchema } from '../lib/validators';
import { computeDeliveryQuote } from '../lib/delivery-core';

const baseOrder = {
  customerName: 'Maria da Silva',
  customerEmail: 'maria@example.com',
  customerPhone: '21999998888',
  fulfillmentType: 'PICKUP' as const,
  paymentMethod: 'PIX' as const,
  items: [{ productId: 'p1', quantity: 1 }],
};

test('aceita retirada sem endereço', () => {
  assert.equal(orderSchema.safeParse(baseOrder).success, true);
});

test('exige endereço e distância para entrega', () => {
  const delivery = { ...baseOrder, fulfillmentType: 'DELIVERY' as const };
  assert.equal(orderSchema.safeParse(delivery).success, false);

  const withAddress = {
    ...delivery,
    distanceKm: 3,
    address: {
      cep: '22000-000',
      street: 'Rua A',
      number: '10',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
    },
  };
  assert.equal(orderSchema.safeParse(withAddress).success, true);
});

test('normaliza nome de estado para a sigla', () => {
  const parsed = orderSchema.parse({
    ...baseOrder,
    fulfillmentType: 'DELIVERY',
    distanceKm: 2,
    address: {
      cep: '22000000',
      street: 'Rua A',
      number: '10',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'São Paulo',
    },
  });
  assert.equal(parsed.fulfillmentType, 'DELIVERY');
  assert.equal(parsed.address?.state, 'SP');
});

test('rejeita e-mail e telefone inválidos', () => {
  assert.equal(orderSchema.safeParse({ ...baseOrder, customerEmail: 'invalido' }).success, false);
  assert.equal(orderSchema.safeParse({ ...baseOrder, customerPhone: '123' }).success, false);
});

test('rejeita quantidade zero ou negativa', () => {
  assert.equal(orderSchema.safeParse({ ...baseOrder, items: [{ productId: 'p1', quantity: 0 }] }).success, false);
});

test('computeDeliveryQuote cobra base + extra por km', () => {
  const rules = [
    { minKm: 0, maxKm: 3, baseFeeCents: 500, extraFeeCentsPerKm: 0 },
    { minKm: 3.01, maxKm: 7, baseFeeCents: 500, extraFeeCentsPerKm: 250 },
  ];

  assert.equal(computeDeliveryQuote(2, rules).feeCents, 500);
  // 3.01 km: 500 + 0.00 * 250
  assert.equal(computeDeliveryQuote(3.01, rules).feeCents, 500);
  // 5 km: 500 + 1.99 * 250 = 997.5 → 998 (arredondamento único no final)
  assert.equal(computeDeliveryQuote(5, rules).feeCents, 998);
});

test('computeDeliveryQuote recusa distância maior que o limite', () => {
  const quote = computeDeliveryQuote(20, []);
  assert.equal(quote.available, false);
  assert.equal(quote.feeCents, 0);
});

test('computeDeliveryQuote recusa distância inválida', () => {
  assert.equal(computeDeliveryQuote(Number.NaN, []).available, false);
  assert.equal(computeDeliveryQuote(-1, []).available, false);
});

test('computeDeliveryQuote recusa distância sem regra configurada', () => {
  assert.equal(computeDeliveryQuote(2, []).available, false);
});

test('isSafeImageUrl aceita caminhos internos e https', () => {
  assert.equal(isSafeImageUrl('/images/bolo.jpeg'), true);
  assert.equal(isSafeImageUrl('/uploads/abc.png'), true);
  assert.equal(isSafeImageUrl('https://exemplo.com/foto.jpg'), true);
  assert.equal(isSafeImageUrl('data:image/png;base64,AAAA'), true);
});

test('isSafeImageUrl bloqueia esquemas executáveis', () => {
  assert.equal(isSafeImageUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageUrl('data:text/html;base64,AAAA'), false);
  assert.equal(isSafeImageUrl('/etc/passwd'), false);
  assert.equal(isSafeImageUrl(''), false);
});
