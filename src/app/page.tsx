import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";

export const metadata: Metadata = {
  title: "VitrineFlash | Faites vendre votre vitrine physique même rideau baissé",
  description:
    "Solution drive-to-store piéton pour boutiques de pièces uniques, prêt-à-porter et déco. Vos clients réservent en 1 clic sans carte bancaire et règlent en boutique. 0% de commission.",
  alternates: {
    canonical: "https://proxi-saas.fr",
  },
  openGraph: {
    title: "VitrineFlash | Digitalisez votre vitrine de magasin en 15 secondes",
    description:
      "Transformez chaque regard sur votre vitrine ou votre Instagram en visite en boutique dès le lendemain. Sans carte bancaire, zéro commission.",
    url: "https://proxi-saas.fr",
    siteName: "VitrineFlash",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VitrineFlash | Solution Drive-to-Store pour boutiques indépendantes",
    description:
      "Permettez aux passants du soir de réserver vos pièces uniques 24h/24 sans paiement en ligne.",
  },
};

export default function HomePage() {
  const jsonLdSoftware = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "VitrineFlash",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, iOS, Android",
    url: "https://proxi-saas.fr",
    offers: [
      {
        "@type": "Offer",
        name: "Offre Promo de lancement",
        price: "19.00",
        priceCurrency: "EUR",
        priceValidUntil: "2027-01-31",
      },
      {
        "@type": "Offer",
        name: "Offre Standard",
        price: "29.00",
        priceCurrency: "EUR",
      },
    ],
    description:
      "Outil SaaS drive-to-store permettant aux boutiques physiques de faire réserver leurs articles en vitrine 24h/24 sans carte bancaire ni commission.",
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Mes clients doivent-ils payer en ligne ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non, absolument pas. VitrineFlash est un outil drive-to-store piéton. Le client réserve la pièce avec son prénom et son numéro de téléphone mobile pour la bloquer. Il vient l'essayer ou la retirer et la régler en boutique sur votre terminal de caisse habituel.",
        },
      },
      {
        "@type": "Question",
        name: "Est-ce compatible avec mon logiciel de caisse actuel ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Totalement. Vous n'avez aucun branchement ni passerelle bancaire à configurer. Quand un article est vendu, vous appuyez simplement sur « Vendu » sur votre smartphone pour le retirer de la vitrine.",
        },
      },
      {
        "@type": "Question",
        name: "Que se passe-t-il si le client ne vient pas chercher la pièce ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chaque réservation comporte une heure limite (ex. le lendemain à 14h ou à la fermeture en fonction du paramétrage). Dès l'échéance dépassée, la modale de Bilan du soir vous permet de remettre toutes les pièces en vitrine en un seul clic.",
        },
      },
      {
        "@type": "Question",
        name: "Comment fonctionne l'offre promo à 19 €/mois ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Vous bénéficiez de 30 jours d'essai gratuit sans entrer de carte bancaire. Si vous validez la solution après cette période d'essai, votre abonnement reste verrouillé à 19 €/mois à vie (au lieu de 29 €), réservé aux boutiques adhérentes avant la date limite de la promo.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <LandingPageClient />
    </>
  );
}