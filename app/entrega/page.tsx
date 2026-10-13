'use client';
import { MapPin, Phone, Clock } from 'lucide-react';
import { whatsappDisplayNumber, whatsappLink } from '@/lib/whatsapp';

export default function Entrega() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-16">
      <h1 className="font-serif text-5xl text-wine text-center">Nossa Entrega</h1>
      <div className="mt-12 space-y-8 text-lg text-brown/80 leading-relaxed">
        <p>A Trio Sabores realiza entregas com todo o cuidado para que seu pedido chegue perfeito.</p>
        <p>Atendemos à região de Campo Grande e arredores. Consulte nossa equipe para confirmar o atendimento no seu endereço.</p>
        <p>As entregas são calculadas com base na distância e realizadas com rapidez.</p>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-2">
        <div>
          <div className="space-y-6">
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
            <div className="flex gap-3">
              <Phone className="text-gold" />
              <div>
                <b>WhatsApp</b>
                <a className="text-sm text-brown/70 underline" href={whatsappLink('Olá! Gostaria de consultar sobre uma entrega.')} target="_blank" rel="noreferrer">
                  {whatsappDisplayNumber}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="h-64 rounded-2xl border border-[#d7c9b6] bg-beige p-3 text-center overflow-hidden relative">
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
      </section>
    </main>
  );
}