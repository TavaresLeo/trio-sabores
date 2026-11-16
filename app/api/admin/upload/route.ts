import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyAdmin } from '@/lib/auth';
import {
  NO_STORE,
  clientIp,
  crossOriginRejected,
  isSameOrigin,
  jsonError,
  logSecurityEvent,
  newRequestId,
  rateLimitUnavailable,
  rateLimited,
  serverError,
} from '@/lib/http';
import { RATE_LIMITS, RateLimitUnavailableError, rateLimitKey, registerRateLimitAttempt } from '@/lib/rate-limit';
import { MAX_UPLOAD_BYTES, isDeclaredTypeCompatible, sniffImageType } from '@/lib/upload';
import { cleanupRateLimitBuckets } from '@/lib/rate-limit';

// Runtime Node.js é necessário para escrita em disco no desenvolvimento local
// e para o `Buffer` usado na validação por magic bytes. Em produção o destino
// é sempre o Vercel Blob (sem fallback para o disco efêmero).
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(req: Request) {
  const requestId = newRequestId();

  if (!isSameOrigin(req)) return crossOriginRejected(requestId);
  if (!(await verifyAdmin())) return jsonError('Não autorizado.', 401);

  try {
    const limit = await registerRateLimitAttempt(
      rateLimitKey('upload', clientIp(req)),
      RATE_LIMITS.upload,
    );
    void cleanupRateLimitBuckets();
    if (!limit.allowed) return rateLimited(limit.retryAfterSeconds, requestId);
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return rateLimitUnavailable(requestId);
    return serverError(requestId, 'admin_upload_rate_limit', error);
  }

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError('Formulário inválido.', 400);

  const file = form.get('file');
  if (!(file instanceof File)) return jsonError('Arquivo ausente.', 400);

  if (file.size === 0) return jsonError('O arquivo está vazio.', 400);
  if (file.size > MAX_UPLOAD_BYTES) return jsonError('A imagem deve ter até 10 MB.', 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = sniffImageType(bytes);

  if (!detected) {
    logSecurityEvent('upload_rejected_unknown_type', { requestId, size: file.size });
    return jsonError(
      'Formato não permitido. Envie uma imagem JPEG, PNG, WebP ou AVIF válida.',
      415,
    );
  }

  const compatibility = isDeclaredTypeCompatible(file.type, file.name, detected);
  if (!compatibility.ok) {
    logSecurityEvent('upload_rejected_type_mismatch', { requestId, reason: compatibility.reason });
    return jsonError('O conteúdo do arquivo não corresponde ao formato declarado.', 415);
  }

  // Nome totalmente aleatório: sem nome do cliente, sem path traversal,
  // sem sobrescrita de arquivos existentes.
  const objectName = `products/${randomUUID()}.${detected.ext}`;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      const blob = await put(objectName, Buffer.from(bytes), {
        access: 'public',
        contentType: detected.mime,
        token: blobToken,
        addRandomSuffix: false,
      });
      return NextResponse.json({ url: blob.url }, { headers: NO_STORE });
    } catch (error) {
      // Sem fallback silencioso para disco: em produção o arquivo não persistiria.
      return serverError(requestId, 'admin_upload_blob', error);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return jsonError(
      'Armazenamento de imagens não configurado. Defina BLOB_READ_WRITE_TOKEN no ambiente de produção.',
      503,
    );
  }

  // Desenvolvimento local: disco controlado, nome aleatório, diretório fixo.
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const fileName = path.basename(objectName);
    await writeFile(path.join(UPLOAD_DIR, fileName), bytes, { flag: 'wx' });
    return NextResponse.json({ url: `/uploads/${fileName}` }, { headers: NO_STORE });
  } catch (error) {
    return serverError(requestId, 'admin_upload_local', error);
  }
}
