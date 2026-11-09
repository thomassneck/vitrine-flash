// src/app/api/auth/login/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const { slug, motDePasse } = await request.json();

    if (!slug || !motDePasse) {
      return NextResponse.json(
        { error: "Slug et mot de passe requis." },
        { status: 400 }
      );
    }

    // 1. Récupération sécurisée du mot de passe côté serveur
    const { data: boutique, error } = await supabaseAdmin
      .from("boutiques")
      .select("id, slug, mot_de_passe_admin")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !boutique) {
      return NextResponse.json(
        { error: "Boutique introuvable." },
        { status: 404 }
      );
    }

    // 2. Contrôle du mot de passe
    if (boutique.mot_de_passe_admin !== motDePasse.trim()) {
      return NextResponse.json(
        { error: "Code secret incorrect." },
        { status: 401 }
      );
    }

    // 3. Définition du cookie de session sécurisé
    const cookieStore = await cookies();
    cookieStore.set(`admin_session_${slug}`, boutique.id, {
      httpOnly: true, // Inaccessible en JavaScript (protège des attaques XSS)
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // Valable 30 jours
    });

    return NextResponse.json({ succes: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}