import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function calculerHeureMax() {
  const maintenant = new Date();
  // Heure locale en France
  const heure = maintenant.getHours();
  const jour = maintenant.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

  // Si c'est réservé le matin (avant 14h) du mardi au samedi
  if (heure < 14 && jour !== 0 && jour !== 1) {
    return "ce soir 18h30";
  }

  // Si c'est réservé le samedi soir ou le dimanche
  if (jour === 0 || (jour === 6 && heure >= 14)) {
    return "mardi 14h00";
  }

  // Si c'est réservé le lundi
  if (jour === 1) {
    return "mardi 18h30";
  }

  // Tous les autres soirs de la semaine
  return "demain 14h00";
}

export async function POST(request) {
  const { article_id, prenom, telephone, canal } = await request.json();

  const codeResa = 'BM-' + Math.floor(100 + Math.random() * 900);
  const dans15Min = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('articles')
    .update({ 
      statut: 'pre_reserve', 
      confirme: dans15Min 
    })
    .eq('id', article_id);

  if (updateError) return NextResponse.json({ error: 'Erreur blocage' }, { status: 400 });

  await supabase.from('reservations').insert({
    code_resa: codeResa,
    article_id,
    prenom_cliente: prenom,
    telephone_cliente: telephone, // <-- Le 06 est bien enregistré ici !
    canal,
    statut: 'attente_sms'
  });

  return NextResponse.json({ codeResa, heureFin: calculerHeureMax() });
}