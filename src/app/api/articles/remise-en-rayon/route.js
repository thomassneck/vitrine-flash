// src/app/api/articles/remise-en-rayon/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { ids, slug } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0 || !slug) {
      return NextResponse.json(
        { error: "Liste d'identifiants ou slug manquant." },
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
        { error: "Action non autorisée. Session invalide." },
        { status: 401 }
      );
    }

    // 2. Remise en rayon groupée des articles de la boutique
    const { error: updateArtError } = await supabaseAdmin
      .from("articles")
      .update({ statut: "disponible" })
      .in("id", ids)
      .eq("boutique_id", boutique.id);

    if (updateArtError) {
      return NextResponse.json({ error: updateArtError.message }, { status: 500 });
    }

    // 3. Annulation groupée des réservations correspondantes
    await supabaseAdmin
      .from("reservations")
      .update({ statut: "annulee" })
      .in("article_id", ids);

    return NextResponse.json({ succes: true, quantite: ids.length });
  } catch (err) {
    console.error("Erreur API remise en rayon :", err);
    return NextResponse.json({ error: err.message || "Erreur interne" }, { status: 500 });
  }
}