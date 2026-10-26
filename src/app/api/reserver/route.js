import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function calculerHeureMax() {
  const maintenant = new Date();
  const heure = maintenant.getHours();
  const jour = maintenant.getDay(); // 0 = Dimanche, 1 = Lundi, etc.

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

    // 1. Mise à jour de l'article (on utilise 'confirme' ou 'pre_reserve' selon ton choix)
    const { data: article, error: updateError } = await supabase
      .from('articles')
      .update({ 
        statut: 'confirme' 
      })
      .eq('id', article_id)
      .select('titre, taille, prix')
      .single();

    if (updateError) {
      console.error("Erreur update article Supabase:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 2. Enregistrement de la réservation
    const { error: insertError } = await supabase.from('reservations').insert({
      code_resa: codeResa,
      article_id,
      prenom_cliente: prenom,
      telephone_cliente: telephone,
      canal,
      statut: 'attente_sms'
    });

    if (insertError) {
      console.error("Erreur insert reservation Supabase:", insertError);
    }

    // 3. Notification Telegram en arrière-plan (si configurée)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (botToken && chatId && article) {
      const messageAlerte = 
        `🛍️ *NOUVELLE RÉSERVATION !*\n\n` +
        `👗 *Article :* ${article.titre} (${article.taille}) - *${article.prix} €*\n` +
        `👤 *Cliente :* ${prenom}\n` +
        `📞 *Téléphone :* ${telephone}\n` +
        `🔑 *Réf :* #${codeResa} (jusqu'à ${heureFin})`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageAlerte,
          parse_mode: 'Markdown',
        }),
      }).catch((err) => console.error("Erreur Telegram:", err));
    }

    // 4. Renvoi obligatoire des clés attendues par le front-end
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