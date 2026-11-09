import { NextResponse } from 'next/server';
import { notifierPremiereEnAttente } from '@/lib/alerteAttente';

export async function POST(request) {
  try {
    const { article_id } = await request.json();
    if (!article_id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });

    const clienteNotifiee = await notifierPremiereEnAttente(article_id);
    return NextResponse.json({ succes: true, notifiee: !!clienteNotifiee });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}