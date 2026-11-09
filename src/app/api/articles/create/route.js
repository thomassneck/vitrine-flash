// src/app/api/articles/create/route.js
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { boutiqueId, motDePasse, titre, description, prix, imageUrl } = body;

    if (!boutiqueId || !motDePasse || !titre) {
      return NextResponse.json(
        { error: "Paramètres obligatoires manquants" },
        { status: 400 }
      );
    }

    // 1. Contrôle du mot de passe admin de la boutique
    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id, mot_de_passe_admin")
      .eq("id", boutiqueId)
      .single();

    if (boutiqueError || !boutique) {
      return NextResponse.json(
        { error: "Boutique introuvable" },
        { status: 404 }
      );
    }

    if (boutique.mot_de_passe_admin !== motDePasse) {
      return NextResponse.json(
        { error: "Mot de passe administrateur incorrect" },
        { status: 401 }
      );
    }

    // 2. Création de l'article avec contournement sécurisé du RLS
    const { data: nouvelArticle, error: insertError } = await supabaseAdmin
      .from("articles")
      .insert({
        boutique_id: boutiqueId,
        titre,
        description,
        prix,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, article: nouvelArticle });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Erreur interne" },
      { status: 500 }
    );
  }
}