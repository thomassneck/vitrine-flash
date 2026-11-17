"use client";

import React, { useState } from "react";

export default function LandingPageVitrineFlash() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"client" | "admin" | "bilan" | "reglages">("client");
  const [panierMoyen, setPanierMoyen] = useState(40);
  const [articlesSauves, setArticlesSauves] = useState(4);
  const [faqOuverte, setFaqOuverte] = useState<number | null>(null);
  const caAdditionnel = articlesSauves * panierMoyen;

  // 1. Nouvel état pour l'offre sélectionnée
  const [forfaitMensuel, setForfaitMensuel] = useState<number>(29); // 29 par défaut ou 19
  const gainNetAbonnement = caAdditionnel - forfaitMensuel;

  // 2. Calcul dynamique basé sur l'état
  const gainEstime = Math.round(articlesSauves * panierMoyen - forfaitMensuel);

  // Configuration directe des captures d'écran
  const ongletsData = {
    client: {
      src: "/screenshots/vitrine-cliente.png",
      alt: "Interface client Mazette boutique - Vitrine connectée 24/7",
      legend: "Ce que voient les passants et vos abonnés Instagram",
    },
    admin: {
      src: "/screenshots/mode-vendeuse.png",
      alt: "Interface administration commerçante - Mode Vendeuse en direct",
      legend: "Votre tableau de bord mobile : ajout express en 15 secondes",
    },
    bilan: {
      src: "/screenshots/bilan-soir.png",
      alt: "Modale bilan du soir - Remise en rayon des pièces expirées",
      legend: "Clôture de journée : remise en vitrine des réservations non retirées",
    },
    reglages: {
      src: "/screenshots/reglages.png",
      alt: "Réglages de la boutique - Configuration des fermetures, horaires et réservations",
      legend: "Paramètres sur-mesure : horaires limites, jours de fermeture et mode congés",
    },
  };

  const faqs = [
    {
      q: "Mes clientes doivent-elles payer en ligne ?",
      a: "Non, absolument pas. VitrineFlash est un outil drive-to-store piéton. La cliente réserve la pièce avec son prénom et son numéro de téléphone mobile pour la bloquer. Elle vient l'essayer ou la retirer et la régler en boutique sur votre terminal de caisse habituel.",
    },
    {
      q: "Est-ce compatible avec mon logiciel de caisse actuel ?",
      a: "Totalement. Vous n'avez aucun branchement ni passerelle bancaire à configurer. Quand un article est vendu, vous appuyez simplement sur « Vendu » sur votre smartphone pour le retirer de la vitrine.",
    },
    {
      q: "Que se passe-t-il si la cliente ne vient pas chercher la pièce ?",
      a: "Chaque réservation comporte une heure limite (ex. le lendemain à 14h ou à la fermeture en fonction du paramétrage). Dès l'échéance dépassée, la modale de Bilan du soir vous permet de remettre toutes les pièces en vitrine en un seul clic.",
    },
    {
      q: "Comment fonctionne l'offre promo à 19 €/mois ?",
      a: "Vous bénéficiez de 30 jours d'essai gratuit sans entrer de carte bancaire. Si vous validez la solution après cette période d'essai, votre abonnement reste verrouillé à 19 €/mois à vie (au lieu de 29 €), réservé aux boutiques adhérentes avant la date limite de la promo.",
    },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#070709] text-zinc-100 font-sans selection:bg-amber-400 selection:text-black overflow-x-clip">
      
      {/* CALQUE CONFINÉ POUR LES EFFETS LUMINEUX D'ARRIÈRE-PLAN */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/15 via-orange-500/10 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[850px] -right-32 w-[500px] h-[500px] bg-orange-600/10 blur-[160px] rounded-full" />
      </div>

      {/* HEADER NAVIGATION FLOTTANT */}
      <header className="sticky top-4 z-40 max-w-5xl mx-auto px-4 mt-2">
        <nav className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 rounded-2xl px-4 sm:px-5 py-3.5 flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-amber-500/20 shrink-0">
              ⚡
            </div>
            <span className="font-black text-base sm:text-lg tracking-tight text-white">
              Vitrine<span className="text-amber-400">Flash</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-zinc-400">
            <a href="#demo" className="hover:text-white transition">L&apos;Application</a>
            <a href="#fonctionnement" className="hover:text-white transition">Comment ça marche</a>
            <a href="#simulateur" className="hover:text-white transition">Simulateur</a>
            <a href="#tarifs" className="hover:text-white transition">Tarifs</a>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs py-2.5 px-3.5 sm:px-5 rounded-xl shadow-lg shadow-amber-400/20 active:scale-95 transition cursor-pointer shrink-0"
          >
            Tester 1 mois offert
          </button>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-14 sm:pt-16 pb-16 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] sm:text-xs font-medium mb-6 backdrop-blur-md max-w-full">
          <span className="text-amber-400 shrink-0">✦</span>
          <span>Drive-to-store piéton pour boutiques de pièces uniques &amp; déco</span>
        </div>

        <h1 className="w-full text-center text-[26px] sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.12] max-w-5xl mx-auto">
          <span className="block sm:inline">Faites vendre votre vitrine,</span>{" "}
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 mt-1 sm:mt-0">
            même quand votre rideau est baissé.
          </span>
        </h1>

        <p className="mt-6 text-zinc-400 text-sm sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed text-center">
          <i>
            Transformez chaque regard sur votre vitrine ou votre Instagram en visite en boutique dès le lendemain.{" "}
            <strong className="text-zinc-200">Vos clients réservent une pièce en 1 clic.</strong>{" "}
            Sans carte bancaire, zéro commission, 100% encaissé en boutique.
          </i>
        </p>

        <div className="mt-8 w-full flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-zinc-950 font-black text-sm sm:text-base shadow-xl shadow-orange-500/20 hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            Démarrer mon mois d&apos;essai gratuit →
          </button>
          <span className="text-xs text-zinc-500 font-medium text-center">
            Sans carte bancaire • Affiche QR Code A4 fournie • Prêt en 2 min
          </span>
        </div>
      </section>

      {/* DÉMONSTRATEUR AVEC LES 4 CAPTURES D'ÉCRAN */}
      <section id="demo" className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            Interface Réelle
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white mt-3">
            Découvrez l&apos;interface en situation réelle
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Cliquez sur les onglets pour voir les écrans réels de l&apos;application.
          </p>
        </div>

        {/* LES 4 ONGLETS */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-8">
          <button
            onClick={() => setActiveTab("client")}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "client"
                ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 font-black scale-102"
                : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <span>📱</span> 1. Vitrine client 24/7
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "admin"
                ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 font-black scale-102"
                : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <span>⚡</span> 2. Mode vendeuse en direct
          </button>
          <button
            onClick={() => setActiveTab("bilan")}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "bilan"
                ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 font-black scale-102"
                : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <span>🌙</span> 3. Bilan &amp; remise en rayon
          </button>
          <button
            onClick={() => setActiveTab("reglages")}
            className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "reglages"
                ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-400/20 font-black scale-102"
                : "bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5"
            }`}
          >
            <span>⚙️</span> 4. Paramètres &amp; Réglages
          </button>
        </div>

        {/* CHÂSSIS SMARTPHONE CONTENANT STRICTEMENT LA CAPTURE D'ÉCRAN */}
        <div className="relative max-w-[340px] sm:max-w-[380px] mx-auto">
          <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-orange-500/10 to-transparent blur-3xl rounded-[50px] pointer-events-none" />

          <div className="relative rounded-[48px] border-[6px] border-zinc-800 bg-zinc-950 p-2.5 shadow-2xl shadow-black/90">
            {/* Dynamic Island */}
            <div className="w-28 h-4 bg-zinc-900 rounded-full mx-auto mb-2 border border-white/5" />

            {/* ÉCRAN AFFICHANT LE SCREENSHOT SÉLECTIONNÉ */}
            <div className="bg-zinc-900 rounded-[36px] overflow-hidden relative shadow-inner">
              <img
                src={ongletsData[activeTab].src}
                alt={ongletsData[activeTab].alt}
                className="w-full h-auto max-h-[620px] object-cover object-top select-none transition-all duration-300"
              />
            </div>
          </div>

          {/* Légende descriptive sous le smartphone */}
          <p className="text-center text-xs text-zinc-400 mt-4 font-medium">
            {ongletsData[activeTab].legend}
          </p>
        </div>
      </section>

      {/* BENTO GRID DES 3 ATOUTS */}
      <section id="fonctionnement" className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <span className="text-3xl mb-4 block">📸</span>
            <h3 className="text-base font-bold text-white mb-2">Ajout en 10 secondes</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Une photo depuis votre smartphone, un prix, une taille. L&apos;article est immédiatement visible sur votre vitrine et prêt à être partagé en story.
            </p>
          </div>

          <div className="bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-6 backdrop-blur-md">
            <span className="text-3xl mb-4 block">🔒</span>
            <h3 className="text-base font-bold text-amber-300 mb-2">Bloqué sans carte bancaire</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Zéro abandon au checkout. Les clientes réservent avec leur prénom et leur numéro de mobile. Elles essayent et règlent en magasin sur votre terminal habituel.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
            <span className="text-3xl mb-4 block">🌙</span>
            <h3 className="text-base font-bold text-white mb-2">Clôture du soir en 1 clic</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Une cliente n&apos;est pas passée ? Le bouton Bilan identifie les articles expirés et vous permet de les remettre instantanément en vitrine pour les passants du soir, après fermeture.
            </p>
          </div>
        </div>
      </section>

      {/* SIMULATEUR FINANCIER DYNAMIQUE */}
      <section id="simulateur" className="py-20 bg-zinc-950 border-y border-white/5">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Rentabilité Immédiate
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Combien vous rapporte votre vitrine la nuit ?
            </h2>
            <p className="text-zinc-400 text-xs sm:text-sm">
              Seulement 2 pièces réservées hors horaires d&apos;ouverture rentabilisent votre abonnement.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setForfaitMensuel(19)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                forfaitMensuel === 19
                  ? "bg-amber-400 text-zinc-950 shadow-sm font-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              Promo (19 €/mois)
            </button>
            <button
              type="button"
              onClick={() => setForfaitMensuel(29)}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                forfaitMensuel === 29
                  ? "bg-amber-400 text-zinc-950 shadow-sm font-black"
                  : "bg-zinc-800 text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              Standard (29 €/mois)
            </button>
          </div>

          <div className="bg-zinc-900/90 border border-white/10 rounded-3xl p-6 sm:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center shadow-2xl">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-300">Prix moyen d&apos;un article</span>
                  <span className="text-amber-400 text-sm font-black">{panierMoyen} €</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={panierMoyen}
                  onChange={(e) => setPanierMoyen(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-300">Articles sauvés hors ouverture / mois</span>
                  <span className="text-amber-400 text-sm font-black">{articlesSauves} pièces</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={articlesSauves}
                  onChange={(e) => setArticlesSauves(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            <div className="bg-[#0A0A0C] border border-amber-500/20 rounded-2xl p-6 text-center space-y-2 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Gain net additionnel estimé
              </span>
              <p className={`text-4xl sm:text-5xl font-black ${gainNetAbonnement >= 0 ? "text-amber-400" : "text-red-400"}`}>
                {gainNetAbonnement > 0 ? `+${gainNetAbonnement}` : gainNetAbonnement} €{" "}
                <span className="text-xs text-zinc-400 font-normal">/ mois</span>
              </p>
              <p className="text-[11px] text-zinc-400 pt-1">
                Soit <strong className="text-zinc-200">{caAdditionnel} €</strong> de ventes générées − {forfaitMensuel} € d&apos;abonnement.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION TARIFS & ESSAI GRATUIT (HIÉRARCHIE CLAIRE) */}
      <section id="tarifs" className="py-20 max-w-4xl mx-auto px-4">
        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            Testez gratuitement • 0 % de commission
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm">
            Tout ce qui est vendu en boutique vous revient à 100 %. Aucun pourcentage prélevé.
          </p>
        </div>

        {/* ÉTAPE 1 : L'ACTION IMMÉDIATE (0 € PENDANT 30 JOURS) */}
        <div className="bg-gradient-to-br from-amber-400/15 via-zinc-900 to-zinc-950 border-2 border-amber-400 rounded-3xl p-8 sm:p-10 text-center shadow-2xl relative mb-10">
          <span className="inline-block bg-amber-400 text-zinc-950 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full mb-4">
            Étape 1 • Sans engagement
          </span>
          
          <h3 className="text-2xl sm:text-3xl font-black text-white">
            Obtenez l'application gratuitement pendant 30 jours
          </h3>
          
          <div className="my-4 flex items-baseline justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-black text-amber-400">0 €</span>
            <span className="text-sm text-zinc-300 font-semibold">le premier mois complet</span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto mb-6 leading-relaxed">
            Aucune carte bancaire demandée à l'inscription. Nous créons votre vitrine et vous recevez votre affiche QR code prête à poser en boutique.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto px-10 py-4 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-amber-400/20 transition cursor-pointer"
          >
            Démarrer mon mois gratuit maintenant →
          </button>
        </div>

        {/* ÉTAPE 2 : CE QUI SE PASSE ENSUITE (TRANSPARENCE SUR L'ABONNEMENT) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* OFFRE PROMO */}
          <div className="bg-gradient-to-b from-zinc-900 to-[#0A0A0C] border-2 border-amber-400 rounded-3xl p-8 relative shadow-2xl flex flex-col justify-between">
            <span className="absolute -top-3.5 right-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[12px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
              Offre valable jusqu'au 31/01/2027
            </span>

            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">Offre Promo de lancement</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Tarif préférentiel garanti <b>à vie</b></p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">19 €</span>
                <span className="text-xs text-zinc-400 font-medium">/ mois</span>
              </div>

              <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3 text-xs font-bold text-amber-300">
                🎁 1 mois d&apos;essai gratuit sans carte bancaire et sans engagement
              </div>

              <ul className="text-xs text-zinc-400 space-y-2.5 pt-2">
                <li>✓ Vitrine connectée 24h/24 sans limite d&apos;articles</li>
                <li>✓ QR code vitrine prêt à imprimer</li>
                <li>✓ Mode vendeuse express &amp; Clôture du soir</li>
                <li>✓ Alertes Mail, SMS &amp; WhatsApp incluses</li>
                <li>✓ Support client dédié </li>
                <li>✓ Tarif bloqué à 19 € pour toujours</li>
              </ul>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="w-full mt-8 bg-amber-400 hover:bg-amber-300 active:scale-95 text-zinc-950 font-black text-sm py-4 rounded-2xl shadow-xl transition cursor-pointer"
            >
              Obtenez l'application à 19 €/mois
            </button>
          </div>

          {/* OFFRE STANDARD */}
          <div className="bg-zinc-900/50 border border-white/25 rounded-3xl p-8 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">Offre Standard</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Après l'offre promotionnelle</p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-white">29 €</span>
                <span className="text-xs text-zinc-400 font-medium">/ mois</span>
              </div>

              <div className="bg-white/ border border-white/25 rounded-xl p-3 text-xs font-bold text-zinc-300">
                🎁 1 mois d&apos;essai gratuit sans carte bancaire et sans engagement
              </div>

              <ul className="text-xs text-zinc-400 space-y-2.5 pt-2">
                <li>✓ Vitrine connectée 24h/24 sans limite d&apos;articles</li>
                <li>✓ QR code vitrine prêt à imprimer</li>
                <li>✓ Mode vendeuse express &amp; Clôture du soir</li>
                <li>✓ Alertes Mail, SMS &amp; WhatsApp incluses</li>
                <li>✓ Support client dédié</li>
              </ul>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="w-full mt-8 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm py-4 rounded-2xl transition cursor-pointer"
            >
              Démarrer l&apos;essai standard
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 max-w-3xl mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white">Questions fréquentes</h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">Tout ce que vous devez savoir pour démarrer sans risque.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <div key={i} className="border border-white/10 bg-zinc-900/50 rounded-2xl overflow-hidden">
              <button
                onClick={() => setFaqOuverte(faqOuverte === i ? null : i)}
                className="w-full px-5 py-4 text-left font-bold text-xs sm:text-sm text-white flex justify-between items-center hover:bg-white/5 transition cursor-pointer"
              >
                <span>{f.q}</span>
                <span className="text-amber-400 font-bold ml-2">{faqOuverte === i ? "−" : "+"}</span>
              </button>
              {faqOuverte === i && (
                <div className="px-5 py-4 bg-black/40 text-xs text-zinc-300 leading-relaxed border-t border-white/5">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 text-center text-xs text-zinc-500 px-4">
        <p>© 2026 VitrineFlash. Développé pour valoriser les boutiques indépendantes et le commerce de centre-ville.</p>
      </footer>

      {/* MODALE D'INSCRIPTION */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-sm rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400">Offre</span>
                <h3 className="font-bold text-white text-base">Tester 30 jours gratuitement</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-zinc-400">
              Recevez votre lien vitrine et votre affiche QR code prête à poser sous 24h. Aucune carte bancaire requise.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("✨ Merci ! Nous préparons votre vitrine de démonstration.");
                setModalOpen(false);
              }}
              className="space-y-3"
            >
              <input
                type="text"
                required
                placeholder="Nom de votre boutique (ex: Mazette)"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
              />
              <input
                type="tel"
                required
                placeholder="Téléphone mobile professionnel (06/07)"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 cursor-pointer mt-2"
              >
                Activer mon mois d&apos;essai gratuit
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}