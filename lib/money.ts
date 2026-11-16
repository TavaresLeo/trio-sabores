export function formatBRL(cents: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * Interpreta valores monetários brasileiros e devolve o total em centavos.
 *
 * Formatação aceita (documentada em docs/PRICE_FORMAT.md):
 * - `R$ 1.234,56` → 123456
 * - `1.234,56`    → 123456
 * - `1234,56`     → 123456
 * - `1234.56`     → 123456 (ponto como separador decimal, 1 ou 2 casas)
 * - `1.234`       → 123400 (ponto como separador de milhar, 3 dígitos)
 * - `1234`        → 123400 (inteiro = reais)
 * - `R$ 45,90`    → 4590
 *
 * Devolve `null` para entradas inválidas, vazias, negativas ou ambíguas — nunca
 * converte silenciosamente para zero. Os valores são calculados a partir dos
 * dígitos (sem aritmética de ponto flutuante sobre reais), preservando centavos.
 */
export function parseBRL(value: unknown): number | null {
  if (typeof value !== 'string') return null;

  let raw = value.replace(/\u00a0/g, ' ').trim();
  if (!raw) return null;

  raw = raw.replace(/^R\$\s*/i, '').trim();
  if (!raw) return null;

  const cleaned = raw.replace(/\s/g, '');
  if (!/^[0-9.,]+$/.test(cleaned) || !/[0-9]/.test(cleaned)) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalized: string;

  if (lastComma >= 0 && lastDot >= 0) {
    if (cleaned.split(',').length > 2) return null;
    if (lastComma > lastDot) {
      // pt-BR: 1.234,56
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // en-US: 1,234.56
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    if (cleaned.split(',').length > 2) return null;
    normalized = cleaned.replace(',', '.');
  } else if (lastDot >= 0) {
    const groups = cleaned.split('.');
    if (groups.length > 2) {
      const validThousands =
        /^[0-9]{1,3}$/.test(groups[0]) && groups.slice(1).every((group) => /^[0-9]{3}$/.test(group));
      if (!validThousands) return null;
      normalized = groups.join('');
    } else if (/^[0-9]{1,3}\.[0-9]{3}$/.test(cleaned)) {
      // Um único ponto seguido de exatamente 3 dígitos: separador de milhar.
      normalized = cleaned.replace('.', '');
    } else {
      normalized = cleaned;
    }
  } else {
    normalized = cleaned;
  }

  if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(normalized)) return null;

  const [integerPart, fractionPart = ''] = normalized.split('.');
  if (integerPart.length > 12) return null;

  const reais = Number(integerPart);
  const cents = Number((fractionPart + '00').slice(0, 2));
  const total = reais * 100 + cents;

  return Number.isSafeInteger(total) ? total : null;
}
