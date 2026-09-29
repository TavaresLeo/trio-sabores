import { CardapioClient } from './cardapio-client';

export default async function Cardapio({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria = '' } = await searchParams;
  return <CardapioClient initialCategory={categoria} />;
}
