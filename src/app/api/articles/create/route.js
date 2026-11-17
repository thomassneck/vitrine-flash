import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { boutiqueId, motDePasse, titre, taille, prix, imageUrl } = body;

    // 1. motDePasse n'est plus bloquant ici, on vérifie juste boutiqueId et titre
    if (!boutiqueId || !titre) {
      return NextResponse.json(
        { error: "Paramètres obligatoires manquants" },
        { status: 400 }
      );
    }

    // 2. Récupération de la boutique
    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id, slug, mot_de_passe_admin")
      .eq("id", boutiqueId)
      .single();

    if (boutiqueError || !boutique) {
      return NextResponse.json(
        { error: "Boutique introuvable" },
        { status: 404 }
      );
    }

    // 3. Double vérification d'authentification (Cookie OU Mot de passe)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${boutique.slug}`);

    const estAuthentifieParCookie = sessionCookie?.value === boutique.id;
    const estAuthentifieParMdp = motDePasse && motDePasse === boutique.mot_de_passe_admin;

    if (!estAuthentifieParCookie && !estAuthentifieParMdp) {
      return NextResponse.json(
        { error: "Action non autorisée. Veuillez vous reconnecter." },
        { status: 401 }
      );
    }

    // 4. Création de l'article (contourne RLS)
    const { data: nouvelArticle, error: insertError } = await supabaseAdmin
      .from("articles")
      .insert({
        boutique_id: boutiqueId,
        titre,
        taille,
        prix,
        photo_url: imageUrl,
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