import { NextResponse } from 'next/server';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Resend } from 'resend';

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function calculerHeureMaxDynamique(joursFermeture = [0, 1], heureSoir = "18h30") {
  const dateFr = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const heure = dateFr.getHours();
  const jourActuel = dateFr.getDay();

  const fermetures = Array.isArray(joursFermeture) ? joursFermeture : [0, 1];
  const heureCloture = heureSoir || "18h30";
  const estFermeAujourdhui = fermetures.includes(jourActuel);

  if (heure < 14 && !estFermeAujourdhui) {
    return `ce soir ${heureCloture}`;
  }

  let prochainJour = (jourActuel + 1) % 7;
  let compteurSecurite = 0;

  while (fermetures.includes(prochainJour) && compteurSecurite < 7) {
    prochainJour = (prochainJour + 1) % 7;
    compteurSecurite++;
  }

  if (prochainJour === (jourActuel + 1) % 7 && !estFermeAujourdhui) {
    return "demain 14h00";
  }

  return `${NOMS_JOURS[prochainJour]} 14h00`;
}

export async function POST(request) {
  try {
    const { article_id, prenom, telephone, canal } = await request.json();

    // 1. Validation du mobile
    const telNettoye = telephone ? telephone.toString().replace(/[\s.-]/g, "") : "";
    const regexMobileFr = /^0[67]\d{8}$/;

    if (!prenom || !prenom.trim()) {
      return NextResponse.json({ error: "Le prénom est requis." }, { status: 400 });
    }

    if (!regexMobileFr.test(telNettoye)) {
      return NextResponse.json(
        { error: "Le numéro doit être un mobile valide commençant par 06 ou 07 (10 chiffres)." },
        { status: 400 }
      );
    }

    // 2. Bloquer l'article et récupérer les réglages de la boutique
    const { data: article, error: updateError } = await supabaseAdmin
      .from('articles')
      .update({ statut: 'confirme' })
      .eq('id', article_id)
      .eq('statut', 'disponible')
      .select('titre, taille, prix, boutiques(id, nom, email, telephone_pro, jours_fermeture, heure_fermeture_soir, max_articles_par_client, en_pause, message_pause)')
      .single();

    if (updateError || !article) {
      console.error("Erreur update article Supabase:", updateError);
      return NextResponse.json(
        { error: updateError?.message || 'Article indisponible ou introuvable' },
        { status: 400 }
      );
    }

    const boutique = article.boutiques;
    const limiteMax = boutique?.max_articles_par_client || 1;

    // 3. Vérification du mode congés / pause
    if (boutique?.en_pause) {
      await supabaseAdmin
        .from('articles')
        .update({ statut: 'disponible' })
        .eq('id', article_id);

      return NextResponse.json(
        { error: boutique.message_pause || "La boutique est fermée pour congés. Les réservations sont suspendues." },
        { status: 400 }
      );
    }

    // Vérification de la liste noire pour cette boutique
    const { data: estBloque } = await supabaseAdmin
      .from("numeros_bloques")
      .select("id")
      .eq("boutique_id", boutique.id)
      .eq("telephone", telNettoye)
      .maybeSingle();

    if (estBloque) {
      // Remettre l'article en disponible puisque la réservation est refusée
      await supabaseAdmin
        .from("articles")
        .update({ statut: "disponible" })
        .eq("id", article_id);

      return NextResponse.json(
        {
          error:
            "Ce numéro de téléphone a cumulé une ou plusieurs réservations non honorées.\nLes réservations en ligne sont suspendues pour ce numéro.",
        },
        { status: 403 }
      );
    }    

    // 4. Contrôle du quota par numéro de téléphone pour cette boutique
    const { data: resasEnCours, error: verifError } = await supabaseAdmin
      .from('reservations')
      .select('id, article_id, articles!inner(boutique_id)')
      .eq('telephone_client', telNettoye)
      .eq('articles.boutique_id', boutique.id)
      .in('statut', ['reserve', 'attente_sms', 'confirme']);

    if (verifError) {
      console.error("Erreur vérification quota:", verifError);
    }

    if (resasEnCours && resasEnCours.length >= limiteMax) {
      await supabaseAdmin
        .from('articles')
        .update({ statut: 'disponible' })
        .eq('id', article_id);

      const messageErreur = limiteMax === 1
        ? "Vous avez déjà une pièce mise de côté ! Venez l'essayer avant d'en réserver une autre 😊"
        : `Vous avez déjà atteint votre limite de ${limiteMax} articles réservés !`;

      return NextResponse.json({ error: messageErreur }, { status: 400 });
    }

    const codeResa = 'BM-' + Math.floor(100 + Math.random() * 900);
    const heureFin = calculerHeureMaxDynamique(
      boutique?.jours_fermeture,
      boutique?.heure_fermeture_soir
    );

    // 5. Enregistrement de la réservation
    const { error: insertError } = await supabaseAdmin.from('reservations').insert({
      code_resa: codeResa,
      article_id,
      prenom_client: prenom.trim(),
      telephone_client: telNettoye,
      canal: canal || 'web',
      statut: 'reserve'
    });

    if (insertError) {
      console.error("Erreur insert reservation Supabase:", insertError);
    }

    // 6. Envoi email Resend
    if (process.env.RESEND_API_KEY && boutique?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Vitrine Flash <notifications@proxi-saas.fr>',
        to: boutique.email,
        subject: `🚨 Nouvelle résa : ${article.titre} pour ${prenom}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; padding: 20px;">
            <h2 style="color: #1c1917;">Nouvelle pièce mise de côté ! ✨</h2>
            <p>Une cliente vient de bloquer un article pour <strong>${boutique.nom}</strong> :</p>
            <ul>
              <li><strong>Article :</strong> ${article.titre} (${article.taille}) - ${article.prix} €</li>
              <li><strong>Cliente :</strong> ${prenom}</li>
              <li><strong>Téléphone :</strong> <a href="tel:${telNettoye}">${telNettoye}</a></li>
              <li><strong>Référence :</strong> #${codeResa}</li>
              <li><strong>Bloqué jusqu'à :</strong> ${heureFin}</li>
            </ul>
          </div>
        `,
      });

      if (emailError) {
        console.error("❌ Erreur retournée par Resend (réservation) :", emailError);
      } else {
        console.log("✅ Email réservation envoyé à", boutique.email, "ID:", emailData?.id);
      }
    }

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