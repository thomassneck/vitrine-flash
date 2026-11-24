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
      q: "Mes clients doivent-ils payer en ligne ?",
      a: "Non, absolument pas. VitrineFlash est un outil drive-to-store piéton. Le client réserve la pièce avec son prénom et son numéro de téléphone mobile pour la bloquer. Elle vient l'essayer ou la retirer et la régler en boutique sur votre terminal de caisse habituel.",
    },
    {
      q: "Est-ce compatible avec mon logiciel de caisse actuel ?",
      a: "Totalement. Vous n'avez aucun branchement ni passerelle bancaire à configurer. Quand un article est vendu, vous appuyez simplement sur « Vendu » sur votre smartphone pour le retirer de la vitrine.",
    },
    {
      q: "Que se passe-t-il si le client ne vient pas chercher la pièce ?",
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
        <h1 className="w-full text-center text-[26px] sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.12] max-w-5xl mx-auto">
          <span className="block sm:inline">En construction</span>{" "}
        </h1>

      </section>

    </div>
  );
}