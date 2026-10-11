'use client';
import { useState } from 'react';
import { Phone, Mail } from 'lucide-react';

export default function Contato() {
  const [sent, setSent] = useState(false);
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
                <p className="text-sm text-brown/70">(21) 99515-1997</p>
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
        <form className="form-card space-y-4" onSubmit={e => { e.preventDefault(); setSent(true); }}>
          <div className="field"><label>Nome completo</label><input required maxLength={100} /></div>
          <div className="field"><label>E-mail</label><input required type="email" /></div>
          <div className="field"><label>Assunto</label><input required maxLength={120} /></div>
          <div className="field"><label>Mensagem</label><textarea required rows={7} maxLength={1000} /></div>
          <button className="btn-primary w-full">{sent ? 'Mensagem enviada ✓' : 'Enviar mensagem'}</button>
        </form>
      </section>
    </main>
  );
}