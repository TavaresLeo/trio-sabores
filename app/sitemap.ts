import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
export default async function sitemap(): Promise<MetadataRoute.Sitemap>{const base=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000';const products=await db.product.findMany({select:{slug:true,updatedAt:true}});const pages=['/','/cardapio','/sobre','/depoimentos','/contato','/carrinho'];return [...pages.map(path=>({url:`${base}${path}`,lastModified:new Date()})),...products.map(p=>({url:`${base}/produto/${p.slug}`,lastModified:p.updatedAt}))];}
