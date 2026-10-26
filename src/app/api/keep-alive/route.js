import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  // Simple requête ultra-légère pour maintenir Supabase éveillé
  const { data } = await supabase.from('boutiques').select('id').limit(1);
  return NextResponse.json({ status: 'Supabase est bien réveillé !', data });
}