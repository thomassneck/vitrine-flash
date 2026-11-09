// src/app/api/boutiques/reglages/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const {
      slug,
      motDePasseActuel,
      telephonePro,
      nouveauMotDePasse,
      email,
      maxArticles,
      heureSoir,
      enPause,
      messagePause,
      messageAnnonce,
      joursFermeture,
    } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: "Identifiant de la boutique (slug) manquant." },
        { status: 400 }
      );
    }

    // 1. Vérification de sécurité : session cookie OU mot de passe actuel valide
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${slug}`);

    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id, mot_de_passe_admin")
      .eq("slug", slug)
      .single();

    if (boutiqueError || !boutique) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    const estAuthentifieParCookie = sessionCookie?.value === boutique.id;
    const estAuthentifieParMdp =
      motDePasseActuel && motDePasseActuel === boutique.mot_de_passe_admin;

    if (!estAuthentifieParCookie && !estAuthentifieParMdp) {
      return NextResponse.json(
        { error: "Action non autorisée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // 2. Nettoyage du numéro de mobile (+33)
    let telFormate = telephonePro ? telephonePro.trim().replace(/\s+/g, "") : null;
    if (telFormate && telFormate.startsWith("0")) {
      telFormate = "+33" + telFormate.substring(1);
    }

    // 3. Préparation des champs mis à jour
    const champsMaj = {
      telephone_pro: telFormate,
      email: email ? email.trim() : null,
      max_articles_par_cliente: parseInt(maxArticles, 10) || 1,
      heure_fermeture_soir: heureSoir || "18h30",
      en_pause: Boolean(enPause),
      message_pause: messagePause ? messagePause.trim() : null,
      message_annonce: messageAnnonce ? messageAnnonce.trim() : null,
      jours_fermeture: Array.isArray(joursFermeture) ? joursFermeture : [0, 1],
    };

    // Mise à jour du mot de passe uniquement s'il a été renseigné
    if (nouveauMotDePasse && nouveauMotDePasse.trim()) {
      champsMaj.mot_de_passe_admin = nouveauMotDePasse.trim();
    }

    // 4. Exécution sécurisée via le client Admin (contourne le RLS)
    const { error: updateError } = await supabaseAdmin
      .from("boutiques")
      .update(champsMaj)
      .eq("id", boutique.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Si le mot de passe a changé, rafraîchir le cookie de session
    if (champsMaj.mot_de_passe_admin) {
      cookieStore.set(`admin_session_${slug}`, boutique.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("Erreur API réglages :", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}