# Trio Sabores — Loja Online

Aplicação full-stack para a loja Trio Sabores, com foco em uma experiência visual fiel aos materiais oficiais enviados pela marca.

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

Os produtos cadastrados no seed foram atualizados para apontar para essas imagens em vez dos placeholders.

## Desenvolvimento

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Abra `http://localhost:3000`.

## Observação de fidelidade

O preview visual serve como referência de layout, espaçamento e composição. As imagens oficiais enviadas para o projeto são usadas diretamente no site para preservar cor, enquadramento e identidade da marca.
