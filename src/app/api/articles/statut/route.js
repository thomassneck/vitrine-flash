// src/app/api/articles/statut/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { articleId, nouveauStatut, slug } = await request.json();

    if (!articleId || !nouveauStatut || !slug) {
      return NextResponse.json(
        { error: "Paramètres manquants (articleId, nouveauStatut, slug)." },
        { status: 400 }
      );
    }

    // 1. Vérification de la session admin
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${slug}`);

    const { data: boutique, error: boutiqueError } = await supabaseAdmin
      .from("boutiques")
      .select("id")
      .eq("slug", slug)
      .single();

    if (boutiqueError || !boutique || sessionCookie?.value !== boutique.id) {
      return NextResponse.json(
        { error: "Non autorisé. Session expirée." },
        { status: 401 }
      );
    }

    // 2. Mise à jour du statut de l'article
    const { error: updateError } = await supabaseAdmin
      .from("articles")
      .update({ statut: nouveauStatut })
      .eq("id", articleId)
      .eq("boutique_id", boutique.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Si l'article redevient disponible : annuler la réservation et avertir
    if (nouveauStatut === "disponible") {
      await supabaseAdmin
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("article_id", articleId);

      // Notification file d'attente (optionnel)
      try {
        const origin = new URL(request.url).origin;
        fetch(`${origin}/api/articles/liberer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ article_id: articleId }),
        });
      } catch (errLiberer) {
        console.error("Erreur déclenchement alerte libération :", errLiberer);
      }
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("Erreur API statut article :", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}