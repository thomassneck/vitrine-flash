import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifierPremiereEnAttente } from "@/lib/alerteAttente";

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

    // 3. Si l'article redevient disponible : annuler la réservation et notifier la file d'attente
    if (nouveauStatut === "disponible") {
      await supabaseAdmin
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("article_id", articleId);

      // Exécution directe et attendue pour que Vercel ne coupe pas l'envoi Resend
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