'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useCart } from '@/components/shop-state';
import { formatBRL } from '@/lib/money';
import { productImageFor } from '@/lib/product-image';

const steps = ['Identificação', 'Endereço', 'Pagamento', 'Revisão'];
const requiredAddressFields = ['cep', 'street', 'number', 'neighborhood', 'city', 'state'] as const;

export default function Checkout() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<'PIX' | 'CARD' | 'CASH_ON_DELIVERY'>('PIX');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', cep: '', street: '', number: '',
    complement: '', neighborhood: '', city: '', state: '', distanceKm: '3',
    notes: '', cashChange: '',
  });

  useEffect(() => {
    let active = true;
    fetch('/api/account', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error('Não foi possível carregar seus dados salvos.');
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        const savedAddress = data.addresses?.[0];
        setForm((current) => ({
          ...current,
          name: data.user.name || current.name,
          email: data.user.email || current.email,
          phone: data.user.phone || current.phone,
          cep: savedAddress?.cep || current.cep,
          street: savedAddress?.street || current.street,
          number: savedAddress?.number || current.number,
          complement: savedAddress?.complement || current.complement,
          neighborhood: savedAddress?.neighborhood || current.neighborhood,
          city: savedAddress?.city || current.city,
          state: savedAddress?.state || current.state,
        }));
      })
      .catch(() => {
        if (active) setError('Não foi possível carregar seus dados salvos.');
      });
    return () => { active = false; };
  }, []);

  if (items.length === 0) {
    return <main className="checkout-empty"><div className="form-card"><h1>Seu carrinho está vazio.</h1><Link href="/cardapio" className="btn-primary">Voltar ao cardápio</Link></div></main>;
  }

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const continueToAddress = () => {
    const phoneDigits = form.phone.replace(/\D/g, '').length;
    if (!form.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || phoneDigits < 10 || phoneDigits > 15) {
      setError('Preencha nome, telefone e e-mail válidos para continuar.');
      return;
    }
    setError('');
    setStep(2);
  };
  const continueToPayment = () => {
    const missingAddressField = requiredAddressFields.some((key) => !form[key].trim());
    const distance = Number(form.distanceKm);
    if (missingAddressField || !Number.isFinite(distance) || distance < 0 || distance > 12) {
      setError('Preencha o endereço completo e uma distância estimada de até 12 km.');
      return;
    }
    setError('');
    setStep(3);
  };
  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          fulfillmentType: 'DELIVERY',
          address: {
            cep: form.cep, street: form.street, number: form.number, complement: form.complement,
            neighborhood: form.neighborhood, city: form.city, state: form.state,
          },
          distanceKm: Number(form.distanceKm),
          paymentMethod: method,
          cashChangeForCents: form.cashChange ? Number(form.cashChange.replace(/\D/g, '')) : undefined,
          notes: form.notes,
          items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Não foi possível finalizar o pedido.');
        return;
      }
      clear();
      const review = data.order.status === 'PENDING' ? '&revisao=entrega' : '';
      router.push(`/pedidos?numero=${encodeURIComponent(data.order.publicNumber)}${review}`);
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="checkout-page">
      <div className="checkout-heading">
        <h1>Finalizar Pedido</h1>
        <div className="checkout-steps">
          {steps.map((label, index) => {
            const number = index + 1;
            return (
              <div key={label} className={`checkout-step ${step >= number ? 'current' : ''} ${step > number ? 'complete' : ''}`}>
                <span className="checkout-step-number">{step > number ? <Check size={14} /> : number}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <section className="checkout-layout">
        <div className="checkout-form-card">
          {step === 1 && <>
            <h2>Dados do Cliente</h2>
            <p className="checkout-helper">Preencha seus dados para receber atualizações sobre o pedido.</p>
            <div className="checkout-fields">
              <Field label="Nome completo" value={form.name} onChange={(value) => update('name', value)} required />
              <Field label="Telefone / WhatsApp" value={form.phone} onChange={(value) => update('phone', value)} required />
              <Field label="E-mail" type="email" value={form.email} onChange={(value) => update('email', value)} required />
            </div>
            <p className="checkout-helper">Já tem cadastro? <Link className="text-wine underline" href="/conta">Entre na sua conta</Link> para preencher seus dados salvos.</p>
            {error && <p role="alert" className="checkout-error">{error}</p>}
            <button className="btn-primary checkout-continue" onClick={continueToAddress}>Continuar para o endereço</button>
          </>}
          {step === 2 && <>
            <h2>Endereço de Entrega</h2>
            <p className="checkout-helper">Informe onde deseja receber seu pedido.</p>
            <div className="checkout-fields">
              <Field label="CEP" value={form.cep} onChange={(value) => update('cep', value)} required />
              <Field label="Rua" value={form.street} onChange={(value) => update('street', value)} required />
              <Field label="Número" value={form.number} onChange={(value) => update('number', value)} required />
              <Field label="Complemento" value={form.complement} onChange={(value) => update('complement', value)} />
              <Field label="Bairro" value={form.neighborhood} onChange={(value) => update('neighborhood', value)} required />
              <Field label="Cidade" value={form.city} onChange={(value) => update('city', value)} required />
              <Field label="Estado" value={form.state} onChange={(value) => update('state', value)} required />
              <Field label="Distância estimada (km)" value={form.distanceKm} onChange={(value) => update('distanceKm', value)} required />
            </div>
            <p className="checkout-helper">A taxa é uma estimativa e será conferida pela equipe antes da confirmação do pedido.</p>
            {error && <p role="alert" className="checkout-error">{error}</p>}
            <div className="checkout-actions"><button className="btn-secondary" onClick={() => setStep(1)}>Voltar</button><button className="btn-primary" onClick={continueToPayment}>Continuar para pagamento</button></div>
          </>}
          {step === 3 && <>
            <h2>Forma de Pagamento</h2>
            <p className="checkout-helper">Selecione como deseja pagar o pedido.</p>
            <div className="payment-options">
              {([['PIX', 'PIX', 'Pague pelo app do seu banco'], ['CARD', 'Cartão', 'Combine o pagamento na entrega'], ['CASH_ON_DELIVERY', 'Dinheiro', 'Pague em dinheiro ao receber']] as const).map(([value, label, description]) => (
                <button key={value} type="button" className={`payment-option ${method === value ? 'selected' : ''}`} onClick={() => setMethod(value)}>
                  <span className="payment-radio">{method === value && <span />}</span>
                  <span><b>{label}</b><small>{description}</small></span>
                </button>
              ))}
            </div>
            {method === 'CASH_ON_DELIVERY' && <div className="field checkout-change-field"><label>Precisa de troco para quanto?</label><input value={form.cashChange} onChange={(event) => update('cashChange', event.target.value)} placeholder="R$ 100,00" /></div>}
            <div className="field checkout-notes"><label>Observações do pedido</label><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} maxLength={500} /></div>
            <div className="checkout-actions"><button className="btn-secondary" onClick={() => setStep(2)}>Voltar</button><button className="btn-primary" onClick={() => setStep(4)}>Revisar pedido</button></div>
          </>}
          {step === 4 && <>
            <h2>Revise seu Pedido</h2>
            <p className="checkout-helper">Confira os dados antes de confirmar.</p>
            <div className="checkout-review">
              <b>{form.name}</b><span>{form.phone} · {form.email}</span>
              <span>{form.street}, {form.number} · {form.neighborhood}</span>
              <span>{form.city}/{form.state} · {form.cep}</span>
              <span>Pagamento: {method === 'CASH_ON_DELIVERY' ? 'Dinheiro' : method}</span>
            </div>
            {error && <p role="alert" className="checkout-error">{error}</p>}
            <div className="checkout-actions"><button className="btn-secondary" onClick={() => setStep(3)}>Voltar</button><button disabled={loading} className="btn-primary" onClick={submit}>{loading ? 'Finalizando...' : 'Finalizar Pedido'}</button></div>
          </>}
        </div>
        <aside className="checkout-summary">
          <h2>Resumo do Pedido</h2>
          {items.map((item) => (
            <div className="checkout-summary-item" key={item.id}>
              <img src={productImageFor(item)} alt="" />
              <div><b>{item.name}</b><span>{item.quantity} × {formatBRL(item.priceCents)}</span></div>
              <strong>{formatBRL(item.quantity * item.priceCents)}</strong>
            </div>
          ))}
          <div className="checkout-summary-line"><span>Subtotal</span><b>{formatBRL(subtotal())}</b></div>
          <div className="checkout-summary-line"><span>Entrega</span><span>A calcular</span></div>
          <div className="checkout-summary-total"><span>Total</span><b>{formatBRL(subtotal())}</b></div>
          <p>🔒 Seus dados são protegidos e usados apenas para o pedido.</p>
        </aside>
      </section>
    </main>
  );
}

function Field({
  label, value, onChange, required = false, type = 'text',
}: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string;
}) {
  return <div className="field"><label>{label}{required && <span className="required-mark"> *</span>}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} /></div>;
}
