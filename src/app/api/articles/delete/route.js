// src/app/api/articles/delete/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { articleId, boutiqueId, motDePasse } = body;

    if (!articleId || !boutiqueId) {
      return NextResponse.json(
        { error: "Identifiant article et boutique requis." },
        { status: 400 }
      );
    }

    // 1. Récupération de la boutique pour valider les droits
    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id, slug, mot_de_passe_admin")
      .eq("id", boutiqueId)
      .single();

    if (boutiqueError || !boutique) {
      return NextResponse.json(
        { error: "Boutique introuvable." },
        { status: 404 }
      );
    }

    // 2. Double vérification d'authentification (Cookie de session OU Mot de passe)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${boutique.slug}`);

    const estAuthentifieParCookie = sessionCookie?.value === boutique.id;
    const estAuthentifieParMdp =
      motDePasse && motDePasse === boutique.mot_de_passe_admin;

    if (!estAuthentifieParCookie && !estAuthentifieParMdp) {
      return NextResponse.json(
        { error: "Non autorisé. Mot de passe incorrect ou session expirée." },
        { status: 401 }
      );
    }

    // 3. Récupération de l'article pour vérifier son appartenance et nettoyer son image
    const { data: article, error: artError } = await supabaseAdmin
      .from("articles")
      .select("id, photo_url, boutique_id")
      .eq("id", articleId)
      .eq("boutique_id", boutiqueId)
      .maybeSingle();

    if (artError || !article) {
      return NextResponse.json(
        { error: "Article introuvable ou non associé à cette boutique." },
        { status: 404 }
      );
    }

    // 4. Nettoyage du fichier image dans Supabase Storage (si stocké dans photos-vitrine)
    if (article.photo_url && article.photo_url.includes("/photos-vitrine/")) {
      const cheminPhoto = article.photo_url.split("/photos-vitrine/")[1];
      if (cheminPhoto) {
        // Enlève d'éventuels paramètres d'URL (ex: cache busters ?t=...)
        const cheminNettoye = cheminPhoto.split("?")[0];
        await supabaseAdmin.storage
          .from("photos-vitrine")
          .remove([cheminNettoye]);
      }
    }

    // 5. Suppression de l'article en base (contourne le RLS via supabaseAdmin)
    const { error: deleteError } = await supabaseAdmin
      .from("articles")
      .delete()
      .eq("id", articleId)
      .eq("boutique_id", boutiqueId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("Erreur API suppression article :", err);
    return NextResponse.json(
      { error: err.message || "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}