import Link from 'next/link';
import { Check, Circle } from 'lucide-react';

export default async function Pedidos({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string; revisao?: string }>;
}) {
  const { numero, revisao } = await searchParams;
  const awaitingDeliveryReview = revisao === 'entrega';

  return (
    <main className="order-success-page">
      <div className="order-success-card">
        <div className="order-success-mark">{awaitingDeliveryReview ? <Circle size={28} /> : <Check size={28} strokeWidth={3} />}</div>
        <h1>{awaitingDeliveryReview ? 'Pedido recebido para conferência' : 'Pedido realizado com sucesso!'}</h1>
        <p className="order-success-copy">{awaitingDeliveryReview ? 'Nossa equipe vai conferir o endereço e a taxa de entrega antes de confirmar o pedido.' : 'Seu pedido foi recebido e está sendo preparado com muito carinho.'}</p>
        <div className="order-number-panel"><span>Número do pedido</span><b>{numero || '#TS-DEMO'}</b></div>
        <div className="order-tracking">
          <div className="tracking-step active"><span>{awaitingDeliveryReview ? <Circle size={15} /> : <Check size={15} />}</span><div><b>Pedido recebido</b><small>{awaitingDeliveryReview ? 'Aguardando conferência da entrega' : 'Seu pedido foi confirmado'}</small></div></div>
          <div className="tracking-step"><span><Circle size={15} /></span><div><b>Em preparação</b><small>Estamos preparando seu pedido</small></div></div>
          <div className="tracking-step"><span><Circle size={15} /></span><div><b>Saiu para entrega</b><small>Seu pedido está a caminho</small></div></div>
          <div className="tracking-step"><span><Circle size={15} /></span><div><b>Entregue</b><small>Bom apetite!</small></div></div>
        </div>
        <a className="btn-primary order-whatsapp" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5521999999999'}?text=${encodeURIComponent(`Olá! Gostaria de acompanhar meu pedido ${numero || ''}.`)}`}>
          Acompanhar pedido pelo WhatsApp
        </a>
        <Link className="order-back-link" href="/">Voltar para a loja</Link>
        <p className="order-thanks">Obrigado por escolher a Trio Sabores!<br />Sabores que acolhem. Momentos que ficam.</p>
      </div>
    </main>
  );
}
