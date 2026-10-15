export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}
export function parseBRL(value: string) {
  if (!value) return 0;
  const cleaned = value.trim().replace(/^R\$\s*/i, '');
  if (!cleaned) return 0;
  if (cleaned.includes(',') || cleaned.includes('.')) {
    let normalized = cleaned;
    if (normalized.includes('.') && normalized.includes(',')) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }
    const parsedFloat = parseFloat(normalized);
    return isNaN(parsedFloat) ? 0 : Math.round(parsedFloat * 100);
  }
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num * 100;
}

