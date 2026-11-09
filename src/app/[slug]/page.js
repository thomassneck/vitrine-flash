"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function calculerDelaiAffichage(dateCreationISO, heureCloture = "19h00") {
  if (!dateCreationISO) return heureCloture;

  const dateResa = new Date(dateCreationISO);
  const dateResaFr = new Date(dateResa.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const heure = dateResaFr.getHours();
  const jour = dateResaFr.getDay();

  // 1. Réservé le matin (< 14h) du mardi au samedi
  if (heure < 14 && jour !== 0 && jour !== 1) {
    return `ce soir ${heureCloture}`;
  }

  // 2. Samedi après 14h ou Dimanche
  if (jour === 0 || (jour === 6 && heure >= 14)) {
    return "mardi 14h00";
  }

  // 3. Lundi (fermeture)
  if (jour === 1) {
    return `mardi ${heureCloture}`;
  }

  // 4. Après 14h en semaine (ex: 15h35)
  return "demain 14h00";
}

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

  // Réservations actives
  const [reservations, setReservations] = useState([]);

  // États pour la modale liste d'attente
  const [articleAttente, setArticleAttente] = useState(null);
  const [prenomAttente, setPrenomAttente] = useState("");
  const [emailAttente, setEmailAttente] = useState("");
  const [chargementAttente, setChargementAttente] = useState(false);

  const chargerBoutiqueEtArticles = async () => {
  const { data: dataBoutique } = await supabase
    .from("boutiques")
    .select(`
      id,
      nom,
      slug,
      telephone_pro,
      email,
      max_articles_par_cliente,
      heure_fermeture_soir,
      en_pause,
      message_pause,
      message_annonce,
      jours_fermeture
    `)
    .eq("slug", slug)
    .maybeSingle();

    if (dataBoutique) {
      setBoutique(dataBoutique);

      const { data: dataArticles } = await supabase
        .from("articles")
        .select("id, boutique_id, titre, taille, prix, photo_url, statut, created_at")
        .eq("boutique_id", dataBoutique.id)
        .neq("statut", "vendu")
        .order("created_at", { ascending: false });

      setArticles(dataArticles || []);

      if (dataArticles && dataArticles.length > 0) {
        const idsArticles = dataArticles.map((a) => a.id);
        const { data: dataResas } = await supabase
          .from("reservations")
          .select("id, article_id, created_at, statut")
          .in("article_id", idsArticles)
          .neq("statut", "annulee")
          .order("created_at", { ascending: false });

        setReservations(dataResas || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!slug) return;
    chargerBoutiqueEtArticles();
  }, [slug]);

    const validerListeAttente = async (e) => {
    e.preventDefault();
    if (!prenomAttente.trim() || !emailAttente.trim()) {
      alert("Merci d'indiquer votre prénom et votre e-mail.");
      return;
    }

    setChargementAttente(true);
    try {
      const res = await fetch("/api/liste-attente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleAttente.id,
          prenom: prenomAttente.trim(),
          email: emailAttente.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");

      alert("✨ C'est noté ! Vous recevrez un e-mail prioritaire si cette pièce se libère.");
      setArticleAttente(null);
      setPrenomAttente("");
      setEmailAttente("");
    } catch (err) {
      alert(err.message);
    } finally {
      setChargementAttente(false);
    }
  };

  // Envoi de la réservation
  const lancerReservation = async (canal) => {
    const telNettoye = telephone.replace(/[\s.-]/g, "");
    const regexMobileFr = /^0[67]\d{8}$/;

    if (!prenom.trim()) {
      alert("Merci d'indiquer votre prénom 😊");
      return;
    }

    if (!regexMobileFr.test(telNettoye)) {
      alert("Merci d'indiquer un numéro de portable valide (commençant par 06 ou 07)");
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
          telephone: telNettoye,
          canal: canal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      const { codeResa, heureFin } = data;

      setArticles((prev) =>
        prev.map((a) =>
          a.id === articleSelectionne.id ? { ...a, statut: "confirme" } : a
        )
      );

      const telPro = boutique.telephone_pro || "";
      const texte = `Bonjour ${boutique.nom} ! C'est ${prenom} (${telNettoye}). Je souhaite mettre de côté : "${articleSelectionne.titre}" (${articleSelectionne.taille} - ${formaterPrix(articleSelectionne.prix)} €) jusqu'à ${heureFin} (Réf: #${codeResa}).`;
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

      {/* BANDEAU D'ANNONCE VITRINE */}
      {boutique?.message_annonce && (
        <div className="max-w-md mx-auto mt-3 mx-3 px-4 py-2.5 bg-stone-900 text-white rounded-2xl text-center shadow-xs flex items-center justify-center gap-2">
          <span className="text-sm">📣</span>
          <p className="text-xs font-medium text-stone-100 leading-snug">
            {boutique.message_annonce}
          </p>
        </div>
      )}

      {/* BANDEAU MODE CONGÉS */}
      {boutique?.en_pause && (
        <div className="max-w-md mx-auto mt-3 mx-3 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-1">
          <p className="text-xs font-bold text-amber-900 flex items-center justify-center gap-1.5">
            <span>🏖️</span> Boutique en pause
          </p>
          <p className="text-[11px] text-amber-800 leading-snug">
            {boutique.message_pause || "Les réservations sont temporairement suspendues."}
          </p>
        </div>
      )}

      {/* GRILLE DES ARTICLES */}
      <main className="max-w-md mx-auto px-3 pt-4">
        {articles.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            Aucun article en vitrine pour l'instant.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {articles.map((article) => {
              const estDisponible = article.statut === "disponible";

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
                      src={article.photo_url || "/placeholder.png"}
                      alt={article.titre}
                      className="w-full h-full object-cover group-hover:scale-103 transition duration-300"
                    />

                    {/* Badge Taille */}
                    <span className="absolute top-2.5 left-2.5 bg-stone-900/85 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      {article.taille}
                    </span>

                    {/* Voile si réservé */}
                    {!estDisponible && (
                      <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 text-center">
                        <span className="bg-amber-400 text-stone-950 font-black text-xs uppercase px-2.5 py-1.5 rounded-xl shadow-md">
                          Déjà réservé 🔒
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ZONE INFOS : TITRE SUR 2 LIGNES + PRIX */}
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => setArticleApercu(article)}
                        className="font-bold text-stone-900 text-sm leading-snug line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-amber-700 transition"
                        title={article.titre}
                      >
                        {article.titre}
                      </h3>
                      <p className="font-extrabold text-stone-950 text-base mt-1">
                        {formaterPrix(article.prix)} €
                      </p>
                    </div>

                    {/* BOUTON D'ACTION CLIENT */}
                    <div className="mt-3">
                      {estDisponible ? (
                        <button
                          disabled={boutique?.en_pause}
                          onClick={() => !boutique?.en_pause && setArticleSelectionne(article)}
                          className={`w-full text-xs font-semibold py-2.5 px-3 rounded-xl shadow-xs transition ${
                            boutique?.en_pause
                              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
                              : "bg-stone-900 hover:bg-stone-800 text-white active:scale-95 cursor-pointer"
                          }`}
                        >
                          {boutique?.en_pause ? "Réservations en pause" : "Mettre de côté"}
                        </button>
                      ) : (
                        <button
                          onClick={() => setArticleAttente(article)}
                          className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs py-2.5 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>🔒</span> Déjà réservé (M'alerter si dispo)
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

      {/* 1. MODALE ZOOM / GRAND FORMAT */}
      {articleApercu && (
        <div
          onClick={() => setArticleApercu(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col"
          >
            <button
              onClick={() => setArticleApercu(null)}
              className="absolute top-3 right-3 z-10 bg-stone-900/70 hover:bg-stone-900 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md cursor-pointer transition"
              title="Fermer"
            >
              ✕
            </button>

            <div className="relative aspect-3/4 bg-stone-100 overflow-hidden">
              <img
                src={articleApercu.photo_url || "/placeholder.png"}
                alt={articleApercu.titre}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-lg">
                Taille : {articleApercu.taille}
              </span>
            </div>

            <div className="p-5 overflow-y-auto">
              <h2 className="text-lg font-black text-stone-900 leading-tight">
                {articleApercu.titre}
              </h2>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {formaterPrix(articleApercu.prix)} €
              </p>

              <div className="mt-4 pt-3 border-t border-stone-100 flex gap-2">
                <button
                  onClick={() => setArticleApercu(null)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs py-3 rounded-xl cursor-pointer"
                >
                  ← Retour vitrine
                </button>

                {articleApercu.statut === "disponible" && !boutique?.en_pause && (
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
                src={articleSelectionne.photo_url || "/placeholder.png"}
                alt={articleSelectionne.titre}
                className="w-12 h-14 object-cover rounded-xl shrink-0"
              />
              <div className="text-xs">
                <p className="font-bold text-stone-900">
                  {articleSelectionne.taille} • {formaterPrix(articleSelectionne.prix)} €
                </p>
                <p className="text-stone-500">
                  Mise de côté en cabine jusqu'à la fermeture ({boutique?.heure_fermeture_soir || "18h30"}).
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
              Votre pièce est réservée chez <strong>{boutique.nom}</strong>.
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
                💰 {formaterPrix(ticketConfirmation.prix)} € (à régler sur place)
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

      {/* Modale d'inscription liste d'attente (à placer avec les autres modales) */}
      {articleAttente && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-base font-bold text-stone-900">
                Être alertée si la pièce se libère
              </h3>
              <button
                onClick={() => setArticleAttente(null)}
                className="text-stone-400 hover:text-stone-600 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              L'article <strong>{articleAttente.titre}</strong> est actuellement en cabine. Laissez votre e-mail pour recevoir une notification prioritaire s'il revient en vitrine.
            </p>

            <form onSubmit={validerListeAttente} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Votre prénom
                </label>
                <input
                  type="text"
                  required
                  placeholder="Julie"
                  value={prenomAttente}
                  onChange={(e) => setPrenomAttente(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Votre e-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="julie@exemple.fr"
                  value={emailAttente}
                  onChange={(e) => setEmailAttente(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <button
                type="submit"
                disabled={chargementAttente}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {chargementAttente ? "Enregistrement..." : "M'inscrire sur la liste d'attente"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function formaterPrix(prix) {
  if (prix === null || prix === undefined || prix === "") return "";
  const nombre = Number(prix);
  if (isNaN(nombre)) return prix;
  return nombre % 1 !== 0 ? nombre.toFixed(2) : nombre.toString();
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