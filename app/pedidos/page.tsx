import Link from 'next/link';
import { Check, Circle } from 'lucide-react';
import { whatsappLink } from '@/lib/whatsapp';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';
import { PixCopyBox } from '@/components/pix-copy-box';

export default async function Pedidos({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string; revisao?: string; pix?: string }>;
}) {
  const { numero, revisao, pix } = await searchParams;
  const awaitingDeliveryReview = revisao === 'entrega';

  const order = numero
    ? await db.order.findUnique({
        where: { publicNumber: numero },
        include: { items: true, address: true },
      })
    : null;

  const currentStatus = order?.status || (awaitingDeliveryReview ? 'PENDING' : 'CONFIRMED');
  const stepIndex =
    currentStatus === 'DELIVERED'
      ? 3
      : currentStatus === 'OUT_FOR_DELIVERY'
        ? 2
        : currentStatus === 'PREPARING'
          ? 1
          : 0;

  const pixCode =
    pix ||
    (order?.paymentMethod === 'PIX'
      ? `00020126580014BR.GOV.BCB.PIX0136trio-sabores-demo-${order.id}520400005303986540${(order.totalCents / 100).toFixed(2)}`
      : null);

  return (
    <main className="order-success-page">
      <div className="order-success-card">
        <div className="order-success-mark">
          {awaitingDeliveryReview ? <Circle size={28} /> : <Check size={28} strokeWidth={3} />}
        </div>
        <h1>
          {awaitingDeliveryReview ? 'Pedido recebido para conferência' : 'Pedido realizado com sucesso!'}
        </h1>
        <p className="order-success-copy">
          {awaitingDeliveryReview
            ? 'Nossa equipe vai conferir o endereço e a taxa de entrega antes de confirmar o pedido.'
            : 'Seu pedido foi recebido e está sendo preparado com muito carinho.'}
        </p>

        <div className="order-number-panel">
          <span>Número do pedido</span>
          <b>{numero || order?.publicNumber || '#TS-DEMO'}</b>
        </div>

        {order && (
          <div className="my-4 rounded-xl border border-[#eadfce] bg-[#faf6ef] p-4 text-left text-sm">
            <b className="text-wine">Resumo do pedido:</b>
            <div className="mt-2 space-y-1 text-brown/80">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.productName}
                  </span>
                  <b>{formatBRL(item.subtotalCents)}</b>
                </div>
              ))}
              {order.deliveryFeeCents > 0 && (
                <div className="flex justify-between text-xs text-brown/70">
                  <span>Taxa de entrega</span>
                  <span>{formatBRL(order.deliveryFeeCents)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-[#eadfce] pt-2 font-bold text-wine">
                <span>Total</span>
                <span>{formatBRL(order.totalCents)}</span>
              </div>
            </div>
          </div>
        )}

        {(order?.paymentMethod === 'PIX' || pixCode) && (
          <div className="my-4 text-left">
            <div className="rounded-xl border border-gold/40 bg-[#fffdf9] p-4 text-sm">
              <b className="text-wine">Pagamento via PIX:</b>
              <p className="mt-1 text-xs text-brown/80">
                Chave PIX (WhatsApp): <strong>(21) 99440-3746</strong> (21994403746)
              </p>
              {pixCode && <PixCopyBox pixCode={pixCode} />}
            </div>
          </div>
        )}

        <div className="order-tracking">
          <div className={`tracking-step ${stepIndex >= 0 ? 'active' : ''}`}>
            <span>
              {stepIndex > 0 ? <Check size={15} /> : <Circle size={15} />}
            </span>
            <div>
              <b>Pedido recebido</b>
              <small>
                {awaitingDeliveryReview
                  ? 'Aguardando conferência da entrega'
                  : 'Seu pedido foi registrado'}
              </small>
            </div>
          </div>
          <div className={`tracking-step ${stepIndex >= 1 ? 'active' : ''}`}>
            <span>{stepIndex > 1 ? <Check size={15} /> : <Circle size={15} />}</span>
            <div>
              <b>Em preparação</b>
              <small>Estamos preparando seu pedido</small>
            </div>
          </div>
          <div className={`tracking-step ${stepIndex >= 2 ? 'active' : ''}`}>
            <span>{stepIndex > 2 ? <Check size={15} /> : <Circle size={15} />}</span>
            <div>
              <b>Saiu para entrega</b>
              <small>Seu pedido está a caminho</small>
            </div>
          </div>
          <div className={`tracking-step ${stepIndex >= 3 ? 'active' : ''}`}>
            <span><Circle size={15} /></span>
            <div>
              <b>Entregue</b>
              <small>Bom apetite!</small>
            </div>
          </div>
        </div>

        <a
          className="btn-primary order-whatsapp"
          href={whatsappLink(`Olá! Gostaria de acompanhar meu pedido ${numero || order?.publicNumber || ''}.`)}
          target="_blank"
          rel="noreferrer"
        >
          Acompanhar pedido pelo WhatsApp
        </a>
        <Link className="order-back-link" href="/">
          Voltar para a loja
        </Link>
        <p className="order-thanks">
          Obrigado por escolher a Trio Sabores!
          <br />
          Sabores que acolhem. Momentos que ficam.
        </p>
      </div>
    </main>
  );
}
