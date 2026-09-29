# Deploy — Trio Sabores

## 1. PostgreSQL

Use PostgreSQL gerenciado, por exemplo Supabase, Neon ou Prisma Postgres. Crie `DATABASE_URL` com a conexão de produção.

## 2. Vercel

Importe o repositório no Vercel. O framework é detectado como Next.js. Configure:

- `DATABASE_URL`
- `JWT_SECRET` (at least 32 random bytes; the app fails authentication if it is missing or too short)
- `ADMIN_INITIAL_PASSWORD` (required only when creating the admin or migrating an old admin; 16–72 UTF-8 bytes in production)
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `BLOB_READ_WRITE_TOKEN` para upload de imagens
- `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY` quando a camada de pagamento real for ativada

Antes do primeiro acesso, aplique o schema:

```bash
npx prisma db push
npm run db:seed
```

For local development, set `ADMIN_INITIAL_PASSWORD=admin123` before the initial seed. The first admin login is restricted to password settings until the password is changed. In production, configure a unique secret for `ADMIN_INITIAL_PASSWORD`; the application does not embed a known bootstrap password. On existing installations, the first seed run after this update provisions the configured one-time password; later seed runs do not reset a changed password.

Customer accounts can be registered from `/conta`. Authenticated checkouts are associated with the account, and the account page shows its own saved delivery addresses and purchase history. Guest checkout remains available. Delivery orders require a complete address validated by the server. Because the distance is an estimate supplied during checkout, deliveries stay pending until an admin reviews the route in **Gerenciar pedidos** and confirms the corrected distance and fee.

Reapply `npx prisma db push` after schema updates to add the account-session fields without deleting existing orders or addresses.

## 3. Domínio

Adicione o domínio personalizado no projeto Vercel e atualize `NEXT_PUBLIC_APP_URL` para o domínio final.

## 4. Operação

Health check: `/api/health`.

Admin: `/admin/login`.

Change the initial admin password immediately on first login. Customer passwords are hashed and sessions are invalidated whenever the admin password changes. Do not reuse credentials across environments.

## 5. Imagens

O painel usa Vercel Blob. O endpoint limita uploads de servidor a 4,5 MB e aceita JPG, PNG, WebP e AVIF. Para arquivos maiores, use client uploads.

## 6. Pagamento

O checkout atual funciona em modo demonstrativo. A captura de cartão não é persistida. Para pagamentos reais, conecte tokenização/gateway antes de colocar a opção de cartão em produção.
