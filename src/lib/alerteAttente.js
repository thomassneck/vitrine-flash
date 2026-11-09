import { supabase } from "@/lib/supabase";
import { Resend } from "resend";

export async function notifierPremiereEnAttente(articleId) {
  try {
    // 1. Récupérer la 1re personne sur liste d'attente pour cet article (ordre chronologique strict)
    const { data: candidate, error: candidateError } = await supabase
      .from("liste_attente")
      .select("id, prenom, email, articles(titre, taille, prix, boutiques(nom, slug))")
      .eq("article_id", articleId)
      .eq("statut", "en_attente")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidateError || !candidate) {
      // Aucune cliente n'attend cette pièce
      return null;
    }

    const { prenom, email, articles } = candidate;
    const boutique = articles?.boutiques;
    const urlVitrine = `${process.env.NEXT_PUBLIC_SITE_URL || "https://vitrine-flash-kappa.vercel.app"}/${boutique?.slug || "bisou-magique"}`;

    // 2. Vérification de la clé API Resend
    const cleResend = process.env.RESEND_API_KEY;
    if (!cleResend) {
      console.error("⚠️ RESEND_API_KEY manquante dans l'environnement");
      return null;
    }

    // Si on est en développement local, simuler sans appeler Resend
    if (process.env.NODE_ENV === "development") {
      console.log("🛠️ [DEV - SIMULATION EMAIL] Alerte liste d'attente envoyée à :", candidate.email);
      await supabaseAdmin
        .from("liste_attente")
        .update({ statut: "notifiee" })
        .eq("id", candidate.id);
      return candidate;
    }

    const resend = new Resend(cleResend);

    // 3. Envoi du mail d'alerte (sécurisé avec try/catch)
    try {
      const { data, error } = await resend.emails.send({
        from: "Vitrine Flash <onboarding@resend.dev>",
        to: email,
        subject: `Bonne nouvelle ${prenom} ! "${articles.titre}" est de nouveau disponible ✨`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e7e5e4; border-radius: 16px; background-color: #fafaf9;">
            <p style="font-size: 13px; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Alerte disponibilité</p>
            <h2 style="color: #1c1917; margin: 0 0 12px; font-size: 20px;">Bonne nouvelle ${prenom} !</h2>
            <p style="color: #44403c; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              La pièce que vous attendiez chez <strong>${boutique?.nom || "la boutique"}</strong> est à nouveau disponible en rayon :
            </p>
            <div style="background: white; border: 1px solid #e7e5e4; border-radius: 12px; padding: 14px 16px; margin-bottom: 20px;">
              <p style="font-weight: 700; color: #1c1917; font-size: 15px; margin: 0 0 4px;">👗 ${articles.titre} (${articles.taille})</p>
              <p style="color: #78716c; font-size: 13px; margin: 0;">Prix : ${articles.prix} € (règlement sur place)</p>
            </div>
            <p style="color: #78716c; font-size: 12px; margin: 0 0 20px;">
              La pièce n'a pas été bloquée automatiquement pour vous laisser le choix selon vos disponibilités du jour.
            </p>
            <a href="${urlVitrine}" style="display: block; text-align: center; background-color: #1c1917; color: white; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 700; text-decoration: none;">
              Voir la pièce et la mettre de côté →
            </a>
          </div>
        `,
      });

      if (error) {
        console.error("❌ Erreur retournée par Resend :", error);
        return null;
      }

      console.log("✅ Email Resend envoyé avec succès :", data?.id);

      // 4. Marquer la cliente comme notifiée pour ne pas lui renvoyer d'email en boucle
      await supabaseAdmin
        .from("liste_attente")
        .update({ statut: "notifiee" })
        .eq("id", candidate.id);

      return candidate;
    } catch (err) {
      console.error("❌ Exception lors de l'appel Resend :", err);
      return null;
    }
  } catch (errGlobal) {
    console.error("❌ Erreur globale alerte liste attente :", errGlobal);
    return null;
  }
}