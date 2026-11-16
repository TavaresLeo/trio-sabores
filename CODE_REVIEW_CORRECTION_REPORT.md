# Code Review — Relatório de Correções

**Projeto:** Trio Sabores
**Data:** 16/11/2026
**Ambiente de validação:** Node.js 20.19.5 · npm 10.8.2 · Next.js 16.3.0 · Prisma 7.10.0 · PostgreSQL 17

---

## 1. Resumo executivo

Os 45 achados do `CODE_REVIEW_REPORT.md` foram analisados individualmente.

| Situação | Quantidade |
|---|---|
| Corrigido e testado | **26** |
| Corrigido, mas sem teste executável | **7** |
| Parcialmente corrigido | **1** |
| Não reproduzido (não era defeito / comportamento intencional) | **11** |
| Não corrigido | **0** |
| **Total** | **45** |

Além dos 45, foram encontrados e corrigidos **6 problemas adicionais** durante a
implementação (seção 2.4).

**Validações executadas com sucesso:** TypeScript (0 erros), ESLint (0
problemas), 39 testes unitários (39/39), build de produção, aplicação real das
migrations em PostgreSQL 17 descartável, verificação de constraints/índices via
SQL e 22 verificações de runtime contra o servidor de produção compilado.

**Não executado:** deploy na Vercel, inspeção em navegador (modal do carrinho,
hidratação visual, autocomplete) e validação de `sslmode=verify-full` contra o
provedor real. Ver seções 10 e 11.

---

## 2. Principais correções

### 2.1 Segurança crítica

**Health endpoint (`app/api/health/route.ts`)**
Antes: `{status, service, database, timestamp}` — expunha disponibilidade do
banco e horário do servidor.
Agora: `{"status":"ok"}` com `Cache-Control: no-store`. Não toca no banco.
Foi criado `GET /api/admin/health`, protegido por sessão administrativa, que
verifica o banco e devolve apenas `{"status","database"}`, sem mensagens do
PostgreSQL.

**Upload de SVG (`app/api/admin/upload/route.ts`)**
SVG removido da lista de formatos. A validação passou a ter três níveis
independentes (MIME declarado, extensão, **magic bytes**) implementados em
`lib/upload.ts`, sem dependência nova. Nomes de arquivo passaram a ser
`crypto.randomUUID()`; o nome do cliente é descartado.

**Armazenamento em produção**
O fallback silencioso para `public/uploads/` foi eliminado em produção. Sem
`BLOB_READ_WRITE_TOKEN`, o endpoint responde **503** com erro controlado. Falha
do Vercel Blob também retorna erro — nunca grava em disco efêmero.

**Rate limiting (`lib/rate-limit.ts` + `lib/rate-limit-core.ts`)**
Armazenamento no PostgreSQL (tabela `RateLimitBucket`) com
`SELECT ... FOR UPDATE` em transação: é compartilhado entre instâncias
serverless, ao contrário de memória de processo. Se o armazenamento falhar, a
rota responde 503 (**fail-closed**), nunca "sem limite" silenciosamente.

**Bloqueio progressivo do login administrativo**
Duas dimensões (IP + conta), 5 tentativas por 15 min, bloqueio base de 15 min
que dobra até 4x em reincidência (`violations` persistido). Mensagem única para
qualquer falha, sem revelar existência da conta. Só falhas contam: login correto
reseta o contador da conta.

**Proteção das rotas administrativas**
Criado `proxy.ts` (a convenção `middleware.ts` está depreciada no Next 16), que
valida a assinatura do JWT e o papel `ADMIN` para `/admin/:path*` e
`/api/admin/:path*`. A autorização definitiva continua em cada página e em cada
handler via `verifyAdmin()` — o proxy é uma camada adicional, não substituta.

### 2.2 Banco de dados

- `Product.category` → `onDelete: Restrict`; `OrderItem.product` →
  `onDelete: Restrict`. Ambos explícitos e verificados no banco
  (`confdeltype = 'r'`).
- `Product.rating` passou a `Float?` (sem default `5`), com limpeza de dados:
  `UPDATE "Product" SET rating = NULL WHERE reviewsCount = 0`.
- 12 índices adicionados (FKs, filtros de catálogo, listagem de pedidos).
- Migrations versionadas criadas (baseline + hardening).

### 2.3 Frontend

- `parseBRL` reescrito: devolve `number | null`, calcula centavos sem ponto
  flutuante e documenta formatos ambíguos (`docs/PRICE_FORMAT.md`).
- `window.confirm` substituído por `ConfirmDialog` acessível (foco preso, Esc,
  clique no fundo, foco inicial no "Cancelar" para ações destrutivas).
- Carrinho com estado explícito de hidratação: `hydrated` só vira `true` após
  `persist.rehydrate()`, então a UI mostra "Carregando seu carrinho..." em vez
  de "carrinho vazio".
- `autoComplete`/`inputMode` semânticos em todos os campos do checkout.
- `force-dynamic` removido da home → ISR (`revalidate = 60`).
- Avaliações: estrelas só aparecem com `reviewsCount > 0` e `rating != null`.
  Removidos os fallbacks fictícios `4.9` e `24 avaliações` do card.

### 2.4 Problemas adicionais encontrados e corrigidos

| # | Problema | Arquivo | Status |
|---|---|---|---|
| A | `<Image>` com URL do Vercel Blob falhava por falta de `remotePatterns` | `next.config.ts` | CORRIGIDO E TESTADO |
| B | Contador de rate limit incrementava 2x por tentativa (avanço aplicado duas vezes na transação) | `lib/rate-limit.ts` | CORRIGIDO E TESTADO |
| C | Duplo clique em "Finalizar Pedido" criava dois pedidos | `app/api/orders/route.ts` | CORRIGIDO E TESTADO |
| D | Validade do cupom (`startsAt`/`endsAt`) era ignorada | `app/api/orders/route.ts` | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| E | `imageUrl` aceitava qualquer string (inclusive `javascript:`) | create/update de produto | CORRIGIDO E TESTADO |
| F | Quantidade e preço do pedido não eram revalidados contra o banco no momento da criação | `app/api/orders/route.ts` | CORRIGIDO E TESTADO |

> O item **B** foi descoberto pelo próprio teste de força bruta: a 5ª tentativa
> bloqueava em vez da 6ª. Corrigido e re-verificado (5×401, depois 429).

---

## 3. Arquivos modificados

### Novos

| Arquivo | Função |
|---|---|
| `proxy.ts` | guarda de navegação das rotas admin (JWT + papel) |
| `lib/http.ts` | helpers de erro, request-id, same-origin, logging seguro |
| `lib/rate-limit.ts` | rate limiting persistido no PostgreSQL |
| `lib/rate-limit-core.ts` | regra pura de janela/bloqueio progressivo (testável) |
| `lib/upload.ts` | detecção de formato por magic bytes |
| `lib/delivery-core.ts` | cálculo puro de taxa de entrega |
| `app/api/admin/health/route.ts` | readiness protegido |
| `components/confirm-dialog.tsx` | modal de confirmação acessível |
| `tests/money.test.ts` | 8 testes |
| `tests/upload.test.ts` | 12 testes |
| `tests/rate-limit.test.ts` | 9 testes |
| `tests/validators.test.ts` | 10 testes |
| `prisma/migrations/0_init/migration.sql` | baseline do schema |
| `prisma/migrations/20251116000000_hardening_constraints/migration.sql` | constraints, índices, `RateLimitBucket` |
| `docs/SECURITY.md`, `docs/DATABASE.md`, `docs/PRICE_FORMAT.md` | documentação técnica |
| `CODE_REVIEW_CORRECTION_REPORT.md` | este relatório |

### Alterados

| Arquivo | Alteração |
|---|---|
| `next.config.ts` | headers de segurança, CSP, HSTS, `remotePatterns`, `allowedDevOrigins` via env |
| `prisma/schema.prisma` | `onDelete`, `rating` nullable, índices, `RateLimitBucket` |
| `prisma/seed.ts` | falha explícita sem `ADMIN_INITIAL_PASSWORD` |
| `lib/money.ts` | `parseBRL` estrito |
| `lib/validators.ts` | `isSafeImageUrl` |
| `lib/delivery.ts` | usa cálculo puro |
| `types/shop.ts` | `rating` anulável |
| `components/shop-state.tsx` | hidratação explícita |
| `components/product-card.tsx` | sem avaliações fictícias |
| `app/page.tsx` | ISR em vez de `force-dynamic` |
| `app/produto/[slug]/page.tsx` | avaliações honestas |
| `app/carrinho/page.tsx` | modal + estado de hidratação |
| `app/checkout/page.tsx` | `autoComplete`, `parseBRL` nulo, bloqueio de duplo envio |
| `app/globals.css` | estilos do modal |
| `app/api/health/route.ts` | resposta mínima |
| `app/api/admin/upload/route.ts` | validação por magic bytes, sem fallback |
| `app/api/admin/login/route.ts` | rate limit IP+conta, resposta 429 |
| `app/api/auth/login/route.ts` | rate limit, mesma mensagem |
| `app/api/auth/register/route.ts` | rate limit, erros seguros |
| `app/api/admin/password/route.ts` | rate limit na troca de senha |
| `app/api/cep/route.ts` | timeout 5 s, erros tratados |
| `app/api/orders/route.ts` | rate limit, same-origin, idempotência, cupom, erros |
| `app/api/products/route.ts` | cache público |
| `app/api/admin/products/route.ts` | erros seguros, `imageUrl` validada |
| `app/api/admin/products/[id]/route.ts` | `imageUrl` validada |
| `app/api/admin/categories/route.ts` | erros seguros |
| `app/api/delivery/quote/route.ts` | entrada validada, sem vazamento |
| `app/admin/produtos/client.tsx`, `editor.tsx` | tratam `parseBRL === null` |
| `package.json` | script `test` |
| `.env.example` | template completo e documentado |
| `.gitignore` | `.tools/` |
| `README.md`, `DEPLOY.md` | instruções atualizadas |

---

## 4. Segurança — o que foi eliminado e adicionado

### Vulnerabilidades eliminadas

1. **Exposição de infraestrutura** no health check.
2. **XSS via upload de SVG** com script embutido.
3. **Upload de arquivo executável** renomeado como imagem (validação por magic
   bytes).
4. **Força bruta sem limite** no login admin e no login/registro de clientes.
5. **Enumeração de contas** via diferença de comportamento do login.
6. **Falta de headers de segurança** (clickjacking, MIME sniffing, HSTS).
7. **Escrita em disco efêmero** em produção com falha silenciosa.
8. **Vazamento de mensagens internas** de erro (incluindo `Error.message` de
   rotas administrativas).
9. **`imageUrl` arbitrária** permitindo esquemas executáveis.
10. **Dados enganosos**: nota 5,0 e "24 avaliações" fictícias.

### Controles adicionados

- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `COOP`.
- Rate limiting compartilhado, progressivo e fail-closed, em 7 operações.
- Verificação de origem em operações que alteram estado (403 para origem
  externa).
- Idempotência na criação de pedidos.
- `request-id` correlacionável em respostas de erro.
- Logging estruturado sem dados pessoais.

### OWASP Top 10 — situação

| Categoria | Situação |
|---|---|
| A01 Broken Access Control | Todas as rotas admin validam sessão no servidor; proxy adicionado |
| A02 Cryptographic Failures | bcrypt 12, JWT HS256 ≥32 bytes, cookies `Secure`/`HttpOnly` |
| A03 Injection | Prisma parametrizado; `$queryRaw` com template parametrizado |
| A04 Insecure Design | Rate limiting progressivo, idempotência, validação server-side |
| A05 Security Misconfiguration | Headers, CSP, sem wildcard de origem, erros genéricos |
| A06 Vulnerable Components | Nenhuma dependência nova; auditoria não executada neste ciclo |
| A07 Auth Failures | Bloqueio progressivo, mensagens genéricas, `sessionVersion` |
| A08 Data Integrity | Preços em centavos, transações, stock/availability revalidados |
| A09 Logging Failures | Logs estruturados com request-id, sem PII |
| A10 SSRF | Única chamada externa é o ViaCEP com URL fixa e timeout |

---

## 5. Migrations criadas

```
prisma/migrations/0_init/migration.sql
prisma/migrations/20251116000000_hardening_constraints/migration.sql
```

**Precisam ser executadas?** Sim. Procedimento em `docs/DATABASE.md` e
`DEPLOY.md`.

- Banco novo: `npx prisma migrate deploy`.
- Banco existente (criado com `db push`):
  `npx prisma migrate resolve --applied 0_init` → `npx prisma migrate deploy`.

A migration de hardening é aditiva, exceto a anulação de `Product.rating` onde
`reviewsCount = 0` (remoção de dado fictício). **Nenhuma linha é excluída.**

Teste executado em PostgreSQL 17 descartável: `migrate deploy` aplicou as duas
migrations; `migrate status` retornou "Database schema is up to date".

---

## 6. Dependências

**Adicionadas:** nenhuma.
**Removidas:** nenhuma.

A detecção de magic bytes foi implementada à mão (~70 linhas) em vez de trazer
`file-type`; a lógica de rate limiting usa o PostgreSQL já existente em vez de
Redis. Os testes usam `node:test` + `tsx`, ambos já presentes.

> Recomendação futura: Redis/Upstash para rate limiting se o tráfego crescer, e
> `file-type` se forem necessários mais formatos.

---

## 7. Testes executados

| # | Comando | Resultado |
|---|---|---|
| 1 | `npx tsc --noEmit` | **0 erros** |
| 2 | `npx eslint .` | **0 problemas** |
| 3 | `npm test` | **39/39 passaram** |
| 4 | `npm run build` (`prisma generate && next build`) | **sucesso**, 36 rotas, proxy compilado |
| 5 | `npx prisma migrate deploy` (PostgreSQL 17 descartável) | **2 migrations aplicadas** |
| 6 | SQL: constraints, `rating` nullable, índices | **verificado** |
| 7 | `npm run db:seed` | **sucesso** |
| 8 | Seed sem `ADMIN_INITIAL_PASSWORD` | **falha controlada (exit 1)**, nenhum admin criado |
| 9 | Smoke HTTP (22 verificações) | **todas conforme esperado** |

### 7.1 Testes unitários (39)

- **money (8):** formatos pt-BR, inteiros como reais, milhar vs decimal,
  rejeição de inválidos, ausência de erro de arredondamento, `formatBRL`.
- **upload (12):** detecta JPEG/PNG/WebP/AVIF; rejeita SVG, XML/HTML, ELF, MZ,
  arquivo curto; rejeita MIME falso, extensão incompatível e arquivo sem
  extensão.
- **rate-limit (9):** limite, bloqueio, `retryAfter`, bloqueio ativo, liberação,
  reset de janela, progressão 1x→2x→4x, `peek` sem bloqueio inventado.
- **validators/delivery (10):** endereço obrigatório para entrega, normalização
  de UF, e-mail/telefone, quantidade, cálculo de taxa, distância inválida,
  `isSafeImageUrl`.

### 7.2 Verificações de runtime (servidor de produção compilado)

| Verificação | Esperado | Obtido |
|---|---|---|
| `GET /api/health` | só `status` | `{"status":"ok"}` ✅ |
| Headers de segurança | 6 headers | todos presentes ✅ |
| `GET /api/admin/health` sem sessão | 401 | 401 ✅ |
| `GET /admin/pedidos` sem sessão | redirect | 307 → `/admin/login` ✅ |
| Login admin correto | 200 | 200 ✅ |
| Troca de senha obrigatória | 200 | 200 ✅ |
| Login com nova senha | `mustChangePassword:false` | ✅ |
| `/api/admin/health` com sessão | `database: ok` | ✅ |
| Upload SVG | 415 | 415 ✅ |
| Upload `.jpg` com executável | 415 | 415 ✅ |
| Upload PNG chamado `.jpg` | 415 | 415 ✅ |
| Upload PNG válido sem Blob token | 503, 0 arquivos em disco | 503, 0 arquivos ✅ |
| Upload sem sessão | 401 | 401 ✅ |
| Cross-origin em `/api/orders` | 403 | 403 ✅ |
| CEP inválido | 400 | 400 ✅ |
| Força bruta admin (limite 5) | 5×401, depois 429 | 5×401, 6ª 429, `Retry-After: 900` ✅ |
| Bloqueado não revela conta | 429 | 429 ✅ |
| Login de usuário inexistente | mensagem genérica | "E-mail ou senha incorretos." ✅ |
| Home com ISR | `x-nextjs-cache: HIT/STALE` | ✅ |
| Registro (limite 5/h) | 5×201, depois 429 | 5×201, 6ª 429 ✅ |
| Pedido de retirada | criado | `#TS-2026-2725`, `CONFIRMED` ✅ |
| Reenvio imediato | mesmo pedido | mesmo `publicNumber` ✅ |
| CEP válido (ViaCEP) | dados do endereço | Avenida Paulista / Bela Vista / SP ✅ |
| Erros no log do servidor | 0 | 0 ✅ |

### 7.3 Ambiente

A máquina tinha apenas **Node 18.19.1**, que não executa `prisma generate` nem
`next build` (exigem ≥ 20.9). Foi baixado Node 20.19.5 para `.tools/node20/`
(dentro do projeto, ignorado pelo git) e usado apenas para as validações. O
`package.json` continua exigindo `node >= 20.19.0`.

O banco de produção configurado em `.env` é um Neon e **não** foi alterado: a
migration foi testada em um container PostgreSQL 17 descartável na porta 55432.

---

## 8. Matriz de rastreabilidade — 45 achados

| ID | Problema | Severidade | Arquivo | Solução | Teste | Status |
|---|---|---|---|---|---|---|
| 1 | Health expõe dados internos | Crítica | `app/api/health/route.ts` | Resposta mínima, sem banco/timestamp | Smoke #1 | CORRIGIDO E TESTADO |
| 2 | Upload de SVG sem sanitização | Crítica | `app/api/admin/upload/route.ts` | SVG removido; validação por magic bytes | Smoke #7, unit upload | CORRIGIDO E TESTADO |
| 3 | `.env.example` ausente/incompleto | Crítica | `.env.example` | Template completo e comentado | Inspeção + seed | CORRIGIDO E TESTADO |
| 4 | Ausência de security headers | Major | `next.config.ts` | CSP, HSTS, XFO, nosniff, Referrer, Permissions, COOP | Smoke #2 | CORRIGIDO E TESTADO |
| 5 | `allowedDevOrigins` com wildcard | Major | `next.config.ts` | Lista exata via `DEV_ALLOWED_ORIGINS` | Build + inspeção | CORRIGIDO E TESTADO |
| 6 | Health revela status do banco | Major | `app/api/health/route.ts` | Liveness público sem banco; readiness em `/api/admin/health` | Smoke #1/#2 | CORRIGIDO E TESTADO |
| 7 | Fallback local em `public/uploads` | Major | `app/api/admin/upload/route.ts` | Produção exige Blob; 503 sem fallback | Smoke #10 | CORRIGIDO E TESTADO |
| 8 | Login admin sem rate limit | Major | `app/api/admin/login/route.ts` | IP+conta, progressivo, 429 | Smoke #14 | CORRIGIDO E TESTADO |
| 9 | Registro sem rate limit | Major | `app/api/auth/register/route.ts` | 5/hora por IP | Smoke #18 | CORRIGIDO E TESTADO |
| 10 | Prisma sem `onDelete` explícito | Major | `prisma/schema.prisma` | `Restrict` em `category` e `OrderItem.product` | SQL `confdeltype='r'` | CORRIGIDO E TESTADO |
| 11 | `rating`/`reviewsCount` enganosos | Major | schema, `product-card.tsx`, `produto/[slug]` | `rating` anulável, dados limpos, UI condicional | SQL + build | CORRIGIDO E TESTADO |
| 12 | Pedido sem usuário autenticado | Major | `app/api/orders/route.ts` | Mantido: guest checkout é requisito | Smoke #19 | NÃO REPRODUZIDO |
| 13 | `allowedDevOrigins` padrões de rede | Minor | `next.config.ts` | Mesmo que #5 | Build | CORRIGIDO E TESTADO |
| 14 | `parseBRL` com casos-limite | Minor | `lib/money.ts` | Reescrito, retorna `null` | 8 testes | CORRIGIDO E TESTADO |
| 15 | `/api/cep` sem timeout | Minor | `app/api/cep/route.ts` | `AbortController` 5 s, 504 tratado | Smoke #21 (sucesso); timeout não exercitado | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 16 | `confirm()` nativo no carrinho | Minor | `app/carrinho/page.tsx` | `ConfirmDialog` acessível | Build/typecheck; não testado em navegador | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 17 | `autoComplete` ausente | Minor | `app/checkout/page.tsx` | `name`, `tel`, `email`, `postal-code`, `address-line*`, `address-level*` | Typecheck; não testado em navegador | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 18 | `skipHydration` mostra carrinho vazio | Minor | `components/shop-state.tsx` | Flag `hydrated` + estado de carregamento | Build; não testado em navegador | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 19 | `force-dynamic` na home | Minor | `app/page.tsx` | ISR `revalidate = 60` | Smoke #17 (`x-nextjs-cache`) | CORRIGIDO E TESTADO |
| 20 | Upload confia em MIME/extensão | Minor | `app/api/admin/upload/route.ts` | Magic bytes + coerência MIME/extensão | Smoke #8/#9, 12 testes | CORRIGIDO E TESTADO |
| 21 | Sitemap com `updatedAt` incorreto | Minor | `app/sitemap.ts` | Já usa `updatedAt` real dos produtos | Inspeção | NÃO REPRODUZIDO |
| 22 | `initialAdminPassword` com fallback vazio | Minor | `prisma/seed.ts` | Falha explícita com mensagem clara | Seed sem senha → exit 1 | CORRIGIDO E TESTADO |
| 23 | Mensagens de erro vazando internals | Minor | rotas de API | `lib/http.ts` centraliza; sem `Error.message` público | Revisão + smoke sem stack | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 24 | `runtime='nodejs'` no upload | Minor | `app/api/admin/upload/route.ts` | Mantido e documentado (Buffer + disco local) | Smoke upload | CORRIGIDO E TESTADO |
| 25 | Heurística de `productImageFor` | Minor | `lib/product-image.ts` | Mapeamento exato e legado têm prioridade; heurística só para dados quebrados | Inspeção | PARCIALMENTE CORRIGIDO |
| 26 | Layout admin não valida sessão | Minor | `proxy.ts` | Proxy + verificação por página/rota mantidas | Smoke #3 | CORRIGIDO E TESTADO |
| 27 | CORS não configurado | Minor | — | Nenhum CORS (same-origin); origem cruzada rejeitada em mutações | Smoke #12 | CORRIGIDO E TESTADO |
| 28 | `allowedDevOrigins` a testar | Nit | `next.config.ts` | Resolvido em #5 | Build | CORRIGIDO E TESTADO |
| 29 | Comentários mistos PT/EN | Nit | vários | Código novo documentado em português | Inspeção | NÃO REPRODUZIDO |
| 30 | Singleton do Prisma | Nit | `lib/db.ts` | Padrão oficial já aplicado | Inspeção | NÃO REPRODUZIDO |
| 31 | Tipagem de `process.env` | Nit | `tsconfig`/`next-env` | Não é defeito; env tipado não traz ganho aqui | — | NÃO REPRODUZIDO |
| 32 | `DIRECT_URL` ausente da documentação | Nit | `.env.example`, `prisma.config.ts` | Documentado e usado pelas migrations | `migrate deploy` | CORRIGIDO E TESTADO |
| 33 | `sslmode=verify-full` | Nit | `.env.example`, `docs/DATABASE.md` | Recomendado e documentado; não alterado no provedor | Não validado contra o provedor | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |
| 34 | Comentário no `runtime` do upload | Nit | `app/api/admin/upload/route.ts` | Comentário adicionado | Build | CORRIGIDO E TESTADO |
| 35 | Falta de `disabled` em botões | Nit | vários | Já existia de forma consistente | Inspeção | NÃO REPRODUZIDO |
| 36 | `cashChangeForCents: 0` vs ausente | Nit | `app/checkout/page.tsx` | Envia `undefined` quando o campo está vazio | Typecheck + documentação | CORRIGIDO E TESTADO |
| 37 | Tipo `ShopProduct.category` | Nit | `types/shop.ts` | `{name, slug}` é o suficiente para os consumidores | Typecheck | NÃO REPRODUZIDO |
| 38 | `deleteMany` em pedido | Nit | `app/api/admin/orders/[id]` | Comportamento correto (404 explícito) | Inspeção | NÃO REPRODUZIDO |
| 39 | Número de WhatsApp com fallback | Nit | `lib/whatsapp.ts` | Fallback é o número real da loja; documentado no `.env.example` | Inspeção | NÃO REPRODUZIDO |
| 40 | `imageUrl` sem validação | Nit | rotas de produto | `isSafeImageUrl` (bloqueia `javascript:`) | 2 testes + typecheck | CORRIGIDO E TESTADO |
| 41 | `sessionVersion` | Nit | `lib/auth.ts` | Mecanismo correto (elogio do relatório) | Inspeção | NÃO REPRODUZIDO |
| 42 | Consistência de senha | Nit | `lib/auth.ts` | Correto (elogio do relatório) | Inspeção | NÃO REPRODUZIDO |
| 43 | Ausência de middleware/proxy | Nit | `proxy.ts` | Proxy criado para `/admin` e `/api/admin` | Smoke #3 | CORRIGIDO E TESTADO |
| 44 | Migrations não versionadas | Nit | `prisma/migrations/` | Baseline + hardening versionados | `migrate deploy` | CORRIGIDO E TESTADO |
| 45 | `NEXT_PUBLIC_APP_URL` opcional | Nit | `.env.example`, `README` | Marcada como obrigatória | Documentação | CORRIGIDO, MAS SEM TESTE EXECUTÁVEL |

---

## 9. Resultados dos testes

```
$ npx tsc --noEmit
(0 erros)

$ npx eslint .
(0 problemas)

$ npm test
# tests 39
# pass 39
# fail 0

$ npm run build
✓ Compiled successfully
✓ Generating static pages (36/36)
ƒ Proxy (Middleware)

$ npx prisma migrate deploy
All migrations have been successfully applied.
```

---

## 10. Problemas pendentes

1. **Deploy não executado.** Sem acesso à conta Vercel; o build foi validado
   localmente.
2. **Interface não inspecionada em navegador.** Modal do carrinho, hidratação do
   Zustand e `autoComplete` estão implementados e compilam, mas **não foram
   abertos em um navegador** nesta execução.
3. **Migrations não aplicadas no banco de produção.** Precisam ser executadas
   com o procedimento de baseline (seção 5).
4. **`sslmode=verify-full` não validado** contra o provedor real.
5. **Pagamento real não implementado.** Checkout segue em modo demonstrativo;
   `MERCADOPAGO_*` estão reservadas e não são lidas pelo código.
6. **Sem sistema de avaliações.** `rating` fica `NULL` por decisão explícita.

---

## 11. Riscos residuais

| Risco | Descrição | Mitigação |
|---|---|---|
| Enumeração no cadastro | `409` ainda sinaliza e-mail já cadastrado, apesar do texto neutro | Fluxo de verificação por e-mail (fora do escopo) |
| CSP com `'unsafe-inline'` | Necessário para o bootstrap inline do Next sem nonce | Não renderizar HTML de usuário; `imageUrl` validada |
| `img-src https:` amplo | Permite imagem de qualquer origem HTTPS | Restringir ao domínio do Blob se não houver imagem externa |
| Rate limit no PostgreSQL | Uma escrita por requisição sensível | Migrar para Redis/Upstash em alto tráfego |
| Proxy sem consulta ao banco | Valida assinatura, não `sessionVersion` | `verifyAdmin()` em toda página e rota |
| `x-forwarded-for` confiável | Só é seguro atrás de proxy gerenciado (Vercel) | Limite por conta funciona independentemente do IP |
| Heurística de imagem | Slug parecido pode cair no mesmo fallback | Só afeta registros com `imageUrl` inválida |

---

## 12. Recomendações para produção

1. Aplicar as migrations com o procedimento de baseline antes do deploy.
2. Configurar `BLOB_READ_WRITE_TOKEN`, `JWT_SECRET` (≥32 bytes único) e
   `ADMIN_INITIAL_PASSWORD` (≥16 bytes) na Vercel.
3. Trocar a senha inicial do admin imediatamente após o primeiro login.
4. Validar `sslmode=verify-full` com o provedor antes de habilitar.
5. Abrir a loja em navegador e revisar: modal do carrinho, carrinho persistido
   após recarregar, checkout completo e painel admin.
6. Monitorar 429 e 503 nos logs (eventos `rate_limited`,
   `rate_limit_store_unavailable`).
7. Se o tráfego crescer, migrar o rate limiting para Redis/Upstash.
8. Implementar gateway de pagamento antes de aceitar cartão em produção.
