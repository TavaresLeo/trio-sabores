export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
export function parseBRL(value: string) {
  const normalized = value.replace(/[^0-9]/g, '');
  return Number(normalized || 0);
}
