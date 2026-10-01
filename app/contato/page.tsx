'use client';
import { useState } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

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
            <div className="flex gap-3">
              <MapPin className="text-gold" />
              <div>
                <b>Endereço</b>
                <p className="text-sm text-brown/70">Rua Mangueiral, n° 2A — Campo Grande<br />Rio de Janeiro — RJ</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Clock className="text-gold" />
              <div>
                <b>Horário</b>
                <p className="text-sm text-brown/70">Seg a Sáb: 08h às 20h<br />Dom: 08h às 14h</p>
              </div>
            </div>
          </div>
          <div className="mt-8 h-64 rounded-2xl border border-[#d7c9b6] bg-beige p-3 text-center overflow-hidden relative">
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=-43.5568,-22.9210,-43.5529,-22.9175&layer=mapnik&marker=-22.9195439,-43.5548695"
              width="100%" height="100%" style={{ border: 'none', borderRadius: '12px' }}
              allowFullScreen loading="lazy"
              title="Mapa da loja — Trio Sabores"
            />
            <div className="absolute bottom-3 left-3 right-3 text-center">
              <p className="text-xs text-brown/80 font-serif">Rua Mangueiral, n° 2A — Campo Grande · CEP 23042-330 · Rio de Janeiro — RJ</p>
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
