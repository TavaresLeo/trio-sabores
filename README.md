# Trio Sabores — Loja Online

Aplicação full-stack (Next.js 16 + React 19 + TypeScript + PostgreSQL + Prisma 7)
para a loja Trio Sabores.

## Requisitos

- **Node.js ≥ 20.9** (validado com 20.19.5). Node 18 **não** funciona: o
  `prisma generate` e o `next build` falham.
- PostgreSQL 17 (o `docker-compose.yml` sobe um local).

## Assets reais integrados

Os assets fornecidos pelo cliente ficam em `public/images/`:

- `banner-horizontal.jpeg` — hero desktop
- `banner-vertical.jpeg` — hero mobile e banner promocional
- `logomarca.jpeg` — logo do header/footer
- `bolo-de-fuba-com-laranja.jpeg`
- `bolo-de-laranja-caseiro.jpeg`
- `bolo-de-laranja-com-chocolate.jpeg`
- `pudim-de-milho.jpeg`
- `pudim-leite-condensado.jpeg`

## Desenvolvimento

```bash
cp .env.example .env          # preencha JWT_SECRET e ADMIN_INITIAL_PASSWORD
npm install
docker compose up -d
npx prisma migrate deploy     # schema versionado
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`. O painel fica em `/admin/login`.

`JWT_SECRET` precisa de pelo menos 32 bytes. Gere um valor:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Variáveis

Todas estão documentadas em `.env.example`. Resumo:

| Variável | Obrigatória | Observação |
|---|---|---|
| `DATABASE_URL` | sim | runtime; use o pooler em produção |
| `DIRECT_URL` | sim (CLI) | migrations/seed, conexão direta |
| `JWT_SECRET` | sim | ≥ 32 bytes |
| `ADMIN_INITIAL_PASSWORD` | ao criar admin | ≥ 8 bytes (dev) / 16 (produção) |
| `NEXT_PUBLIC_APP_URL` | sim | URL pública da loja |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | sim | somente dígitos, com DDI |
| `BLOB_READ_WRITE_TOKEN` | em produção | sem ele o upload responde 503 |
| `DEV_ALLOWED_ORIGINS` | não | hosts **exatos** para acesso na rede local |

## Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # prisma generate + next build
npm start           # servidor de produção
npm run lint        # ESLint
npm run typecheck   # TypeScript
npm test            # testes unitários (node:test + tsx)
npm run db:migrate  # cria migration (desenvolvimento)
npm run db:seed     # popula catálogo e admin inicial
```

## Documentação

- [`docs/SECURITY.md`](docs/SECURITY.md) — headers, rate limiting, upload, auth.
- [`docs/DATABASE.md`](docs/DATABASE.md) — conexões, SSL, migrations, exclusões.
- [`docs/PRICE_FORMAT.md`](docs/PRICE_FORMAT.md) — formatos monetários aceitos.
- [`DEPLOY.md`](DEPLOY.md) — deploy na Vercel e bootstrap do banco.
- [`CODE_REVIEW_CORRECTION_REPORT.md`](CODE_REVIEW_CORRECTION_REPORT.md) — auditoria e correções.

## Observação de fidelidade

O preview visual serve como referência de layout, espaçamento e composição. As
imagens oficiais enviadas para o projeto são usadas diretamente no site para
preservar cor, enquadramento e identidade da marca.
