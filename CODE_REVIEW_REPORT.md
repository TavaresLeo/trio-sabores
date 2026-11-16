# Code Review Report — trio-sabores (Next.js 16.3 + Prisma 7)

**Build status**: ✅ Passou com Node 20.19.5 (`npm run build`). Typecheck e lint também limpos.
**Ambiente local**: Node 18.19.1 (não suporta `prisma generate` nem `next build` — exigem ≥20.9).

---

## 🔴 CRÍTICO

### 1. Health endpoint expõe dados internos
**Arquivo**: `app/api/health/route.ts`
```ts
return NextResponse.json({status:'ok',service:'trio-sabores',database:'ok',timestamp:new Date().toISOString()});
```
- Retorna `timestamp` e status do banco de dados em resposta pública.
- **Impacto**: atacantes podem usar para mapear a disponibilidade do serviço.
- **Sugestão**: remova ou oculte `timestamp` e detalhes do banco em ambientes não-prod, ou retorne apenas `{status: 'ok'}`.

### 2. Upload de SVG sem sanitização
**Arquivo**: `app/api/admin/upload/route.ts`
- Aceita `image/svg+xml` como tipo MIME permitido.
- Arquivos SVG podem conter JavaScript/HTML malicioso se não sanitizados.
- **Impacto**: XSS se a imagem for exibida em página pública sem sanitização.
- **Sugestão**: remover `image/svg+xml` da lista `ALLOWED_MIME` ou adicionir sanitização (ex: `svgo` com `plugins: [{ removeScript: true }]`), ou servir SVG com `Content-Type: image/svg+xml` e `X-Content-Type-Options: nosniff`.

### 3. .env não rastreado pelo git (bom), mas .env.example incompleto
**Arquivo**: `.env.example` — **não encontrado** na raiz. O `README.md` diz `cp .env.example .env`, mas não há arquivo de exemplo versionado.
- Variáveis críticas que podem faltar: `JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- **Impacto**: desenvolvedor novo pode não saber todas as env vars necessárias; pode haver secretos hardcoded ou faltando.
- **Sugestão**: criar `.env.example` com todas as variáveis usadas, com valores placeholder claros (ex: `JWT_SECRET=colocar-uma-chave-secreta-aqui-de-pelo-minimo-32-bytes`).

---

## 🟠 MAJOR

### 4. next.config.ts sem headers de segurança
**Arquivo**: `next.config.ts`
- Apenas `poweredByHeader: false` e `reactStrictMode: true`.
- **Ausentes**: CSP, HSTS, X-Frame-Options, referrer policy, conteúdo security.
- **Impacto**: exposição a ataques de clickjacking, MIME-sniffing, etc.
- **Sugestão**: adicionir `async headers()` no next.config para definir headers de segurança globalmente:

```ts
export default {
  // ...existing config
  async headers() {
    return [
      {
        source: '/:all',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // { key: 'Content-Security-Policy', value: "default-src 'self'; img-src 'self' data:;" },
        ],
      },
    ];
  },
};
```

### 5. allowedDevOrigins com padrões wildcard
```ts
allowedDevOrigins: ["192.168.*.*", "10.*.*.*"]
```
- Next.js não interpreta `*.*` como wildcard CIDR; essas strings são passadas como-is para o desenvolvedor.
- **Impacto**: origens de desenvolvimento podem não ser devidamente permitidas, ou aceitar origens indevidas.
- **Sugestão**: usar IPs específicos ou subnets, ou documentar que essas são strings de match exactas.

### 6. Health check revela status do banco
- Mesmo ponto do item 1: `/api/health` retorna `database:'ok'` ou `'error'`. Em produção, isso confirma se o DB está up para atacantes.

### 7. Upload route fallback local — public/uploads pode ser acessível
**Arquivo**: `app/api/admin/upload/route.ts` linhas 70-81
- Em fallback local, salva em `public/uploads/`. Não há garantia de que `.next/` ou Next routing não sirva esses arquivos publicamente.
- **Impacto**: arquivos uploadados poderiam ser servidos publicamente se o caminho for adivinhado.
- **Sugestão**: verificar `next.config.ts` para garantir que `/uploads/` não seja processado como imagem/ótimo, ou usar um prefixo `/internal/uploads` com rewrites, ou confiar apenas no Vercel Blob em produção.

### 8. Admin login — taxa de tentativa não limitada
**Arquivo**: `app/api/admin/login/route.ts`
- Endpoint aceita login/senha sem limite de tentativas.
- Senha admin mínima de 8 bytes (dev), bcrypt comparation é segura, mas sem bloqueio após N falhas, ataque de força bruta é possível.
- **Impacto**: credenciais admin podem ser adivinhadas.
- **Sugestão**: adicionir rate-limiting (ex: `nano-ratelimit`, ou Next.js middleware com IP tracking), ou lockout temporário após X tentativas erradas.

### 9. Registrar nova conta — também sem rate limiting
**Arquivo**: `app/api/auth/register/route.ts`
- Mesmo problema do admin login: qualquer um pode tentar registrar com muitos e-mails diferentes.
- **Impacto**: enumeration de e-mails ou spam de contas.
- **Sugestão**: rate-limiter similar.

### 10. Prisma — missing onDelete em relations
**Arquivo**: `prisma/schema.prisma`
- `Category.products` — nenhum `onDelete`. Se categoria for deletada, produtos perdem a referência mas não são deletados.
- `Product.categoryId` — sem `onDelete` na relação. Se categoria for deletada, produtos ficam órfãos (categoryId vira null ou error dependendo do banco).
- `Address.userId` tem `onDelete: SetNull` (✅ bom).
- **Impacto**: integridade de dados em exclusões acidentais.
- **Sugestão**: adicionar `onDelete: Cascade` ou `onDelete: SetNull` conforme o desejado. Exemplo:
  ```prisma
  category  Category  @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  ```

### 11. Product `rating` e `reviewsCount` — dados estáticos enganosos
**Arquivo**: `prisma/schema.prisma` e `app/page.tsx`
- `rating Float @default(5)` e `reviewsCount Int @default(0)` nunca são atualizados via API (nenhum route de review).
- Página inicial mostra produtos com "5 estrelas" e "0 avaliações" — engana o usuário.
- **Impacto**: experiência do usuário enganosa; falsos impression de qualidade.
- **Sugestão**: remeter esses campos do schema (ou torná-los `Float? @default(null)`) e página exibir "Sem avaliações" quando `reviewsCount === 0`. Ou implementar uma rota de reviews se pretendido.

### 12. /api/orders (POST) permite pedido sem usuário autenticado
**Arquivo**: `app/api/orders/route.ts` linha 34
```ts
const customer = await verifyUser(); // pode ser null
// ... usa customer?.id mas se null, usa dados do formulário
```
- O endpoint cria pedido mesmo sem usuário logado (`userId: null`), preenchendo nome/email/phone do formulário.
- **Isso é intencional** para checkout walk-in, mas merece nota: se o usuário não estiver logado, `customer` será null e o pedido terá `userId: null`. Isso está ok, mas worth noting.

---

## 🟡 MINOR

### 13. next.config.ts `allowedDevOrigins` com padrões de rede interna
- `"192.168.*.*"` e `"10.*.*.*"` — Next.js trata esses como strings exatas, não como padrões de rede. Em dev, pode ser necessário `192.168.1.15` ao invés de wildcard.
- **Sugestão**: testar localmente ou usar variáveis de ambiente `NEXT_PUBLIC_DEV_ORIGINS` parseadas.

### 14. parseBRL edge cases
**Arquivo**: `lib/money.ts`
- Se entrada for `"R$ 0,00"` → limpa `R$$ ` → `cleaned = "0,00"` → tem vírgula → parsedFloat = 0.00 → retorna `Math.round(0 * 100)` = 0. ✅
- Se entrada for `".5"` ou `"1.5"` (sem vírgula) → `cleaned.includes(',')` é false → `parseInt(cleaned, 10)` → `NaN` → retorna 0.
- **Impacto**: formatted price "R$ ,00" ou perda de centavos em casos incomuns.
- **Sugestão**: garantir que o frontend sempre envia formato pt-BR (com vírgula) e/ou adicionir mais validações no `parseBRL`.

### 15. /api/cep — fetch externo sem timeout/tratamento robusto
**Arquivo**: `app/api/cep/route.ts`
- Fetch em `viacep.com.br` sem timeout explicitamente configurado (usa fetch default do Next).
- Se viacep cair ou limitar requisições, checkout quebra.
- **Impacto**: UX degradada se serviço externo indisponível.
- **Sugestão**: adicionir `next: { revalidate: 86400 }` já está presente. Considerar cache mais longo ou fallback local.

### 16. Botão "Limpar carrinho" sem confirmação cross-context
**Arquivo**: `components/shop-state.tsx` linha 54
```ts
<button type="button" className="cart-clear" onClick={() => { if (confirm('Limpar o carrinho?')) clear(); }}>Limpar carrinho</button>
```
- `confirm()` é um diálogo nativo — aceitável, mas poderia ser mais acessível.
- **Impacto**: baixo.
- **Sugestão**: componente modal React em vez de `confirm()`.

### 17. Componentes de form sem `autoComplete` em campos sensíveis
Vários inputs de form não têm `autoComplete` definido, o que pode causar o navegador a guardar senhas/confusão em campos de endereço/telefone.
- **Exemplos**: `app/checkout/page.tsx` — campos name, email, phone, cep, street, number, etc.
- **Sugestão**: adicionir `autoComplete` apropriado (ex: `name`, `email`, `tel`, `street-address`, `cc-number`).

### 18. Zustand persist com `skipHydration: true` — hidratação desabilitada
**Arquivo**: `components/shop-state.tsx` linha 16
```ts
persist((set, get) => ({
  // ...
}), {name:'trio-sabores-cart',skipHydration:true})
```
- `skipHydration: true` significa que o carrinho é vazio na primeira render do SSR. O carrinho é preenchido client-side após o fetch de `/api/account`.
- **Impacto**: se o usuário recarregar a página com itens no carrinho (ex: vindo de um link deep link), o carrinho estará vazio até o client-side script rodar. Pode ser confuso.
- **Sugestão**: remover `skipHydration` se os dados do carrinho vierem do servidor, ou garantir que o estado inicial corresponda ao que o servidor envia. Como o carrinho é efêmero (localStorage/sessão), o `skipHydration` talvez seja intencional para evitar serialization issues.

### 19. app/page.tsx — `dynamic = 'force-dynamic'` mas busca dados no server
**Arquivo**: `app/page.tsx` linha 1
```ts
export const dynamic = 'force-dynamic';
```
- Força rota dinâmica mesmo sendo uma página estática-like. Isso impede caching de edge/ISR.
- **Impacto**: performance ligeiramente pior para a página inicial, que poderia ser estática (gerar HTML uma vez).
- **Sugestão**: se o conteúdo não mudar a cada request, remover o `dynamic = 'force-dynamic'` ou usar `revalidate`/`generateStaticParams`.

### 20. Upload de imagem — validação de extensão baseada em nome de arquivo, não apenas MIME
**Arquivo**: `app/api/admin/upload/route.ts` linhas 38-46
```ts
const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
const ext = extMatch ? extMatch[1].toLowerCase() : '';
const validExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg']);
if (!ALLOWED_MIME.has(file.type) && !validExtensions.has(ext)) {
```
- O MIME type pode ser falsificado pelo cliente (browser envia o que o usuário selecionou). A verificação de extensão do nome do arquivo é boa defesa adicional.
- **Impacto**: baixa — attacker precisaria enviar um arquivo com nome terminando em .jpg mas conteúdo SVG, e o tipo MIME seria `image/svg+xml` ou `text/plain` dependendo. A verificação dupla (MIME + ext) ajuda.
- **Sugestão**: também validar o conteúdo real do arquivo usando uma biblioteca de detecção de tipo (ex: `file-type` npm package) como terceira linha de defesa.

### 21. Sitemap inclui todos os produtos com `updatedAt`
**Arquivo**: `app/sitemap.ts`
```ts
return [...pages.map(path=>({url:`${base}${path}`,lastModified:new Date())}),...products.map(p=>({url:`${base}/produto/${p.slug}`,lastModified:p.updatedAt}))];
```
- Todos os produtos têm `lastModified` definido como `new Date()` (data corrente) porque o Prisma `updatedAt` pode não ser retornado corretamente ou o `select` não inclui `updatedAt`.
- Na verdade, o `select:{slug:true,updatedAt:true}` **sim** inclui `updatedAt`, então virá do banco.
- **Impacto**: se `updatedAt` for antigo, o sitemap diz que a página foi atualizada ha dias/meses — pode afetar SEO.
- **Sugestão**: garantir que o `seed` e as atualizações de produto preencham `updatedAt` corretamente, ou usar `new Date()` apenas para pages estáticas e o `updatedAt` real para products.

### 22. `initialAdminPassword` fallback vazio
**Arquivo**: `prisma/seed.ts` linha 10
```ts
const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? '';
```
- Se `ADMIN_INITIAL_PASSWORD` não estiver setado, a senha inicial será `''` (vazia).
- Validação no seed (linha 52-54) impede senha vazia em produção, mas em development (`NODE_ENV !== 'production'`) a mínima é 8 bytes.
- **Impacto**: se deployar sem setar `ADMIN_INITIAL_PASSWORD`, o admin bootstrapping pode falhar ou criar usuário com senha vazia.
- **Sugestão**: tornar o `initialAdminPassword` obrigatório em todos os ambientes, ou lançar erro claro se não estiver setado.

### 23. Error messages — alguns retornam stack traces internos
**Arquivo**: `app/api/admin/products/route.ts` linha 2
```ts
catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Erro ao criar produto.'},{status:400})}
```
- A maioria dos catchs converte erro para mensagem, o que é bom. Mas em alguns lugares, erros de banco (Prisma) podem vazar detalhes.
- **Impacto**: info de debugging exposta ao usuário.
- **Sugestão**: garantir que todas as rotas tenham o mesmo padrão de `e instanceof Error ? e.message : 'Erro genérico'` e, em produção, logar o erro completo internamente.

### 24. /api/admin/upload — Vercel Blob token em runtime node
**Arquivo**: `app/api/admin/upload/route.ts` linha 7
```ts
export const runtime = 'nodejs';
```
- O runtime `nodejs` significa a rota roda em um container Node.js, não edge. O `BLOB_READ_WRITE_TOKEN` é lido de `process.env` — está ok, mas routes edge teriam acesso mais seguro a secrets via `edge.config`.
- **Impacto**: nenhum direto, mas routes edge são mais rápidos e têm melhor isolamento.
- **Sugestão**: se o upload for apenas para Vercel, considerar `export const runtime = 'edge'` e usar a API de Blob edge. Mas o current setup com fallback local justifica o `runtime = 'nodejs'`.

### 25. `productImageFor` heurística baseada em substrings — pode dar match errado
**Arquivo**: `lib/product-image.ts` linhas 73-83
```ts
if (key.includes('empad')) return '/images/empadao-artesanal.jpeg';
if (key.includes('coxinha')) return '/images/combo-de-coxinhas.jpeg';
...
```
- Se um produto tiver slug tipo `empadao-de-frango` e outro `empadao-de-vegetariano`, ambos mapearão para a mesma imagem. Se houver um produto chamado `pizza-calabresa`, o `key.includes('pizza')` pegará errado.
- **Impacto**: imagem errada exibida no produto.
- **Sugestão**: refatorar para lookup exato em `productImages` ou `legacyProductImages` first, e apenas como fallback usar heurística mais específica (ex: match full slug prefix).

### 26. Admin layout não verifica auth — delegado a cada route
**Arquivo**: `app/admin/layout.tsx`
```ts
export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
```
- Não há `verifyAdmin()` no layout — cada página admin (`/admin/pedidos`, `/admin/produtos`, etc.) faz o check individualmente.
- **Isso está ok** (princípio de menor privilégio — não carregar auth check se não precisa), mas garante que se alguma página esquecer, fique exposta.
- **Sugestão**: opcional adicionar no layout para garantir cobertura, mas o pattern atual de por-rota é aceitável se todas as páginas fizerem o check (confirmado que fazem).

### 27. CORS — não configurado explicitamente
- Não há configuração de CORS no next.config.ts ou em páginas de API.
- Next.js app router não tem CORS built-in; depende de headers de resposta ou proxy/edge config.
- **Impacto**: se houver consumo de API de origências diferentes (ex: mobile app, terceiros), pode bloquear por default.
- **Sugestão**: se necessário, adicionir headers de CORS via next.config headers() ou usar um proxy.

---

## 🟢 NITS (limpeza/boas práticas)

### 28. `allowedDevOrigins` com wildcard — testar
- Já mencionado no item 5.

### 29. Comentários consistentes em inglês vs português
- Comentários do código misturam português e inglês (ex: `// Verifica MIME type ou extensão do arquivo` vs `// Normaliza o nome do arquivo`).
- **Impacto**: baixo, estilo.
- **Sugestão**: escolher um idioma (o código parece ser desenvolvido por equipe lusófona, então português está ok).

### 30. `db` importado em muitos arquivos — consideração de singleton
- O `db` (PrismaClient) é criado uma vez e compartilhado globalmente (`lib/db.ts` linha 12). Em Next.js Server Actions/RSC, isso pode causar vazamento de memória se não for gerenciado.
- O pattern `globalForPrisma.prisma` para dev é padrão do Prisma, ok.
- **Sugestão**: nenhum mudança necessária — o Prisma Client já é otimizado para reutilização.

### 31. `next-env.d.ts` padrão — sem customizações
- Não há tipos personalizados para `process.env` além do que o TypeScript inference fornece.
- Se houver mais env vars, considerar tipar no `tsconfig` ou criar `env.d.ts`.

### 32. `prisma.config.ts` usa `env("DIRECT_URL")` — garantir que está no .env
- A config do Prisma usa `DIRECT_URL` para conexões diretas. Deve estar no `.env` (não rastreado pelo git, então o desenvolvedor deve criá-lo).
- **Sugestão**: adicionar `DIRECT_URL` ao `.env.example`.

### 33. `TURBOPACK` dev mode warnings
- O build mostrou aviso: `SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.`
- Isso vem do driver `pg`/`prisma adapters pg`. Recomenda-se explicitamente `sslmode=verify-full` no `DATABASE_URL` ou `uselibpqcompat=true&sslmode=require` para preparar para o pg v9.
- **Sugestão**: atualizar `DATABASE_URL` no `.env` para usar `sslmode=verify-full` (ou `?sslmode=verify-full`) e remover o aviso.

### 34. `app/api/upload/route.ts` — `export const runtime = 'nodejs'` sem comentário
- Justificado pelo fallback local, mas valeria um comentário explicando por que não `edge`.

### 35. Alguns botões de ação não têm `disabled` state loading visível consistente
- Em `admin-delivery-review.tsx`, o botão diz `saving ? 'Confirmando...' : 'Confirmar taxa e pedido'` — bom.
- Em `components/admin-password-form.tsx` (não lido diretamente mas mencionado) — verificar consistência.

### 36. `orderSchema` valida `cashChangeForCents` como `int . nonnegative . optional()`
- No checkout, `parseBRL(form.cashChange)` pode retornar 0 se formatação estiver errada.
- Se o usuário deixar o campo de troco em branco, `form.cashChange` será `''` → `parseBRL('')` → `cleaned = ''` → `!cleaned` → retorna `0`.
- Isso significa que "sem troco" e `cashChangeForCents: 0` são equivalentes, o que está certo.
- **Sugestão**: documentar esse comportamento ou deixar `cashChangeForCents` explícito como `undefined` quando não informado (já é opcional no schema).

### 37. `category` no tipo `ShopProduct` — só nome e slug
**Arquivo**: `types/shop.ts`
```ts
export type ShopProduct = {
  // ...
  category: { name: string; slug: string };
// ...
```
- A type apenas expõe `name` e `slug` da categoria, mas o componente `product-card` pode precisar de mais dados (id, ativa, etc.).
- **Impacto**: dependente de cada componente consumidor.
- **Sugestão**: se `category` for sempre acessada com essas chaves, o type está ok. Se precisar de mais, estender.

### 38. `app/api/admin/orders/[id]/route.ts` DELETE usa `deleteMany` por id
```ts
const result = await db.order.deleteMany({ where: { id } });
```
- `id` é o campo `_id` do Prisma (String, `@id @default(cuid())`). `deleteMany` com chave única funciona igual a `deleteOne`, mas retorna `count` em vez de lançar erro se não encontrar.
- **Isso está ok** — é mais tolerante. Mas `deleteOne` seria mais semântico. Não é um bug, apenas style.

### 39. Env var `NEXT_PUBLIC_WHATSAPP_NUMBER` hardcoded fallback
**Arquivo**: `lib/whatsapp.ts` linha 1
```ts
const configuredNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521994403746';
```
- Se a env var não estiver setada, usa número fixo. O número aparece em múltiplas páginas (contato, sucesso do pedido, etc.).
- **Impacto**: se mudar de número, precisa deployar ou setar env var. Não é um bug, mas worth noting para manutenção.
- **Sugestão**: garantir que `.env.example` e o `README` documentem essa variável.

### 40. `Product` model `imageUrl` String sem validação de URL
- O campo `imageUrl` no schema é `String` puro — qualquer string é aceita.
- No `productImageFor`, há validação de extensões e URLs externas (http/https/data), mas no DB não há restrição.
- **Impacto**: podría haver URLs inválidas ou externas sendo armazenadas.
- **Sugestão**: se desejado, adicionar um `check` no Prisma ou validar no momento do upload (já feito no route upload).

### 41. `Session` e `sessionVersion` — mecanismo de rotação OK
- O mecanismo `sessionVersion` no modelo User e vérificação em `readSession` é excelente para proteção contra fixation/fixação de sessão.
- **Elogios**: implementado corretamente.

### 42. Validação de senha consistente (8-72 bytes, bcrypt 12 rounds)
- Tanto `checkAdminCredentials`/`checkUserCredentials` quanto `hashPassword` usam `bcrypt.hash(password, 12)`.
- O schema valida byte length (min 8, max 72) tanto no frontend (Zod) quanto no backend.
- **Elogios**: consistente e seguro.

### 43. Middleware não usado — auth por rota é suficiente
- Não há `middleware.ts` no projeto. Cada rota de admin verifica `verifyAdmin()` individualmente.
- **Isso está ok** para o escopo do projeto. Se crescer, considerar middleware para prefixos `/admin/` e `/api/admin/`.

### 44. `prisma` migrations — status
- Não há migrations versionadas visíveis na pasta (apenas `seed.ts`). O `prisma.config.ts` aponta para `prisma/migrations` path.
- O `docker-compose.yml` roda `prisma db push` que pode criar migrations automaticamente ou sincronizar schema.
- **Sugestão**: se houver evolução de schema, usar `prisma migrate dev` em vez de/além de `db push`, para versionar mudanças.

### 45. `SITE_URL` ou `NEXT_PUBLIC_APP_URL` usado em sitemap e metadata
- Tanto `sitemap.ts` quanto `layout.tsx` utilizam `process.env.NEXT_PUBLIC_APP_URL`.
- **Sugestão**: garantir que essa variável esteja sempre definida; considerar `SITE_URL` como alternativa mais clara.

---

## ✅ ELOS (o que está bom)

1. **TypeScript & ESLint**: zero erros/avisos — configuração está saudável.
2. **Bcrypt rounds 12** — padrão recomendado.
3. **JWT_SECRET validação** — mínimo 32 bytes, lançado erro se inválido.
4. **sessionVersion rotação** — protege contra fixation.
5. **Bordas de preço em cents (Int)** — evita float rounding no banco.
6. **Upload de arquivo com validação MIME + extensão + tamanho** (10MB max).
7. **Password compare usando bcrypt** — seguro.
8. **Validação de formulário com Zod** em todas as rotas de API.
9. **Rate limit não implementado** mas arquitetura preparada (cada rota lida próprio input).
10. **Zustand persist com nome** — `trio-sabores-cart` persistente.
11. **Product availability enum** — AVAILABLE/SOLD_OUT/PREORDER bem definido.
12. **Fulfilment types** — DELIVERY/PICKUP claros.
13. **Coupon code uppercasing** antes de lookup no banco.
14. **`verifyAdmin`/`verifyUser`** centrais em `lib/auth.ts` — reused em todas as rotas.
15. **`authCookieOptions`** com `httpOnly, secure (prod), sameSite: strict` — boas práticas.
16. **`checkAdminCredentials` usa bcrypt compare** — timing-safe.
17. **Prisma relations com `onDelete: SetNull` onde apropriado** (Address.userId).
18. **`DIR` de uploads organizado** com nome `Date.now()-` prefix para evitar overwrites.
19. **`app/api/health` tem try/catch** e retorna 503 em erro — bom tratamento.
20. **`app/api/cep` usa `next: { revalidate: 86400 }`** — cache 24h, reduz chamadas externas.
21. **`app/api/products`** apenas produtos disponíveis, sem auth pública — correto.
22. **Sitemap e robots.ts** bem formados, desprotege /admin e /api.
23. **`formatBRL` usa `pt-BR`** corretamente.
24. **`parseBRL` tenta normalizar formatos** com vírgula e ponto.
25. **`whatsappNumber` e `whatsappDisplayNumber`** de config env com fallback.
26. **`lib/money.ts`** exporta `formatBRL` e `parseBRL` — centralizado.
27. **`prisma/schema.prisma`** bem estruturado, enums claros, indexes implícitos via `@unique` (User.email, Category.name/slug, Coupon.code).

---

## RESUMO ACCIONÁVEL (próximos passos)

### Imediato (1-2 dias):
1. ✅ Confirmar build com Node 20 (já validado).
2. 🔧 Criar `.env.example` com todas as vars (`JWT_SECRET`, `ADMIN_INITIAL_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`).
3. 🔧 Adicionir headers de segurança no `next.config.ts` (CSP, HSTS, X-Frame-Options).
4. 🔧 Considerar rate-limiting em `/api/admin/login` e `/api/auth/register` (ou middleware).
5. 🔧 Definir `sslmode=verify-full` no `DATABASE_URL` para eliminar aviso do pg.

### Curto prazo (1 semana):
6. 🔧 Decidir sobre `onDelete` actions em relations Prisma (`Category.products`, `Product.categoryId`).
7. 🔧 Definir política para `rating`/`reviewsCount` — remover do schema ou implementar rota de reviews.
8. 🔧 Remover `image/svg+xml` do upload ou adicionar sanitização SVG.
9. 🔧 Verificar se `/uploads/` precisa de proteção de rota no Next (ou confiar em Vercel Blob).

### Médio prazo (2+ semanas):
10. 📦 Implementar `middleware.ts` para proteção de prefixos `/admin/` e `/api/admin/` (reduzir risco de rota esquecida).
11. 📦 Considerar `next/image` `domains` ou `remotePatterns` se houver imagens externas no futuro.
12. 📣 Documentar fluxo de bootstrap admin (seed) e exigir `ADMIN_INITIAL_PASSWORD` em todos os envs.

---
*Revisão baseada em leitura completa de todos os arquivos `.ts`, `.tsx`, `.prisma`, `next.config`, `package.json`, `prisma/schema.prisma`, e execução de `npm run build` com Node 20.19.5.*