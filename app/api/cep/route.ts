import { NextResponse } from 'next/server';
import { clientIp, logServerError, newRequestId, rateLimitUnavailable, rateLimited, serverError } from '@/lib/http';
import { RATE_LIMITS, RateLimitUnavailableError, rateLimitKey, registerRateLimitAttempt } from '@/lib/rate-limit';

const VIACEP_TIMEOUT_MS = 5000;

type ViaCepResponse = {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export async function GET(req: Request) {
  const requestId = newRequestId();

  try {
    const limit = await registerRateLimitAttempt(rateLimitKey('cep:ip', clientIp(req)), RATE_LIMITS.cep);
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds, requestId);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, 'cep_rate_limit', error);
  }

  const cep = new URL(req.url).searchParams.get('cep')?.replace(/\D/g, '');
  if (!cep || cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido.' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VIACEP_TIMEOUT_MS);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.' },
        { status: 502 },
      );
    }

    let data: ViaCepResponse;
    try {
      data = (await response.json()) as ViaCepResponse;
    } catch {
      return NextResponse.json(
        { error: 'Resposta inválida do serviço de CEP. Preencha o endereço manualmente.' },
        { status: 502 },
      );
    }

    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      street: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'A consulta de CEP demorou demais. Preencha o endereço manualmente.' },
        { status: 504 },
      );
    }
    logServerError('cep_lookup', error, requestId);
    return NextResponse.json(
      { error: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.' },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
