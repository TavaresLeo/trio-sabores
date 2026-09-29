import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productImageFor } from '@/lib/product-image';
export async function GET(){const products=await db.product.findMany({where:{availability:{not:'SOLD_OUT'}},include:{category:true},orderBy:[{featured:'desc'},{sortOrder:'asc'}]});return NextResponse.json({products:products.map(product=>({...product,imageUrl:productImageFor(product)}))});}
