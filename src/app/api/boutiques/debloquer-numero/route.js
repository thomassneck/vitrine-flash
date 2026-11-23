import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { id, slug } = await request.json();

    if (!id || !slug) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    // 1. Contrôle de session admin
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`admin_session_${slug}`);

    const { data: boutique } = await supabaseAdmin
      .from("boutiques")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!boutique || sessionCookie?.value !== boutique.id) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    // 2. Récupérer le numéro de téléphone avant de supprimer l'entrée
    const { data: entreeBloquee } = await supabaseAdmin
      .from("numeros_bloques")
      .select("telephone")
      .eq("id", id)
      .eq("boutique_id", boutique.id)
      .maybeSingle();

    if (!entreeBloquee) {
      return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
    }

    // 3. Remettre à zéro les anciens 'no_show' de ce numéro sur les articles de cette boutique
    const { data: articlesBoutique } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("boutique_id", boutique.id);

    if (articlesBoutique && articlesBoutique.length > 0) {
      const idsArticles = articlesBoutique.map((a) => a.id);

      await supabaseAdmin
        .from("reservations")
        .update({ motif_annulation: "no_show_pardonne" })
        .in("article_id", idsArticles)
        .eq("telephone_client", entreeBloquee.telephone)
        .eq("motif_annulation", "no_show");
    }

    // 4. Supprimer le numéro de la liste noire
    const { error } = await supabaseAdmin
      .from("numeros_bloques")
      .delete()
      .eq("id", id)
      .eq("boutique_id", boutique.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ succes: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}