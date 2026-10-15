import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
]);

export async function POST(req: Request) {
  if (!await verifyAdmin()) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Formulário inválido.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo ausente.' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'A imagem deve ter até 10 MB.' }, { status: 413 });
  }

  // Verifica MIME type ou extensão do arquivo
  const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : '';
  const validExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg']);

  if (!ALLOWED_MIME.has(file.type) && !validExtensions.has(ext)) {
    return NextResponse.json(
      { error: 'Formato não permitido. Envie um arquivo JPG, JPEG, PNG, WebP, AVIF ou SVG.' },
      { status: 415 }
    );
  }

  // Normaliza o nome do arquivo para ser seguro na URL e no sistema de arquivos
  const safeBaseName = file.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9.\-_]/g, '-');
  const finalExt = ext ? `.${ext === 'jpeg' ? 'jpeg' : ext}` : '.jpg';
  const rawNameWithoutExt = safeBaseName.replace(/\.[^/.]+$/, '');
  const fileName = `${Date.now()}-${rawNameWithoutExt}${finalExt}`;

  // Se tiver Vercel Blob configurado (produção na Vercel), usa o Blob
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blob = await put(`products/${fileName}`, file, { access: 'public' });
      return NextResponse.json({ url: blob.url });
    } catch (blobError) {
      console.warn('Falha no upload para Vercel Blob, usando armazenamento local como fallback:', blobError);
    }
  }

  // Armazenamento local (desenvolvimento / VPS / servidor padrão)
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;
    return NextResponse.json({ url: publicUrl, fileName });
  } catch (err) {
    console.error('Erro ao salvar imagem localmente:', err);
    return NextResponse.json({ error: 'Erro ao processar e salvar a imagem no servidor.' }, { status: 500 });
  }
}
