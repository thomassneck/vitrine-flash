import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug manquant" }, { status: 400 });
  }

  const { data: boutique, error: boutiqueError } = await supabaseAdmin
    .from("boutiques")
    .select(
      "id, slug, nom, telephone_pro, email, max_articles_par_cliente, heure_fermeture_soir, en_pause, message_pause, message_annonce, jours_fermeture"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (boutiqueError || !boutique) {
    return NextResponse.json({ error: "Boutique introuvable" }, { status: 404 });
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(`admin_session_${slug}`);

  if (sessionCookie?.value !== boutique.id) {
    return NextResponse.json({ boutique, nonAutorise: true }, { status: 401 });
  }

  const { data: articles } = await supabaseAdmin
    .from("articles")
    .select("*")
    .eq("boutique_id", boutique.id)
    .neq("statut", "vendu")
    .order("created_at", { ascending: false });

  let reservations = [];
  if (articles && articles.length > 0) {
    const idsArticles = articles.map((a) => a.id);
    const { data: dataResa } = await supabaseAdmin
      .from("reservations")
      .select("*")
      .in("article_id", idsArticles)
      .neq("statut", "annulee")
      .order("created_at", { ascending: false });

    reservations = dataResa || [];
  }

  return NextResponse.json({
    boutique,
    articles: articles || [],
    reservations,
  });
}