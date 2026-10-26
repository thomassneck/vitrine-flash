"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ContenuVitrine() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modale de saisie
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // Modale de succès (Ticket de confirmation)
  const [ticketConfirmation, setTicketConfirmation] = useState(null);

  useEffect(() => {
    if (!slug) return;

    async function chargerVitrine() {
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
    }

    chargerVitrine();
  }, [slug]);

  // Vérifie si l'article est indisponible
  const estArticleReserve = (article) => {
    if (article.statut === "confirme") return true;
    if (article.statut === "pre_reserve" && article.pre_reserve_jusqua) {
      return new Date(article.pre_reserve_jusqua) > new Date();
    }
    return false;
  };

  // Envoi de la réservation vers le serveur
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

      if (!res.ok) {
        throw new Error(data.error || "Erreur serveur");
      }

      const { codeResa, heureFin } = data;

      // Grise immédiatement l'article sur la grille
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleSelectionne.id
            ? { ...a, statut: "confirme" }
            : a
        )
      );

      // Préparation du message SMS / WhatsApp
      const telPro = boutique.telephone_pro;
      const texte = `Bonjour ${boutique.nom} ! C'est ${prenom.trim()} (${telephone.trim()}). Je souhaite mettre de côté : "${articleSelectionne.titre}" (${articleSelectionne.taille} - ${articleSelectionne.prix}€) jusqu'à ${heureFin} (Réf: #${codeResa}).`;
      const texteEncode = encodeURIComponent(texte);

      const lienAction =
        canal === "whatsapp"
          ? `https://wa.me/${telPro.replace("+", "")}?text=${texteEncode}`
          : `sms:${telPro}?&body=${texteEncode}`;

      // Affiche le ticket de confirmation à l'écran
      setTicketConfirmation({
        codeResa,
        heureFin,
        titre: articleSelectionne.titre,
        taille: articleSelectionne.taille,
        prix: articleSelectionne.prix,
        lienAction,
        canal,
      });

      // Ferme la fenêtre de saisie et nettoie le formulaire
      setArticleSelectionne(null);
      setPrenom("");
      setTelephone("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la réservation. Veuillez réessayer.");
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
    <div className="min-h-screen bg-stone-50 pb-12 font-sans">
      {/* EN-TÊTE DE LA VITRINE */}
      <header className="bg-white shadow-xs sticky top-0 z-10 px-4 py-4 text-center border-b border-stone-100">
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1">
          ✨ Vitrine Connectée 24/7
        </span>
        <h1 className="text-2xl font-bold text-stone-900">{boutique.nom}</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Réservez gratuitement en 1 clic • Essayez et payez en boutique
        </p>
      </header>

      {/* GRILLE DES PÉPITES */}
      <main className="max-w-md mx-auto px-3 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {articles.map((article) => {
            const reserve = estArticleReserve(article);

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-stone-100 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/5] bg-stone-200">
                    <img
                      src={article.photo_url}
                      alt={article.titre}
                      className={`w-full h-full object-cover ${
                        reserve ? "opacity-50 grayscale-[30%]" : ""
                      }`}
                    />
                    <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      {article.taille}
                    </span>
                    {reserve && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="bg-white text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                          🔒 Déjà en cabine
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h2 className="text-sm font-medium text-stone-800 line-clamp-1">
                      {article.titre}
                    </h2>
                    <p className="text-lg font-extrabold text-stone-900 mt-0.5">
                      {article.prix} €
                    </p>
                  </div>
                </div>

                <div className="px-3 pb-3">
                  {!reserve ? (
                    <button
                      onClick={() => setArticleSelectionne(article)}
                      className="w-full bg-stone-900 hover:bg-stone-800 active:scale-95 transition text-white text-xs font-semibold py-2.5 px-3 rounded-xl shadow-xs cursor-pointer"
                    >
                      Mettre de côté (24h)
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-stone-100 text-stone-400 text-xs font-medium py-2.5 px-3 rounded-xl cursor-not-allowed"
                    >
                      Déjà réservé
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* 1. MODALE DE SAISIE CLIENTE */}
      {articleSelectionne && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Mise de côté gratuite
                </span>
                <h3 className="text-lg font-bold text-stone-900">
                  {articleSelectionne.titre} ({articleSelectionne.prix} €)
                </h3>
              </div>
              <button
                onClick={() => setArticleSelectionne(null)}
                className="text-stone-400 hover:text-stone-600 text-xl font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              Nous mettons cette pièce de côté en cabine <strong>le temps de votre passage</strong>. Sans engagement et sans paiement en ligne !
            </p>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Votre prénom (pour l'étiquette en cabine) :
              </label>
              <input
                type="text"
                placeholder="Ex: Julie"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                autoFocus
                className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Votre numéro de mobile :
              </label>
              <input
                type="tel"
                placeholder="Ex: 06 12 34 56 78"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => lancerReservation("sms")}
                disabled={envoiEnCours}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <span>💬</span> {envoiEnCours ? "Enregistrement..." : "Bloquer la pièce par SMS"}
              </button>

              <button
                onClick={() => lancerReservation("whatsapp")}
                disabled={envoiEnCours}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <span>🟢</span> {envoiEnCours ? "Enregistrement..." : "Bloquer via WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODALE TICKET DE CONFIRMATION (#BM-XXX) */}
      {ticketConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center">
            <span className="text-3xl mb-2 block">🎉</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              C'est mis de côté !
            </span>

            <h3 className="text-xl font-black text-stone-900 mt-3 mb-1">
              Réservation confirmée
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Votre pièce est gardée en cabine chez <strong>{boutique.nom}</strong>.
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
              Ouvrir {ticketConfirmation.canal === "whatsapp" ? "WhatsApp" : "mon SMS"} pour Marion
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

export default function VitrineCliente() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-stone-500 font-sans">
          Chargement de la page...
        </div>
      }
    >
      <ContenuVitrine />
    </Suspense>
  );
}