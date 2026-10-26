"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ContenuVitrine() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // États pour la fenêtre (modale) de réservation
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState(""); // <-- NOUVEAU : État pour le téléphone
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // 👉 AJOUTER ICI : État pour mémoriser et afficher le ticket de confirmation
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

  const estArticleReserve = (article) => {
    if (article.statut === "confirme") return true;
    if (article.statut === "pre_reserve" && article.pre_reserve_jusqua) {
      return new Date(article.pre_reserve_jusqua) > new Date();
    }
    return false;
  };

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

      const { codeResa, heureFin } = await res.json();

      // Met à jour la grille pour griser l'article
      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleSelectionne.id
            ? { ...a, statut: "confirme" }
            : a
        )
      );

      // Préparation du message pré-rempli pour Marion
      const telPro = boutique.telephone_pro;
      const texte = `Bonjour ${boutique.nom} ! C'est ${prenom} (${telephone}). Je souhaite mettre de côté : "${articleSelectionne.titre}" (${articleSelectionne.taille} - ${articleSelectionne.prix}€) jusqu'à ${heureFin} (Réf: #${codeResa}).`;
      const texteEncode = encodeURIComponent(texte);

      const lienAction =
        canal === "whatsapp"
          ? `https://wa.me/${telPro.replace("+", "")}?text=${texteEncode}`
          : `sms:${telPro}?&body=${texteEncode}`;

      // 👉 AU LIEU DE FAIRE window.location.href IMMÉDIAT :
      // On mémorise le ticket pour l'afficher à l'écran
      setTicketConfirmation({
        codeResa,
        heureFin,
        titre: articleSelectionne.titre,
        taille: articleSelectionne.taille,
        prix: articleSelectionne.prix,
        lienAction,
        canal,
      });

      // On ferme la fenêtre de saisie
      setArticleSelectionne(null);
      setPrenom("");
      setTelephone("");
    } catch (e) {
      alert("Erreur lors de la réservation. Veuillez réessayer.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement de la vitrine...</div>;
  }

  if (!boutique) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Boutique introuvable.</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-12 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 text-center border-b border-stone-100">
        <span className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full mb-1">
          ✨ Vitrine Connectée 24/7
        </span>
        <h1 className="text-2xl font-bold text-stone-900">{boutique.nom}</h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Réservez gratuitement en 1 clic • Essayez et payez en boutique
        </p>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {articles.map((article) => {
            const reserve = estArticleReserve(article);

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/5] bg-stone-200">
                    <img
                      src={article.photo_url}
                      alt={article.titre}
                      className={`w-full h-full object-cover ${reserve ? "opacity-50 grayscale-[30%]" : ""}`}
                    />
                    <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                      {article.taille}
                    </span>
                    {reserve && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <span className="bg-white text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full shadow">
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
                      className="w-full bg-stone-900 hover:bg-stone-800 active:scale-95 transition text-white text-xs font-semibold py-2.5 px-3 rounded-xl shadow-sm"
                    >
                      Mettre de côté (24h)
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-stone-100 text-stone-400 text-xs font-medium py-2.5 px-3 rounded-xl cursor-not-allowed"
                    >
                      Réservé jusqu'à 18h
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

{/* NOUVELLE MODALE : TICKET DE CONFIRMATION AVEC LE CODE #BM-XXX */}
      {ticketConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95">
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

            {/* LE TICKET AVEC LA RÉFÉRENCE */}
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

            {/* BOUTON OPTIONNEL POUR ENVOYER LE MESSAGE */}
            <a
              href={ticketConfirmation.lienAction}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md mb-2 ${
                ticketConfirmation.canal === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-stone-900 hover:bg-stone-800"
              }`}
            >
              <span>{ticketConfirmation.canal === "whatsapp" ? "🟢" : "💬"}</span>
              Prévenir Marion par {ticketConfirmation.canal === "whatsapp" ? "WhatsApp" : "SMS"}
            </a>

            <button
              onClick={() => setTicketConfirmation(null)}
              className="w-full py-2 text-xs text-stone-400 hover:text-stone-700 font-medium"
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-500">Chargement de la page...</div>}>
      <ContenuVitrine />
    </Suspense>
  );
}