# Banco de dados — Trio Sabores

## 1. Conexões

O projeto usa **duas** variáveis, porque runtime e Prisma CLI têm necessidades
diferentes:

| Variável | Usada por | Aponta para |
|---|---|---|
| `DATABASE_URL` | aplicação em runtime (`lib/db.ts`) | endpoint de **pooling** do provedor |
| `DIRECT_URL` | `prisma.config.ts` (migrate/seed/studio) | conexão **direta**, sem pooler |

Em desenvolvimento as duas podem ser iguais (Postgres do `docker-compose.yml`).

## 2. SSL

A recomendação é `sslmode=verify-full`, que valida **certificado e hostname**.
`require`, `prefer` e `verify-ca` são tratados como `verify-full` pelo driver
`pg` (o build emitia esse aviso).

```
postgresql://usuario:senha@host-pooler/db?sslmode=verify-full
```

Checklist antes de trocar para `verify-full` em produção:

1. confirmar que o provedor usa certificado público válido para o hostname
   (Neon, Supabase e RDS gerenciado normalmente usam);
2. se o provedor exigir CA própria, configure-a no cliente — **nunca**
   desative a verificação (`sslmode=no-verify` / `rejectUnauthorized: false`);
3. testar a conexão com o endpoint de pooling **e** com o direto.

> `sslmode=verify-full` foi documentado, mas **não** foi validado contra o
> provedor real neste hardening — a URL de produção não foi alterada.

## 3. Pool de conexões

- Em serverless cada instância abre seu próprio pool; use o endpoint *pooler*
  (`DATABASE_URL`) para evitar esgotar conexões.
- Mantenha `DIRECT_URL` para migrations: DDL não deve passar pelo pooler.
- O cliente Prisma é um singleton por processo (`lib/db.ts`), reutilizado entre
  requisições em desenvolvimento.

## 4. Migrations

O projeto passou a ter migrations versionadas:

```
prisma/migrations/
├── 0_init/migration.sql                            # schema anterior ao hardening
└── 20251116000000_hardening_constraints/migration.sql
```

### Banco novo

```bash
npx prisma migrate deploy
npm run db:seed
```

### Banco existente criado com `prisma db push`

O banco **não** tem histórico de migrations. Faça o baseline **uma vez**, sem
apagar dados:

```bash
# 1. Marca o schema atual como já aplicado
npx prisma migrate resolve --applied 0_init

# 2. Aplica apenas o hardening
npx prisma migrate deploy

# 3. Confere
npx prisma migrate status
```

> Nunca rode `prisma migrate dev` contra produção: ele pode propor reset.
> Use `migrate deploy`.

### O que a migration de hardening faz

- `Product.rating` passa a aceitar `NULL` e perde o default `5`;
- `UPDATE "Product" SET rating = NULL WHERE reviewsCount = 0` — remove a nota
  fictícia de 5 estrelas de quem não tem avaliação real (não toca em linhas com
  avaliações);
- cria a tabela `RateLimitBucket` (rate limiting compartilhado);
- cria índices em `Address.userId`, `Category(active, sortOrder)`,
  `Product.categoryId`, `Product(availability, featured, sortOrder)`,
  `DeliveryRule(enabled, minKm)`, `Coupon(active, code)`,
  `Order(createdAt)`, `Order(status, createdAt)`, `Order(userId, createdAt)`,
  `Order(customerEmail)`, `OrderItem.orderId`, `OrderItem.productId`.

Todas as operações são aditivas ou de anulação de coluna — **nenhuma linha é
apagada**.

## 5. Políticas de exclusão

| Relação | Comportamento | Motivo |
|---|---|---|
| `Product.category` | `Restrict` | excluir categoria não pode apagar produtos |
| `OrderItem.product` | `Restrict` | histórico do pedido nunca perde o produto |
| `OrderItem.order` | `Cascade` | itens não existem sem o pedido |
| `Order.user` | `SetNull` | cliente sai, pedido permanece |
| `Order.address` | `SetNull` | endereço removido, pedido permanece |
| `Address.user` | `SetNull` | endereço órfão é permitido |

Verificado em PostgreSQL real:

- excluir categoria **com** produtos → `ERROR: violates foreign key constraint`;
- excluir categoria **vazia** → sucesso;
- produto e `categoryId` permanecem íntegros após a tentativa bloqueada.

A API também devolve `409` antes de tentar excluir uma categoria com produtos,
mas a garantia final é do banco.

## 6. Integridade de avaliações

Não existe sistema de avaliações no projeto. Por isso:

- `rating` fica `NULL` e `reviewsCount` fica `0` por padrão;
- a interface só exibe estrelas quando `reviewsCount > 0` **e** `rating != null`;
- a página do produto mostra "Produto ainda sem avaliações" caso contrário.

Nenhuma avaliação fictícia é gerada. Se um sistema de reviews for adicionado,
recalcule `rating`/`reviewsCount` na mesma transação da criação da avaliação.
