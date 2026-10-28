"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ContenuVitrine() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modale de zoom/détail de l'article
  const [articleApercu, setArticleApercu] = useState(null);

  // Modale du formulaire de réservation
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Modale du ticket de réservation
  const [ticketConfirmation, setTicketConfirmation] = useState(null);

  // Chargement des données
  const chargerBoutiqueEtArticles = async () => {
    const { data: dataBoutique } = await supabase
      .from("boutiques")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (dataBoutique) {
      setBoutique(dataBoutique);

      const { data: dataArticles } = await supabase
        .from("articles")
        .select("*")
        .eq("boutique_id", dataBoutique.id)
        .neq("statut", "vendu")
        .order("created_at", { ascending: false });

      setArticles(dataArticles || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!slug) return;
    chargerBoutiqueEtArticles();
  }, [slug]);

  // Envoi de la réservation
  const lancerReservation = async (canal) => {
    if (!prenom.trim() || !telephone.trim()) {
      alert("Merci d'indiquer votre prénom et votre numéro de mobile 😊");
      return;
    }

    setEnvoiEnCours(true);

    try {
      const res = await fetch("/api/reserver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleSelectionne.id,
          prenom: prenom.trim(),
          telephone: telephone.trim(),
          canal: canal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      const { codeResa, heureFin } = data;

      // Met à jour la grille pour marquer l'article comme réservé
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleSelectionne.id ? { ...a, statut: "confirme" } : a
        )
      );

      const telPro = boutique.telephone_pro || "";
      const texte = `Bonjour ${boutique.nom} ! C'est ${prenom} (${telephone}). Je souhaite mettre de côté : "${articleSelectionne.titre}" (${articleSelectionne.taille} - ${articleSelectionne.prix} €) jusqu'à ${heureFin} (Réf: #${codeResa}).`;
      const texteEncode = encodeURIComponent(texte);

      const lienAction =
        canal === "whatsapp"
          ? `https://wa.me/${telPro.replace("+", "")}?text=${texteEncode}`
          : `sms:${telPro}?&body=${texteEncode}`;

      setTicketConfirmation({
        codeResa,
        heureFin,
        titre: articleSelectionne.titre,
        taille: articleSelectionne.taille,
        prix: articleSelectionne.prix,
        lienAction,
        canal,
      });

      setArticleSelectionne(null);
      setPrenom("");
      setTelephone("");
    } catch (e) {
      alert("Erreur lors de la réservation : " + e.message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-sans">
        Chargement de la vitrine...
      </div>
    );
  }

  if (!boutique) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-sans">
        Boutique introuvable.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-20 font-sans">
      {/* EN-TÊTE VITRINE CENTRÉ */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 px-4 py-4 text-center shadow-xs">
        <div className="max-w-md mx-auto flex flex-col items-center">
          <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1">
            ✨ Vitrine connectée 24/7
          </span>
          <h1 className="text-2xl font-bold text-stone-900 leading-tight">
            {boutique.nom}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Réservez gratuitement en 1 clic • Essayez et payez en boutique
          </p>
        </div>
      </header>

      {/* GRILLE DES ARTICLES */}
      <main className="max-w-md mx-auto px-3 pt-4">
        {articles.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            Aucun article en vitrine pour l'instant.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {articles.map((article) => {
              const estReserve =
                article.statut === "confirme" ||
                (article.statut === "pre_reserve" &&
                  new Date(article.pre_reserve_jusqua) > new Date());

              return (
                <div
                  key={article.id}
                  className="bg-white rounded-3xl overflow-hidden shadow-xs border border-stone-200/80 flex flex-col justify-between"
                >
                  {/* ZONE PHOTO + CLIC POUR ZOOM */}
                  <div
                    onClick={() => setArticleApercu(article)}
                    className="relative aspect-3/4 bg-stone-100 cursor-pointer group"
                    title="Cliquer pour agrandir"
                  >
                    <img
                      src={article.photo_url}
                      alt={article.titre}
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                    />

                    {/* Badge Taille */}
                    <span className="absolute top-2.5 left-2.5 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      {article.taille}
                    </span>

                    {/* Icône discrète loupe */}
                    <span className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-xs text-stone-700 w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-xs opacity-75 group-hover:opacity-100 transition">
                      🔍
                    </span>

                    {/* Voile si réservé */}
                    {estReserve && (
                      <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 text-center">
                        <span className="bg-amber-400 text-stone-950 font-black text-xs uppercase px-2.5 py-1.5 rounded-xl shadow-md">
                          Déjà en cabine 🔒
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ZONE INFOS : TITRE SUR 2 LIGNES + PRIX */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Affichage sur 2 lignes maximum avec line-clamp-2 */}
                      <h3
                        onClick={() => setArticleApercu(article)}
                        className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-amber-700 transition"
                        title={article.titre}
                      >
                        {article.titre}
                      </h3>
                      <p className="font-extrabold text-stone-950 text-base mt-1">
                        {article.prix} €
                      </p>
                    </div>

                    {/* BOUTON D'ACTION */}
                    <div className="mt-3">
                      {estReserve ? (
                        <button
                          disabled
                          className="w-full bg-stone-100 text-stone-400 font-bold text-xs py-2.5 rounded-xl cursor-not-allowed"
                        >
                          Mis de côté
                        </button>
                      ) : (
                        <button
                          onClick={() => setArticleSelectionne(article)}
                          className="w-full bg-stone-900 hover:bg-stone-800 active:scale-97 transition text-white font-bold text-xs py-2.5 rounded-xl shadow-xs cursor-pointer"
                        >
                          Mettre de côté (24h)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 1. MODALE ZOOM / GRAND FORMAT (CLIC EN FOND POUR REVENIR À LA VITRINE) */}
      {articleApercu && (
        <div
          onClick={() => setArticleApercu(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
          >
            {/* Bouton Fermer */}
            <button
              onClick={() => setArticleApercu(null)}
              className="absolute top-3 right-3 z-10 bg-stone-900/70 hover:bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition"
              title="Fermer"
            >
              ✕
            </button>

            {/* Photo Agrandie */}
            <div className="relative aspect-3/4 bg-stone-100 overflow-hidden">
              <img
                src={articleApercu.photo_url}
                alt={articleApercu.titre}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-lg">
                Taille : {articleApercu.taille}
              </span>
            </div>

            {/* Détails complets sans coupure */}
            <div className="p-5 overflow-y-auto">
              <h2 className="text-lg font-black text-stone-900 leading-tight">
                {articleApercu.titre}
              </h2>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {articleApercu.prix} €
              </p>

              <div className="mt-4 pt-3 border-t border-stone-100 flex gap-2">
                <button
                  onClick={() => setArticleApercu(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-3 rounded-xl cursor-pointer"
                >
                  ← Retour vitrine
                </button>

                {articleApercu.statut === "disponible" && (
                  <button
                    onClick={() => {
                      const cible = articleApercu;
                      setArticleApercu(null);
                      setArticleSelectionne(cible);
                    }}
                    className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-3 rounded-xl shadow-md cursor-pointer"
                  >
                    Mettre de côté ✨
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODALE FORMULAIRE DE RÉSERVATION */}
      {articleSelectionne && (
        <div
          onClick={() => setArticleSelectionne(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Bloquer pour essayage
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  {articleSelectionne.titre}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setArticleSelectionne(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-3 bg-stone-50 p-3 rounded-2xl">
              <img
                src={articleSelectionne.photo_url}
                alt={articleSelectionne.titre}
                className="w-12 h-14 object-cover rounded-xl shrink-0"
              />
              <div className="text-xs">
                <p className="font-bold text-stone-900">
                  {articleSelectionne.taille} • {articleSelectionne.prix} €
                </p>
                <p className="text-stone-500">
                  Mise de côté gratuite jusqu'à demain.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Votre prénom :
                </label>
                <input
                  type="text"
                  placeholder="Ex: Camille"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Votre mobile (pour recevoir le SMS du ticket) :
                </label>
                <input
                  type="tel"
                  placeholder="Ex: 06 12 34 56 78"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900"
                />
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={envoiEnCours}
                onClick={() => lancerReservation("sms")}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm py-3 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {envoiEnCours ? "Blocage en cours..." : "🔒 Confirmer ma réservation (SMS)"}
              </button>

              <button
                type="button"
                disabled={envoiEnCours}
                onClick={() => lancerReservation("whatsapp")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                🟢 Confirmer via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODALE TICKET DE CONFIRMATION */}
      {ticketConfirmation && (
        <div
          onClick={() => setTicketConfirmation(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in zoom-in-95"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center"
          >
            <span className="text-3xl mb-2 block">🎉</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              C'est mis de côté !
            </span>

            <h3 className="text-xl font-black text-stone-900 mt-3 mb-1">
              Réservation confirmée
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Votre pièce est gardée en cabine chez <strong>{boutique.nom}</strong>[cite: 2].
            </p>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 mb-4 text-left space-y-1.5">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-xs text-stone-500">Votre référence :</span>
                <span className="text-sm font-black font-mono bg-stone-900 text-amber-300 px-2.5 py-0.5 rounded-lg">
                  #{ticketConfirmation.codeResa}
                </span>
              </div>
              <p className="text-xs text-stone-800 font-semibold pt-1">
                👗 {ticketConfirmation.titre} ({ticketConfirmation.taille})
              </p>
              <p className="text-xs text-stone-600">
                💰 {ticketConfirmation.prix} € (à régler sur place)
              </p>
              <p className="text-xs text-amber-700 font-medium">
                ⏳ Bloqué jusqu'à <strong>{ticketConfirmation.heureFin}</strong>
              </p>
            </div>

            <a
              href={ticketConfirmation.lienAction}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md mb-2 ${
                ticketConfirmation.canal === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-stone-900 hover:bg-stone-800"
              }`}
            >
              <span>{ticketConfirmation.canal === "whatsapp" ? "🟢" : "💬"}</span>
              Prévenir {boutique.nom} par {ticketConfirmation.canal === "whatsapp" ? "WhatsApp" : "SMS"}
            </a>

            <button
              onClick={() => setTicketConfirmation(null)}
              className="w-full py-2 text-xs text-stone-400 hover:text-stone-700 font-medium cursor-pointer"
            >
              Fermer et retourner à la vitrine
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageVitrine() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans text-stone-400">
          Chargement de la vitrine...
        </div>
      }
    >
      <ContenuVitrine />
    </Suspense>
  );
}