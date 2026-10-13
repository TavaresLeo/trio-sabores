const configuredNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521994403746';

export const whatsappNumber = configuredNumber.replace(/\D/g, '');
export const whatsappDisplayNumber = '(21) 99440-3746';

export function whatsappLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
