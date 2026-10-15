'use client';
import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';
import { whatsappDisplayNumber, whatsappLink } from '@/lib/whatsapp';

export default function Contato() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = `Olá! Mensagem enviada pelo site:\n\n*Nome:* ${form.name}\n*E-mail:* ${form.email}\n*Assunto:* ${form.subject}\n*Mensagem:* ${form.message}`;
    const url = whatsappLink(formatted);
    window.open(url, '_blank');
    setSent(true);
  };

  return (
    <main>
      <section className="bg-wine px-5 py-16 text-center text-cream">
        <div className="ornament">❧ ♥ ❧</div>
        <h1 className="mt-3 font-serif text-5xl">Fale conosco</h1>
        <p className="mt-3 text-cream/80">Estamos prontos para te atender.</p>
      </section>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2">
        <div>
          <div className="space-y-6">
            <div className="flex gap-3">
              <Phone className="text-gold" />
              <div>
                <b>WhatsApp</b>
                <a className="text-sm text-brown/70 underline" href={whatsappLink('Olá! Gostaria de falar com a Trio Sabores.')} target="_blank" rel="noreferrer">
                  {whatsappDisplayNumber}
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Mail className="text-gold" />
              <div>
                <b>E-mail</b>
                <p className="text-sm text-brown/70">contato@triosabores.com.br</p>
              </div>
            </div>
          </div>
        </div>
        {sent ? (
          <div className="form-card text-center py-8">
            <div className="text-gold text-3xl mb-2">✓</div>
            <h2 className="font-serif text-2xl text-wine">Mensagem direcionada!</h2>
            <p className="mt-2 text-sm text-brown/80">
              Sua mensagem foi formatada e aberta no WhatsApp da nossa equipe. Caso a janela não tenha aberto automaticamente, clique no botão abaixo:
            </p>
            <a
              className="btn-primary mt-4 inline-block"
              href={whatsappLink(`Olá! Mensagem enviada pelo site:\n\n*Nome:* ${form.name}\n*E-mail:* ${form.email}\n*Assunto:* ${form.subject}\n*Mensagem:* ${form.message}`)}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp
            </a>
            <button
              type="button"
              onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
              className="mt-3 block mx-auto text-xs text-wine underline"
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <form className="form-card space-y-4" onSubmit={handleSubmit}>
            <div className="field">
              <label>Nome completo</label>
              <input required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Assunto</label>
              <input required maxLength={120} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="field">
              <label>Mensagem</label>
              <textarea required rows={5} maxLength={1000} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary w-full">Enviar mensagem via WhatsApp</button>
          </form>
        )}
      </section>
    </main>
  );
}