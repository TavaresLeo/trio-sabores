/**
 * Validação de imagens de upload por assinatura real do arquivo (magic bytes).
 * O MIME informado pelo navegador e a extensão do nome nunca são suficientes.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export type DetectedImage = { mime: string; ext: string };

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;

function ascii(bytes: Uint8Array, start: number, length: number) {
  let value = '';
  for (let index = start; index < start + length && index < bytes.length; index += 1) {
    value += String.fromCharCode(bytes[index]);
  }
  return value;
}

/**
 * Detecta o formato real pelos primeiros bytes.
 * SVG (`<svg`, XML, HTML) e executáveis retornam `null` e são rejeitados.
 */
export function sniffImageType(bytes: Uint8Array): DetectedImage | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: "RIFF" .... "WEBP"
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }

  // AVIF: ... "ftyp" "avif"/"avis"
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const brand = ascii(bytes, 8, 4);
    if (brand === 'avif' || brand === 'avis') {
      return { mime: 'image/avif', ext: 'avif' };
    }
  }

  return null;
}

const DECLARED_MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
};

/**
 * Confere se o MIME declarado e a extensão do arquivo correspondem ao conteúdo real.
 * O nome do arquivo precisa terminar na extensão compatível com o formato detectado.
 */
export function isDeclaredTypeCompatible(
  declaredMime: string,
  fileName: string,
  detected: DetectedImage,
): { ok: true } | { ok: false; reason: string } {
  const normalizedMime = (declaredMime || '').toLowerCase().trim();
  const aliasedMime = DECLARED_MIME_ALIASES[normalizedMime] ?? normalizedMime;

  if (aliasedMime && aliasedMime !== detected.mime) {
    return { ok: false, reason: 'declared_mime_mismatch' };
  }

  const extension = (fileName.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase();
  if (!extension) return { ok: false, reason: 'missing_extension' };

  const extensionMatchesType =
    detected.mime === 'image/jpeg'
      ? extension === 'jpg' || extension === 'jpeg'
      : extension === detected.ext;

  if (!extensionMatchesType) return { ok: false, reason: 'declared_extension_mismatch' };

  return { ok: true };
}
