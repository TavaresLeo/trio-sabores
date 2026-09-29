import { z } from 'zod';

const addressSchema = z.object({
  cep: z.string().trim().max(20).transform((value) => value.replace(/\D/g, '')).refine((value) => value.length === 8, 'Informe um CEP válido.'),
  street: z.string().trim().min(2).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().regex(/^[a-zA-Z]{2}$/).transform((value) => value.toUpperCase()),
});

export const orderSchema = z.object({
  customerName: z.string().trim().min(5).max(100),
  customerEmail: z.string().trim().email().max(150),
  customerPhone: z.string().trim().min(10).max(20)
    .refine((value) => value.replace(/\D/g, '').length >= 10 && value.replace(/\D/g, '').length <= 15),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
  address: addressSchema.optional(),
  distanceKm: z.number().min(0).max(100).optional(),
  paymentMethod: z.enum(['CARD', 'PIX', 'CASH_ON_DELIVERY']),
  cashChangeForCents: z.number().int().nonnegative().optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().max(40).optional(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(99) })).min(1),
}).superRefine((payload, context) => {
  if (payload.fulfillmentType === 'DELIVERY' && !payload.address) {
    context.addIssue({ code: 'custom', path: ['address'], message: 'Informe o endereço de entrega.' });
  }
  if (payload.fulfillmentType === 'DELIVERY' && payload.distanceKm === undefined) {
    context.addIssue({ code: 'custom', path: ['distanceKm'], message: 'Informe a distância para calcular a entrega.' });
  }
});
