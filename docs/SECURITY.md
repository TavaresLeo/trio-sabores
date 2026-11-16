# Segurança — Trio Sabores

Documento das decisões de segurança aplicadas no hardening. Complementa
`CODE_REVIEW_CORRECTION_REPORT.md`.

## 1. Cabeçalhos HTTP (`next.config.ts`)

Aplicados a todas as rotas via `headers()`:

| Header | Valor | Objetivo |
|---|---|---|
| `Content-Security-Policy` | ver abaixo | limita origens de script/estilo/imagem |
| `X-Frame-Options` | `DENY` | bloqueia clickjacking (redundante com `frame-ancestors`) |
| `X-Content-Type-Options` | `nosniff` | impede MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | não vaza caminho completo para terceiros |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | desliga APIs não usadas |
| `Cross-Origin-Opener-Policy` | `same-origin` | isola contexto de navegação |
| `Strict-Transport-Security` | `max-age=31536000` (só produção) | força HTTPS |

### CSP e o trade-off do `'unsafe-inline'`

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
manifest-src 'self'; upgrade-insecure-requests
```

- **Por que não usar nonce:** no Next.js 16 uma CSP com nonce exige que *toda*
  página seja renderizada dinamicamente. Isso eliminaria o ISR da home e das
  páginas públicas implementado neste hardening.
- **Consequência:** `script-src` aceita inline. A defesa principal contra XSS
  continua sendo não renderizar HTML de usuário (descrição de produto é texto
  puro) e validar `imageUrl` (`isSafeImageUrl`) para bloquear `javascript:`.
- `img-src https:` é amplo para não quebrar imagens servidas pelo Vercel Blob.
  Restrinja a `https://*.public.blob.vercel-storage.com` se nenhum produto usar
  imagem externa.
- `'unsafe-eval'` é adicionado **apenas** em desenvolvimento (React dev).
- **Como migrar para nonce:** criar `proxy.ts` gerando nonce por requisição e
  aceitar renderização dinâmica total. Só faça isso se o cache deixar de ser
  prioridade.

### HSTS

`includeSubDomains` e `preload` **não** estão habilitados. Só habilite após
confirmar que todos os subdomínios (`www`, `api`, e-mails, etc.) servem HTTPS —
caso contrário você torna subdomínios inacessíveis por um ano.

## 2. Rate limiting

Implementado em `lib/rate-limit.ts` (armazenamento) e `lib/rate-limit-core.ts`
(regra pura, testada em `tests/rate-limit.test.ts`).

- **Armazenamento:** PostgreSQL (tabela `RateLimitBucket`), com
  `SELECT ... FOR UPDATE` dentro de transação. É compartilhado entre instâncias
  serverless — **nada de memória de processo**, que não funcionaria na Vercel.
- **Fail-closed:** se o armazenamento falhar, a rota responde **503**; não há
  degradação silenciosa para "sem limite".
- **Chaves opacas:** IP e e-mail passam por SHA-256 antes de virar chave, então
  a tabela não guarda dado pessoal em texto puro.

| Operação | Janela | Tentativas | Bloqueio base |
|---|---|---|---|
| Login admin | 15 min | 5 | 15 min |
| Login cliente | 15 min | 10 | 15 min |
| Cadastro | 60 min | 5 | 60 min |
| Troca de senha admin | 15 min | 10 | 15 min |
| Criação de pedido | 10 min | 10 | 10 min |
| Consulta de CEP | 1 min | 30 | 1 min |
| Upload de imagem | 10 min | 40 | 10 min |

- **Progressivo:** cada novo bloqueio dobra a espera até o teto de 4x
  (coluna `violations` preserva o histórico).
- **Duas dimensões no login:** por IP **e** por conta. O limite por conta é
  verificado depois do IP e a mensagem é sempre a mesma, então não é possível
  descobrir se a conta existe.
- **Só falhas contam** no login: uma autenticação bem-sucedida reseta o
  contador da conta.
- **Escala:** cada requisição sensível gera uma escrita. Para tráfego alto,
  troque o backend por Redis/Upstash mantendo a mesma interface
  (`getRateLimitStatus`, `registerRateLimitAttempt`, `resetRateLimit`).

## 3. Autenticação e sessão

- JWT HS256 em cookie `HttpOnly`, `SameSite=Strict`, `Secure` em produção.
- `JWT_SECRET` precisa ter ≥ 32 bytes; a aplicação falha explicitamente se não
  tiver.
- `sessionVersion` no banco invalida todos os tokens ao trocar a senha.
- `mustChangePassword` bloqueia o painel até a troca da senha inicial.
- Comparação de senha via `bcrypt` (12 rounds), com limite de 72 bytes.
- Mensagens de login são genéricas para ambos os fluxos.

## 4. Proteção das rotas administrativas

Camadas independentes:

1. **`proxy.ts`** (convenção do Next 16; `middleware.ts` está depreciado):
   intercepta `/admin/:path*` e `/api/admin/:path*`, valida a assinatura do JWT
   e o papel `ADMIN`. Sem sessão válida: `302` para `/admin/login` (páginas) ou
   `401` JSON (API).
2. **Página/layout admin:** `verifyAdmin()` continua em cada página.
3. **Rota de API:** `verifyAdmin()` em cada handler de `/api/admin/*` — a
   autorização real (incluindo `sessionVersion` e `mustChangePassword`) é
   sempre no servidor.

O proxy não consulta o banco (só verifica criptografia), por isso ele é apenas
uma barreira de navegação; a checagem definitiva está nas camadas 2 e 3.

## 5. Upload de imagens

`app/api/admin/upload/route.ts` + `lib/upload.ts`:

- Formatos: **JPEG, PNG, WebP, AVIF**. **SVG removido** (executa script).
- Validação em três níveis: MIME declarado, extensão do nome e **magic bytes**.
  Divergência entre eles = `415`.
- Limite de 10 MB.
- Nome gerado com `crypto.randomUUID()`; o nome enviado pelo cliente é
  descartado (sem path traversal, sem sobrescrita — gravação local usa
  `flag: 'wx'`).
- **Produção:** exige `BLOB_READ_WRITE_TOKEN`. Se o Blob falhar ou o token
  faltar, responde `503`; **não** cai para `public/uploads/` (disco efêmero na
  Vercel).
- **Desenvolvimento:** grava em `public/uploads/` com nome aleatório.
- Requer sessão administrativa e origem same-origin.

## 6. Erros, logs e exposição de informação

- `lib/http.ts` centraliza respostas de erro e logging.
- Respostas públicas nunca incluem stack, SQL, mensagens do Prisma ou caminhos.
- Logs internos são JSON com `context`, `requestId` e mensagem; stack só fora de
  produção. Não são logados corpos de requisição, senhas ou tokens.
- `x-request-id` é devolvido em respostas de erro para correlação com o log.

## 7. CORS e CSRF

- **Não há CORS configurado**, e isso é intencional: o site é consumido apenas
  na mesma origem. Se surgir um consumidor externo, defina uma lista explícita
  de origens (nunca `*` com credenciais).
- Operações que alteram estado (`/api/orders`, logins, cadastro, upload)
  rejeitam `Origin` diferente do host (`403`). Cookies são `SameSite=Strict`.

## 8. Health checks

- `GET /api/health` — liveness público. Responde apenas `{"status":"ok"}`.
  Não consulta banco, não devolve timestamp, não revela infraestrutura.
- `GET /api/admin/health` — readiness protegido por sessão admin; verifica o
  banco e devolve apenas `{"status","database"}`, sem detalhes do erro.

## 9. Segredos

- `.env` nunca é versionado; `.env.example` traz placeholders vazios.
- `ADMIN_INITIAL_PASSWORD` não tem valor padrão: sem ele o seed **falha** com
  mensagem clara, em vez de criar admin com senha vazia.
- Nenhuma credencial é embutida no código ou em assets do cliente.
