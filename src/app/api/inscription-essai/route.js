import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request) {
  try {
    const { nomBoutique, telephone, ville, offreChoisie } = await request.json();

    if (!nomBoutique?.trim() || !telephone?.trim()) {
      return NextResponse.json(
        { error: "Merci d'indiquer le nom de votre boutique et votre téléphone." },
        { status: 400 }
      );
    }

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailAdmin = process.env.EMAIL_CONTACT_ADMIN || "contact@proxi-saas.fr";

      await resend.emails.send({
        from: "VitrineFlash <notifications@proxi-saas.fr>",
        to: emailAdmin,
        subject: `🚀 Nouvelle demande d'essai gratuit : ${nomBoutique}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; padding: 20px; color: #18181b;">
            <h2 style="color: #d97706;">Nouveau commerçant intéressé par VitrineFlash ⚡</h2>
            <p>Une demande d'essai gratuit de 30 jours vient d'être soumise depuis <strong>proxi-saas.fr</strong> :</p>
            <ul style="line-height: 1.8;">
              <li><strong>Boutique :</strong> ${nomBoutique}</li>
              <li><strong>Ville :</strong> ${ville || "Non précisée"}</li>
              <li><strong>Téléphone :</strong> <a href="tel:${telephone}">${telephone}</a></li>
              <li><strong>Offre visée :</strong> ${offreChoisie || "Offre Promo 19 €/mois"}</li>
            </ul>
            <p style="font-size: 12px; color: #71717a;">
              Rappelez le commerçant sous 24h pour lui créer son slug et son affiche QR code.
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur API inscription-essai:", err);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'envoi. Veuillez réessayer." },
      { status: 500 }
    );
  }
}