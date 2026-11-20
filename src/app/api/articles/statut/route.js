// src/app/api/articles/statut/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifierPremiereEnAttente } from "@/lib/alerteAttente";

export async function POST(request) {
  try {
    const { articleId, nouveauStatut, motifAnnulation, slug } = await request.json();

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

    // 3. Si l'article redevient disponible : annuler la réservation active avec son motif et avertir la file d'attente
    if (nouveauStatut === "disponible") {
      const { error: resaError } = await supabaseAdmin
        .from("reservations")
        .update({
          statut: "annulee",
          motif_annulation: motifAnnulation || "libere",
        })
        .eq("article_id", articleId)
        .neq("statut", "annulee"); // Ne modifie que la réservation en cours, pas les anciennes déjà annulées

      if (resaError) {
        console.error("Erreur mise à jour réservation :", resaError);
      }

      // Exécution directe pour que Vercel ne coupe pas l'envoi d'e-mail
      try {
        await notifierPremiereEnAttente(articleId);
      } catch (errLiberer) {
        console.error("Erreur notification liste d'attente :", errLiberer);
      }
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    console.error("Erreur API statut article :", err);
    return NextResponse.json(
      { error: err.message || "Erreur interne" },
      { status: 500 }
    );
  }
}