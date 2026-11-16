# Deploy — Trio Sabores

## 1. PostgreSQL

Use PostgreSQL gerenciado (Neon, Supabase, Prisma Postgres). Configure **duas**
URLs:

- `DATABASE_URL` — endpoint de **pooling** (runtime). Ex.:
  `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=verify-full`
- `DIRECT_URL` — conexão **direta**, usada por migrations e seed.

Mantenha `sslmode=verify-full` (valida certificado + hostname). Detalhes em
[docs/DATABASE.md](docs/DATABASE.md).

## 2. Migrations

O schema é versionado em `prisma/migrations/`.

**Banco novo:**

```bash
npx prisma migrate deploy
npm run db:seed
```

**Banco que já existe** (criado antes com `db push`):

```bash
npx prisma migrate resolve --applied 0_init   # baseline, uma única vez
npx prisma migrate deploy                     # aplica o hardening
npx prisma migrate status                     # confirma
```

Nunca use `prisma migrate dev` contra produção. Nenhuma migration apaga linhas:
a única alteração de dados é anular `Product.rating` onde `reviewsCount = 0`.

## 3. Vercel

Importe o repositório (framework detectado: Next.js). Configure:

| Variável | Obrigatória | Notas |
|---|---|---|
| `DATABASE_URL` | sim | endpoint de pooling |
| `DIRECT_URL` | sim | usado pelo Prisma CLI |
| `JWT_SECRET` | sim | ≥ 32 bytes, único por ambiente |
| `ADMIN_INITIAL_PASSWORD` | ao criar/redefinir admin | ≥ 16 bytes em produção |
| `NEXT_PUBLIC_APP_URL` | sim | domínio final, com `https://` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | sim | dígitos com DDI |
| `BLOB_READ_WRITE_TOKEN` | sim | cria o Blob store no projeto Vercel |

`MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_PUBLIC_KEY`, `STORE_LATITUDE` e
`STORE_LONGITUDE` estão reservadas: o código atual **não** as lê.

`DEV_ALLOWED_ORIGINS` é só para desenvolvimento.

## 4. Upload de imagens

- Produção: **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`). Sem o token, o upload
  responde `503` com erro controlado — não há gravação em disco, porque o
  filesystem da Vercel é efêmero.
- Desenvolvimento: `public/uploads/` com nome aleatório.
- Formatos: JPEG, PNG, WebP, AVIF (SVG bloqueado). Limite de 10 MB.
- Para imagens maiores, use client uploads do Vercel Blob.

## 5. Operação

- **Liveness:** `GET /api/health` → `{"status":"ok"}` (não consulta banco).
- **Readiness:** `GET /api/admin/health` → requer sessão admin; devolve
  `{"status","database"}`.
- **Admin:** `/admin/login`.

### Primeiro acesso

O seed cria `admin@triosabores.local` com `mustChangePassword = true`. O painel
fica bloqueado até a troca da senha em **Configurações**. A senha inicial vem de
`ADMIN_INITIAL_PASSWORD` e nunca é registrada em log.

Em instalações que já têm admin, o seed só provisiona a senha se a conta ainda
estiver no estado inicial (`sessionVersion = 0` e sem `mustChangePassword`), e
não reseta uma senha já alterada.

## 6. Segurança esperada em produção

- HTTPS obrigatório (HSTS de 1 ano é enviado automaticamente).
- Cookies `Secure`, `HttpOnly` e `SameSite=Strict`.
- Rate limiting usa PostgreSQL compartilhado; se o tráfego crescer, migre para
  Redis/Upstash mantendo a interface de `lib/rate-limit.ts`.
- Não habilite `includeSubDomains`/`preload` no HSTS sem confirmar HTTPS em
  todos os subdomínios.

## 7. Pagamento

O checkout funciona em modo demonstrativo: nenhum dado de cartão é capturado ou
persistido, e o código PIX é ilustrativo. Para pagamentos reais, integre a
tokenização do gateway antes de habilitar a opção de cartão em produção.
