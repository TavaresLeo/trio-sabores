import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
export async function GET(){try{await db.$queryRaw`SELECT 1`;return NextResponse.json({status:'ok',service:'trio-sabores',database:'ok',timestamp:new Date().toISOString()});}catch{return NextResponse.json({status:'degraded',service:'trio-sabores',database:'error',timestamp:new Date().toISOString()},{status:503});}}
