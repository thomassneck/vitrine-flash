import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { article_id, prenom, telephone, canal } = await request.json();

    const codeResa = 'BM-' + Math.floor(100 + Math.random() * 900);

    // 1. Bloquer l'article
    const { data: article, error: updateError } = await supabase
      .from('articles')
      .update({ statut: 'confirme' })
      .eq('id', article_id)
      .select('titre, taille, prix')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 2. Enregistrer la réservation
    await supabase.from('reservations').insert({
      code_resa: codeResa,
      article_id,
      prenom_cliente: prenom,
      telephone_cliente: telephone,
      canal: canal || 'web',
      statut: 'validee_cabine'
    });

    // 3. ENVOI DU MAIL D'ALERTE À LA BOUTIQUE
    if (process.env.RESEND_API_KEY && process.env.EMAIL_BOUTIQUE) {
      await resend.emails.send({
        from: 'Vitrine Flash <onboarding@resend.dev>',
        to: process.env.EMAIL_BOUTIQUE,
        subject: `🚨 Nouvelle résa : ${article.titre} pour ${prenom}`,
        html: `
          <h3>Nouvelle pièce mise de côté !</h3>
          <p><strong>Article :</strong> ${article.titre} (${article.taille}) - ${article.prix} €</p>
          <p><strong>Cliente :</strong> ${prenom}</p>
          <p><strong>Téléphone :</strong> <a href="tel:${telephone}">${telephone}</a></p>
          <p><strong>Référence :</strong> #${codeResa}</p>
          <hr />
          <p>Mettez la pièce de côté en cabine ou derrière la caisse.</p>
        `,
      }).catch((err) => console.error("Erreur envoi mail:", err));
    }

    return NextResponse.json({ succes: true, codeResa, heureFin: '18h30' });

  } catch (err) {
    console.error("Erreur API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}