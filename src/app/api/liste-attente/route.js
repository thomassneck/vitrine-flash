import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { article_id, prenom, email } = await request.json();

    if (!article_id || !prenom?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Prénom et e-mail requis.' }, { status: 400 });
    }

    // Vérifier si la personne n'est pas déjà inscrite pour cette pièce
    const { data: existant } = await supabase
      .from('liste_attente')
      .select('id')
      .eq('article_id', article_id)
      .eq('email', email.trim().toLowerCase())
      .eq('statut', 'en_attente')
      .maybeSingle();

    if (existant) {
      return NextResponse.json({ error: 'Vous êtes déjà inscrite sur la liste d\'attente de cet article.' }, { status: 400 });
    }

    // Inscription en fin de file
    const { error: insertError } = await supabase.from('liste_attente').insert({
      article_id,
      prenom: prenom.trim(),
      email: email.trim().toLowerCase(),
      statut: 'en_attente'
    });

    if (insertError) throw insertError;

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error('Erreur API liste-attente:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}