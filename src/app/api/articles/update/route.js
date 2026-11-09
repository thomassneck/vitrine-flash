// src/app/api/articles/update/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const {
      articleId,
      titre,
      taille,
      prix,
      photoUrl,
      anciennePhotoUrl,
      slug,
    } = await request.json();

    if (!articleId || !titre || !prix || !slug) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants." },
        { status: 400 }
      );
    }

    // 1. Contrôle de session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${slug}`);

    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id")
      .eq("slug", slug)
      .single();

    if (boutiqueError || !boutique || sessionCookie?.value !== boutique.id) {
      return NextResponse.json(
        { error: "Non autorisé. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // 2. Nettoyage de l'ancienne image dans Storage si changée
    if (anciennePhotoUrl && anciennePhotoUrl.includes("/photos-vitrine/")) {
      const ancienChemin = anciennePhotoUrl.split("/photos-vitrine/")[1]?.split("?")[0];
      if (ancienChemin) {
        await supabaseAdmin.storage.from("photos-vitrine").remove([ancienChemin]);
      }
    }

    // 3. Mise à jour de l'article en base
    const { data: articleModifie, error: updateError } = await supabaseAdmin
      .from("articles")
      .update({
        titre: titre.trim(),
        taille: taille ? taille.trim() : "Unique",
        prix: parseFloat(prix),
        photo_url: photoUrl,
      })
      .eq("id", articleId)
      .eq("boutique_id", boutique.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ succes: true, article: articleModifie });
  } catch (err) {
    console.error("Erreur API update article :", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}