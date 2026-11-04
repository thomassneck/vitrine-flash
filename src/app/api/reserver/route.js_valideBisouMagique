import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

function calculerHeureMax() {
  const maintenant = new Date();
  const heure = maintenant.getHours();
  const jour = maintenant.getDay(); // 0 = Dimanche, 1 = Lundi

  if (heure < 14 && jour !== 0 && jour !== 1) {
    return "ce soir 18h30";
  }
  if (jour === 0 || (jour === 6 && heure >= 14)) {
    return "mardi 14h00";
  }
  if (jour === 1) {
    return "mardi 18h30";
  }
  return "demain 14h00";
}

export async function POST(request) {
  try {
    const { article_id, prenom, telephone, canal } = await request.json();

    const codeResa = 'BM-' + Math.floor(100 + Math.random() * 900);
    const heureFin = calculerHeureMax();

    // 1. Mettre à jour l'article et récupérer les infos de la boutique liée (dont son email)
    const { data: article, error: updateError } = await supabase
      .from('articles')
      .update({ statut: 'confirme' })
      .eq('id', article_id)
      .select('titre, taille, prix, boutiques(nom, email, telephone_pro)')
      .single();

    if (updateError || !article) {
      console.error("Erreur update article Supabase:", updateError);
      return NextResponse.json({ error: updateError?.message || 'Article non trouvé' }, { status: 400 });
    }

    const emailDestinataire = article.boutiques?.email;
    const nomBoutique = article.boutiques?.nom || 'Boutique';

    // 2. Enregistrer la réservation
    const { error: insertError } = await supabase.from('reservations').insert({
      code_resa: codeResa,
      article_id,
      prenom_cliente: prenom,
      telephone_cliente: telephone,
      canal: canal || 'web',
      statut: 'validee_cabine'
    });

    if (insertError) {
      console.error("Erreur insert reservation Supabase:", insertError);
    }

    // 3. Envoi du mail transactionnel à la bonne boutique via Resend
    if (process.env.RESEND_API_KEY && emailDestinataire) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'Vitrine Flash <onboarding@resend.dev>',
        to: emailDestinataire, // <-- L'adresse dynamique de la boutique concernée
        subject: `🚨 Nouvelle résa : ${article.titre} pour ${prenom}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px;">
            <h2 style="color: #1c1917;">Nouvelle pièce mise de côté ! ✨</h2>
            <p>Une cliente vient de bloquer un article pour <strong>${nomBoutique}</strong> :</p>
            <ul>
              <li><strong>Article :</strong> ${article.titre} (${article.taille}) - ${article.prix} €</li>
              <li><strong>Cliente :</strong> ${prenom}</li>
              <li><strong>Téléphone :</strong> <a href="tel:${telephone}">${telephone}</a></li>
              <li><strong>Référence :</strong> #${codeResa}</li>
              <li><strong>Bloqué jusqu'à :</strong> ${heureFin}</li>
            </ul>
            <p style="color: #78716c; font-size: 13px;">
              Mettez la pièce de côté en cabine ou derrière la caisse.
            </p>
          </div>
        `,
      }).catch((err) => console.error("Erreur envoi mail Resend:", err));
    }

    // 4. Réponse au client
    return NextResponse.json({
      succes: true,
      codeResa,
      heureFin
    });

  } catch (err) {
    console.error("Erreur API reserver:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}