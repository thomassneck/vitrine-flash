// src/app/api/boutiques/reinitialiser-mdp/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { slug, quatreChiffres, nouveauMotDePasse } = await request.json();

    if (!slug || !quatreChiffres || !nouveauMotDePasse) {
      return NextResponse.json(
        { error: "Slug, 4 chiffres et nouveau mot de passe requis." },
        { status: 400 }
      );
    }

    // 1. Récupérer le numéro enregistré en base
    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id, telephone_pro")
      .eq("slug", slug)
      .single();

    if (boutiqueError || !boutique) {
      return NextResponse.json({ error: "Boutique introuvable." }, { status: 404 });
    }

    // 2. Contrôle de sécurité des 4 derniers chiffres
    const telProNettoye = (boutique.telephone_pro || "").replace(/\D/g, "");
    const attendu = telProNettoye.slice(-4);

    if (quatreChiffres.trim() !== attendu) {
      return NextResponse.json(
        { error: "Les 4 chiffres saisis ne correspondent pas au numéro de la boutique." },
        { status: 403 }
      );
    }

    // 3. Mise à jour du code secret
    const { error: updateError } = await supabaseAdmin
      .from("boutiques")
      .update({ mot_de_passe_admin: nouveauMotDePasse.trim() })
      .eq("id", boutique.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Création automatique du cookie de session
    const cookieStore = await cookies();
    cookieStore.set(`admin_session_${slug}`, boutique.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    });

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("Erreur API reinitialiser mdp :", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}