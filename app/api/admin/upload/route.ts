import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
const MAX_BYTES = 4.5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','image/avif']);

export async function POST(req: Request) {
  if (!await verifyAdmin()) return NextResponse.json({error:'Não autorizado.'},{status:401});
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({error:'BLOB_READ_WRITE_TOKEN não configurado.'},{status:503});
  const form = await req.formData(); const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({error:'Arquivo ausente.'},{status:400});
  if (file.size > MAX_BYTES) return NextResponse.json({error:'A imagem deve ter até 4,5 MB.'},{status:413});
  if (!ALLOWED.has(file.type)) return NextResponse.json({error:'Formato não permitido. Use JPG, PNG, WebP ou AVIF.'},{status:415});
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.\-_]/g,'-');
  const blob = await put(`products/${Date.now()}-${safeName}`, file, { access:'public' });
  return NextResponse.json({url:blob.url});
}
