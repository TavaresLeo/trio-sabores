import { z } from 'zod';

const brazilianStateCodes: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

const addressSchema = z.object({
  cep: z.string().trim().max(20).transform((value) => value.replace(/\D/g, '')).refine((value) => value.length === 8, 'Informe um CEP válido.'),
  street: z.string().trim().min(2).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(120).optional(),
  neighborhood: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim()
    .transform((value) => {
      const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const stateName = Object.keys(brazilianStateCodes).find(
        (name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized,
      );
      return stateName ? brazilianStateCodes[stateName] : value.toUpperCase();
    })
    .refine((value) => /^[A-Z]{2}$/.test(value), 'Informe a sigla de dois caracteres ou o nome de um estado brasileiro.'),
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
