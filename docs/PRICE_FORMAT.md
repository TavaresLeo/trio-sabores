# Formato de preços — Trio Sabores

## Regra principal

**Todos os preços são armazenados e transportados em centavos inteiros**
(`priceCents`, `subtotalCents`, `deliveryFeeCents`, `discountCents`,
`totalCents`, `cashChangeForCents`). Nunca use `float` para dinheiro no banco.

A conversão texto → centavos acontece apenas na borda (`lib/money.ts`):

```ts
import { parseBRL } from '@/lib/money';

const cents = parseBRL('R$ 1.234,56'); // 123456
if (cents === null) {
  // entrada inválida: mostre uma mensagem ao usuário
}
```

`parseBRL` devolve `number | null`. **Nunca** devolve `0` para entrada inválida.

## Formatos aceitos

| Entrada | Resultado (centavos) | Observação |
|---|---|---|
| `R$ 1.234,56` | `123456` | formato brasileiro completo |
| `1.234,56` | `123456` | sem símbolo |
| `1234,56` | `123456` | vírgula decimal sem milhar |
| `1234,5` | `123450` | uma casa decimal |
| `0,05` | `5` | centavos |
| `1234.56` | `123456` | ponto como decimal (1–2 casas) |
| `1.234` | `123400` | ponto como milhar (3 dígitos) |
| `1.234.567` | `123456700` | múltiplos separadores de milhar |
| `1234` | `123400` | inteiro = reais inteiros |
| `R$ 45,90` | `4590` | símbolo com espaço |
| `0` | `0` | zero explícito |

## Entradas rejeitadas (`null`)

- vazio, apenas espaços, apenas `R$`;
- letras ou qualquer caractere fora de dígitos, `.` e `,`;
- negativos (`-10`);
- vírgula com mais de duas casas (`12,345`);
- separadores inconsistentes (`1.2.3`, `10,,5`);
- ponto seguido de 2 dígitos depois de um grupo de milhar (`1.234.56`);
- valores com mais de 12 dígitos inteiros (fora da faixa segura);
- tipos que não sejam `string`.

## Ambiguidade documentada

`1.234` é interpretado como **mil duzentos e trinta e quatro reais**, porque o
ponto é seguido por exatamente três dígitos — convenção de separador de milhar
no Brasil. Para expressar "um real e vinte e três centavos e quatro décimos",
use `1,234` (que também é rejeitado, por ter três casas) ou `1,23`.

## Precisão

O cálculo não usa `parseFloat` sobre reais. O valor é dividido em parte inteira
e fração, e os centavos são montados por manipulação de string:

```
"1234,56" → inteiro "1234", fração "56" → 1234 * 100 + 56 = 123456
```

Isso elimina erros de arredondamento como `0.1 + 0.2`.

## Formatação

```ts
formatBRL(123456); // "R$ 1.234,56"
```

Usa `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
