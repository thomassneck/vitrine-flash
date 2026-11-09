"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Fonction native ultra-légère pour compresser la photo du smartphone en WebP (~100 Ko)
async function compresserPhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Largeur idéale pour mobile
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], `pepite-${Date.now()}.webp`, { type: "image/webp" }));
          },
          "image/webp",
          0.8 // Qualité 80%
        );
      };
    };
  });
}

// Détermine l'échéance exacte avec date calendaire lisible
function verifierEcheanceResa(dateCreationISO, heureClotureBoutique = "18h30") {
  if (!dateCreationISO) return { depassee: true, libelle: "Heure limite atteinte" };

  const dateResa = new Date(dateCreationISO);
  const dateResaFr = new Date(dateResa.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const heure = dateResaFr.getHours();
  const jour = dateResaFr.getDay();

  const [hStr, mStr] = (heureClotureBoutique || "18h30").toLowerCase().split("h");
  const hCloture = parseInt(hStr, 10) || 18;
  const mCloture = parseInt(mStr, 10) || 0;

  const dateEcheance = new Date(dateResaFr);

  // 1. Réservé le matin (< 14h) en semaine d'ouverture : expire le jour même au soir
  if (heure < 14 && jour !== 0 && jour !== 1) {
    dateEcheance.setHours(hCloture, mCloture, 0, 0);
  }
  // 2. Samedi après-midi ou Dimanche : expire mardi à 14h00
  else if (jour === 0 || (jour === 6 && heure >= 14)) {
    const joursRestants = jour === 0 ? 2 : 3;
    dateEcheance.setDate(dateEcheance.getDate() + joursRestants);
    dateEcheance.setHours(14, 0, 0, 0);
  }
  // 3. Lundi (fermeture) : expire mardi au soir
  else if (jour === 1) {
    dateEcheance.setDate(dateEcheance.getDate() + 1);
    dateEcheance.setHours(hCloture, mCloture, 0, 0);
  }
  // 4. Après 14h ou soirée : expire le lendemain à 14h00
  else {
    dateEcheance.setDate(dateEcheance.getDate() + 1);
    dateEcheance.setHours(14, 0, 0, 0);
  }

  const optionsDate = {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  };
  const dateFormatee = dateEcheance.toLocaleDateString("fr-FR", optionsDate);
  const hFin = dateEcheance.getHours().toString().padStart(2, "0");
  const mFin = dateEcheance.getMinutes().toString().padStart(2, "0");

  const maintenant = new Date();
  const estDepassee = maintenant > dateEcheance;

  return {
    depassee: estDepassee,
    libelle: `${dateFormatee} à ${hFin}h${mFin}`,
  };
}

function ContenuAdmin() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [articles, setArticles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [maxArticles, setMaxArticles] = useState(1);

  // Authentification sécurisée par cookie de session
  const [autorise, setAutorise] = useState(false);
  const [motDePasseSaisi, setMotDePasseSaisi] = useState("");

  // États pour Mot de passe oublié & Réglages
  const [modeOubli, setModeOubli] = useState(false);
  const [quatreChiffres, setQuatreChiffres] = useState("");
  const [nouveauMdpOubli, setNouveauMdpOubli] = useState("");

  const [modaleReglages, setModaleReglages] = useState(false);
  const [nouveauTel, setNouveauTel] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");
  const [nouvelEmail, setNouvelEmail] = useState("");

  const [heureSoir, setHeureSoir] = useState("18h30");
  const [enPause, setEnPause] = useState(false);
  const [messagePause, setMessagePause] = useState("");
  const [messageAnnonce, setMessageAnnonce] = useState("");

  // Modale pour le Bilan / Clôture du soir
  const [modaleCloture, setModaleCloture] = useState(false);

  // Les 7 jours de la semaine
  const TOUS_LES_JOURS = [
    { id: 1, label: "Lundi" },
    { id: 2, label: "Mardi" },
    { id: 3, label: "Mercredi" },
    { id: 4, label: "Jeudi" },
    { id: 5, label: "Vendredi" },
    { id: 6, label: "Samedi" },
    { id: 0, label: "Dimanche" },
  ];

  const [joursFermeture, setJoursFermeture] = useState([0, 1]);

  const basculerJourFermeture = (jourId) => {
    setJoursFermeture((prev) =>
      prev.includes(jourId) ? prev.filter((j) => j !== jourId) : [...prev, jourId].sort()
    );
  };

  const [ongletActif, setOngletActif] = useState("contact");

  // Formulaire d'ajout
  const [modaleAjout, setModaleAjout] = useState(false);
  const [titre, setTitre] = useState("");
  const [prix, setPrix] = useState("");
  const [taille, setTaille] = useState("Unique");
  const [fichierPhoto, setFichierPhoto] = useState(null);
  const [apercuPhoto, setApercuPhoto] = useState(null);
  const [publicationEnCours, setPublicationEnCours] = useState(false);

  // Formulaire de modification
  const [articleEnModif, setArticleEnModif] = useState(null);
  const [modifTitre, setModifTitre] = useState("");
  const [modifPrix, setModifPrix] = useState("");
  const [modifTaille, setModifTaille] = useState("");
  const [modifFichierPhoto, setModifFichierPhoto] = useState(null);
  const [modifApercuPhoto, setModifApercuPhoto] = useState(null);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);
  const [afficherMdp, setAfficherMdp] = useState(false);

  // Vérification de la session sécurisée au chargement
  useEffect(() => {
    if (!slug) return;
    fetch(`/api/auth/check?slug=${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.autorise) {
          setAutorise(true);
        }
      })
      .catch((err) => console.error("Erreur vérification session :", err));
  }, [slug]);

  // Chargement des données sans exposer mot_de_passe_admin
  const chargerDonneesAdmin = async () => {
    const { data: dataBoutique } = await supabase
      .from("boutiques")
      .select("id, slug, nom, telephone_pro, email, max_articles_par_cliente, heure_fermeture_soir, en_pause, message_pause, message_annonce, jours_fermeture")
      .eq("slug", slug)
      .maybeSingle();

    if (dataBoutique) {
      setBoutique(dataBoutique);
      setNouveauTel(dataBoutique.telephone_pro || "");
      setNouveauMdp(""); // Laissé vide par sécurité
      setNouvelEmail(dataBoutique.email || "");
      setMaxArticles(dataBoutique.max_articles_par_cliente || 1);
      setHeureSoir(dataBoutique.heure_fermeture_soir || "18h30");
      setEnPause(dataBoutique.en_pause || false);
      setMessagePause(
        dataBoutique.message_pause ||
          "La boutique est actuellement fermée pour congés. Les réservations sont temporairement suspendues."
      );
      setMessageAnnonce(dataBoutique.message_annonce || "");
      setJoursFermeture(
        Array.isArray(dataBoutique.jours_fermeture) ? dataBoutique.jours_fermeture : [0, 1]
      );

      const { data: dataArticles } = await supabase
        .from("articles")
        .select("*")
        .eq("boutique_id", dataBoutique.id)
        .neq("statut", "vendu")
        .order("created_at", { ascending: false });

      setArticles(dataArticles || []);

      if (dataArticles && dataArticles.length > 0) {
        const idsArticles = dataArticles.map((a) => a.id);
        const { data: dataResa } = await supabase
          .from("reservations")
          .select("*")
          .in("article_id", idsArticles)
          .neq("statut", "annulee")
          .order("created_at", { ascending: false });

        setReservations(dataResa || []);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!slug) return;
    chargerDonneesAdmin();
  }, [slug]);

  const gererSelectionPhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichierPhoto(file);
      setApercuPhoto(URL.createObjectURL(file));
    }
  };

  // 1. Connexion via route API sécurisée (pose du cookie httpOnly)
  const connecterAdmin = async () => {
    if (!motDePasseSaisi.trim()) {
      alert("Veuillez saisir votre code d'accès.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, motDePasse: motDePasseSaisi }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code incorrect");

      setAutorise(true);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur de connexion : " + err.message);
    }
  };

  // 2. Déconnexion via route API
  const deconnecterAdmin = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
    } finally {
      localStorage.removeItem(`admin_auth_${slug}`);
      localStorage.removeItem(`admin_pwd_${slug}`);
      setAutorise(false);
      setMotDePasseSaisi("");
      setModaleReglages(false);
    }
  };

  // 3. Réinitialisation sécurisée du mot de passe côté serveur
  const reinitialiserMotDePasse = async () => {
    if (quatreChiffres.trim().length !== 4) {
      alert("❌ Merci d'entrer les 4 derniers chiffres du numéro de téléphone.");
      return;
    }
    if (!nouveauMdpOubli.trim()) {
      alert("Merci de choisir votre nouveau code secret.");
      return;
    }

    try {
      const res = await fetch("/api/boutiques/reinitialiser-mdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          quatreChiffres: quatreChiffres.trim(),
          nouveauMotDePasse: nouveauMdpOubli.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de réinitialisation");

      alert("✅ Votre nouveau code secret est enregistré !");
      setModeOubli(false);
      setMotDePasseSaisi(nouveauMdpOubli.trim());
      setAutorise(true);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  // 4. Ajouter un article via route API sécurisée
  const ajouterArticle = async (e) => {
    e.preventDefault();
    if (!fichierPhoto || !titre || !prix) {
      alert("Merci de prendre une photo et d'indiquer le titre et le prix.");
      return;
    }

    setPublicationEnCours(true);

    try {
      const imageCompressee = await compresserPhoto(fichierPhoto);
      const cheminFichier = `${boutique.slug}/${imageCompressee.name}`;

      const { error: uploadError } = await supabase.storage
        .from("photos-vitrine")
        .upload(cheminFichier, imageCompressee);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("photos-vitrine")
        .getPublicUrl(cheminFichier);

      const response = await fetch("/api/articles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boutiqueId: boutique.id,
          motDePasse: motDePasseSaisi,
          titre: titre.trim(),
          taille: taille.trim(),
          prix: parseFloat(prix),
          imageUrl: urlData.publicUrl,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création de l'article");
      }

      setTitre("");
      setPrix("");
      setTaille("Unique");
      setFichierPhoto(null);
      setApercuPhoto(null);
      setModaleAjout(false);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setPublicationEnCours(false);
    }
  };

  // 5. Changer le statut d'un article via route API sécurisée
  const changerStatutArticle = async (articleId, nouveauStatut) => {
    try {
      const res = await fetch("/api/articles/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId,
          nouveauStatut,
          slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du changement de statut");

      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  // 6. Clôture du soir / Remise en rayon via route API sécurisée
  const libererTousLesArticles = async (articlesARemettre) => {
    if (!articlesARemettre || articlesARemettre.length === 0) return;
    if (!confirm(`Remettre ces ${articlesARemettre.length} pièce(s) en rayon et sur la vitrine ?`))
      return;

    const ids = articlesARemettre.map((a) => a.id);

    try {
      const res = await fetch("/api/articles/remise-en-rayon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la libération");

      setModaleCloture(false);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur : " + err.message);
    }
  };

  // 7. Supprimer un article via route API sécurisée
  const supprimerArticle = async (article) => {
    if (!confirm(`Retirer "${article.titre}" de la vitrine en ligne ?`)) return;

    try {
      const response = await fetch("/api/articles/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: article.id,
          boutiqueId: boutique.id,
          motDePasse: motDePasseSaisi,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la suppression");
      }

      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur lors de la suppression : " + err.message);
    }
  };

  // Préremplir la modale de modification
  const ouvrirModaleModif = (article) => {
    setArticleEnModif(article);
    setModifTitre(article.titre);
    setModifPrix(article.prix.toString());
    setModifTaille(article.taille);
    setModifFichierPhoto(null);
    setModifApercuPhoto(article.photo_url);
  };

  // 8. Sauvegarder la modification via route API sécurisée
  const enregistrerModification = async (e) => {
    e.preventDefault();
    if (!modifTitre.trim() || !modifPrix) {
      alert("Le titre et le prix sont obligatoires.");
      return;
    }

    setSauvegardeEnCours(true);

    try {
      let nouvelleUrlPhoto = articleEnModif.photo_url;

      if (modifFichierPhoto) {
        const imageCompressee = await compresserPhoto(modifFichierPhoto);
        const cheminFichier = `${boutique.slug}/${imageCompressee.name}`;

        const { error: uploadError } = await supabase.storage
          .from("photos-vitrine")
          .upload(cheminFichier, imageCompressee);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("photos-vitrine")
          .getPublicUrl(cheminFichier);

        nouvelleUrlPhoto = urlData.publicUrl;
      }

      const response = await fetch("/api/articles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: articleEnModif.id,
          titre: modifTitre.trim(),
          taille: modifTaille.trim(),
          prix: parseFloat(modifPrix),
          photoUrl: nouvelleUrlPhoto,
          anciennePhotoUrl: modifFichierPhoto ? articleEnModif.photo_url : null,
          slug,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erreur lors de la modification");

      setArticleEnModif(null);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur lors de la modification : " + err.message);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  // 9. Sauvegarder les réglages via route API sécurisée
  const sauvegarderReglages = async (e) => {
    e.preventDefault();

    if (!nouveauTel.trim()) {
      alert("Le numéro de téléphone est obligatoire.");
      return;
    }

    try {
      const response = await fetch("/api/boutiques/reglages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          motDePasseActuel: motDePasseSaisi,
          telephonePro: nouveauTel,
          nouveauMotDePasse: nouveauMdp,
          email: nouvelEmail,
          maxArticles,
          heureSoir,
          enPause,
          messagePause,
          messageAnnonce,
          joursFermeture,
        }),
      });

      const resultat = await response.json();
      if (!response.ok) throw new Error(resultat.error || "Erreur lors de la mise à jour");

      if (nouveauMdp.trim()) {
        setMotDePasseSaisi(nouveauMdp.trim());
      }

      alert("✅ Vos réglages ont bien été enregistrés !");
      setModaleReglages(false);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("❌ " + err.message);
    }
  };

  const articlesNonRetires = articles.filter((a) => a.statut === "confirme");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500 font-sans">
        Chargement de l'espace vendeuse...
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

  // Écran de connexion
  if (!autorise) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
            Espace Commerçant
          </span>
          <h1 className="text-xl font-bold text-stone-900 mt-3 mb-1">{boutique.nom}</h1>

          {!modeOubli ? (
            <>
              <p className="text-xs text-stone-500 mb-5">
                Entrez votre code vendeuse (votre téléphone s'en souviendra)
              </p>

              <input
                type="password"
                placeholder="Code d'accès"
                value={motDePasseSaisi}
                onChange={(e) => setMotDePasseSaisi(e.target.value)}
                className="w-full border border-stone-300 rounded-xl px-4 py-3 text-center text-stone-900 font-bold mb-4 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
              <button
                onClick={connecterAdmin}
                className="w-full bg-stone-900 text-white font-semibold py-3 rounded-xl shadow-xs mb-3 cursor-pointer"
              >
                Ouvrir mon tableau de bord
              </button>

              <button
                onClick={() => setModeOubli(true)}
                className="text-xs text-stone-500 hover:text-stone-900 underline cursor-pointer"
              >
                Mot de passe oublié / Changer de code ?
              </button>
            </>
          ) : (
            <div className="text-left space-y-3 mt-3">
              <p className="text-xs text-stone-600 text-center mb-2">
                Vérifiez votre identité avec les <strong>4 derniers chiffres</strong> du téléphone
                de la boutique :
              </p>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  4 derniers chiffres de votre téléphone :
                </label>
                <input
                  type="tel"
                  maxLength={4}
                  placeholder="Ex: 5678"
                  value={quatreChiffres}
                  onChange={(e) => setQuatreChiffres(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-center font-extrabold text-stone-900 tracking-widest"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Choisissez votre nouveau code secret :
                </label>
                <input
                  type="text"
                  placeholder="Ex: MonMotDePasse2026"
                  value={nouveauMdpOubli}
                  onChange={(e) => setNouveauMdpOubli(e.target.value)}
                  className="w-full border border-stone-300 rounded-xl px-3 py-2.5 text-center font-bold text-stone-900"
                />
              </div>

              <button
                onClick={reinitialiserMotDePasse}
                className="w-full bg-amber-500 text-stone-950 font-bold py-3 rounded-xl shadow-xs mt-2 cursor-pointer"
              >
                🔑 Enregistrer et me connecter
              </button>

              <button
                onClick={() => setModeOubli(false)}
                className="w-full text-center text-xs text-stone-400 hover:text-stone-700 pt-1 cursor-pointer"
              >
                ← Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-24 font-sans">
      {/* EN-TÊTE ADMIN */}
      <header className="bg-stone-900 text-white px-4 py-4 sticky top-0 z-10 flex justify-between items-center shadow-md">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
            Mode Vendeuse • En direct
          </span>
          <h1 className="text-lg font-bold">{boutique.nom}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setModaleCloture(true)}
            className="text-xs bg-stone-800 hover:bg-stone-700 text-amber-300 font-semibold px-2.5 py-2 rounded-xl border border-stone-700 cursor-pointer flex items-center gap-1"
            title="Bilan du soir : pièces à remettre en rayon"
          >
            <span>🌙</span> Bilan
            {articlesNonRetires.length > 0 && (
              <span className="bg-amber-500 text-stone-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {articlesNonRetires.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setModaleReglages(true)}
            className="text-xs bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold px-2.5 py-2 rounded-xl border border-stone-700 cursor-pointer"
          >
            ⚙️ Réglages
          </button>

          <a
            href={`/${boutique.slug}`}
            target="_blank"
            className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 px-2.5 py-2 rounded-xl border border-stone-700"
          >
            👁️ Vitrine
          </a>
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4 space-y-3">
        <button
          onClick={() => setModaleAjout(true)}
          className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 transition text-stone-950 font-extrabold text-sm py-4 rounded-2xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="text-lg">📸</span> + Ajouter un article en vitrine
        </button>

        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 pt-2 px-1">
          Articles actifs en vitrine ({articles.length})
        </h2>

        {articles.map((article) => {
          const resa = reservations.find((r) => r.article_id === article.id);
          const estBloque = article.statut === "confirme";

          return (
            <div
              key={article.id}
              className={`bg-white rounded-2xl p-3 shadow-xs border-2 ${
                estBloque ? "border-amber-400" : "border-transparent"
              }`}
            >
              <div className="flex gap-3">
                <img
                  src={article.photo_url}
                  alt={article.titre}
                  className="w-20 h-24 object-cover rounded-xl bg-stone-200 shrink-0"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                      {article.taille}
                    </span>
                    <span className="font-extrabold text-stone-900">{article.prix} €</span>
                  </div>
                  <h3 className="font-bold text-stone-900 text-sm mt-1">{article.titre}</h3>

                  {estBloque && resa ? (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs">
                      <p className="font-bold text-amber-900">
                        🔒 Réservé par {resa.prenom_cliente} (#{resa.code_resa})
                      </p>
                      {resa.telephone_cliente && (
                        <a
                          href={`tel:${resa.telephone_cliente}`}
                          className="text-amber-700 underline font-medium block mt-0.5"
                        >
                          📞 {resa.telephone_cliente}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-600 font-semibold mt-2">
                      🟢 Disponible en vitrine
                    </p>
                  )}
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-stone-100">
                <button
                  onClick={() => changerStatutArticle(article.id, "vendu")}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-2 rounded-xl cursor-pointer"
                >
                  ✅ Vendu
                </button>

                {estBloque && (
                  <button
                    onClick={() => changerStatutArticle(article.id, "disponible")}
                    className="flex-1 bg-stone-200 hover:bg-stone-300 text-stone-700 font-semibold text-xs py-2 px-2 rounded-xl cursor-pointer"
                  >
                    🔄 Libérer
                  </button>
                )}

                <button
                  onClick={() => ouvrirModaleModif(article)}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-xs py-2 px-3 rounded-xl cursor-pointer"
                  title="Modifier le titre, prix ou taille"
                >
                  ✏️ Modifier
                </button>

                <button
                  onClick={() => supprimerArticle(article)}
                  title="Retirer de la vitrine sans marquer vendu"
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs py-2 px-3 rounded-xl cursor-pointer"
                >
                  🗑️ Retirer
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* MODALE BILAN / CLÔTURE */}
      {modaleCloture && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Bilan
                </span>
                <h3 className="text-lg font-bold text-stone-900">🌙 Articles en attente</h3>
              </div>
              <button
                type="button"
                onClick={() => setModaleCloture(false)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {articlesNonRetires.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <span className="text-4xl block">🎉</span>
                <p className="text-sm font-bold text-stone-900">Tout est en ordre !</p>
                <p className="text-xs text-stone-500">
                  Aucun article n'est bloqué derrière la caisse.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-stone-600 leading-relaxed">
                  Vérifiez le statut des articles. Les pièces en{" "}
                  <strong className="text-red-600">rouge</strong> doivent être remises en rayon :
                </p>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {articlesNonRetires.map((art) => {
                    const resa = reservations.find((r) => r.article_id === art.id);
                    const echeance = verifierEcheanceResa(
                      resa?.created_at,
                      boutique?.heure_fermeture_soir || "18h30"
                    );

                    return (
                      <div
                        key={art.id}
                        className={`rounded-2xl p-3 flex items-center justify-between gap-2 border-2 transition ${
                          echeance.depassee
                            ? "bg-red-50/60 border-red-400"
                            : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                echeance.depassee
                                  ? "bg-red-600 text-white"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {echeance.depassee ? "⏰ À replacer" : "⏳ En cours"}
                            </span>
                            <span className="text-[11px] font-semibold text-stone-500">
                              Jusqu'à : {echeance.libelle}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-stone-900 truncate">
                            {art.titre}{" "}
                            <span className="font-normal text-stone-500">
                              ({art.taille} • {art.prix} €)
                            </span>
                          </p>

                          <p className="text-[11px] text-stone-600 font-medium truncate mt-0.5">
                            👤{" "}
                            {resa
                              ? `${resa.prenom_cliente} (${resa.telephone_cliente || "Sans tél"})`
                              : "Réservation active"}
                          </p>
                        </div>

                        <button
                          onClick={() => changerStatutArticle(art.id, "disponible")}
                          className={`text-white text-[11px] font-bold py-2 px-3 rounded-xl shrink-0 cursor-pointer shadow-xs ${
                            echeance.depassee
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-stone-800 hover:bg-stone-700"
                          }`}
                        >
                          En rayon
                        </button>
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const expires = articlesNonRetires.filter((art) => {
                    const resa = reservations.find((r) => r.article_id === art.id);
                    return verifierEcheanceResa(
                      resa?.created_at,
                      boutique?.heure_fermeture_soir || "18h30"
                    ).depassee;
                  });

                  if (expires.length === 0) return null;

                  return (
                    <button
                      onClick={() => libererTousLesArticles(expires)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-xs transition active:scale-98 cursor-pointer mt-2"
                    >
                      ✨ Remettre en vitrine les {expires.length} pièce(s) expirée(s)
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE D'AJOUT AVEC LE CHOIX PHOTO OU GALERIE */}
      {modaleAjout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={ajouterArticle}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">Nouvel article en vitrine</h3>
              <button
                type="button"
                onClick={() => setModaleAjout(false)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="border-2 border-dashed border-stone-300 rounded-2xl p-3 text-center bg-stone-50">
                {apercuPhoto ? (
                  <div className="space-y-2">
                    <img
                      src={apercuPhoto}
                      alt="Aperçu"
                      className="w-32 h-40 object-cover mx-auto rounded-xl shadow-xs"
                    />
                    <p className="text-[11px] text-stone-500 font-medium">Photo sélectionnée</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <span className="text-3xl block mb-1">📷</span>
                    <p className="text-xs font-semibold text-stone-600">
                      Ajoutez une photo claire du vêtement
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-3">
                  <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition">
                    <span>📸</span> Prendre photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                      onChange={gererSelectionPhoto}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition">
                    <span>🖼️</span> Galerie
                    <input
                      type="file"
                      accept="image/*"
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                      onChange={gererSelectionPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nom de la pièce :
              </label>
              <input
                type="text"
                placeholder="Ex: Veste en cuir vintage"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Prix (€) :
                </label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Ex: 45"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  required
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Taille :
                </label>
                <input
                  type="text"
                  placeholder="Ex: T.38 / M"
                  value={taille}
                  onChange={(e) => setTaille(e.target.value)}
                  required
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={publicationEnCours}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
            >
              {publicationEnCours ? "Compression et mise en ligne..." : "✨ Publier dans ma vitrine"}
            </button>
          </form>
        </div>
      )}

      {/* MODALE DE MODIFICATION D'ARTICLE */}
      {articleEnModif && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={enregistrerModification}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Correction
                </span>
                <h3 className="text-lg font-bold text-stone-900">Modifier l'article</h3>
              </div>
              <button
                type="button"
                onClick={() => setArticleEnModif(null)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="border border-stone-200 rounded-2xl p-3 text-center bg-stone-50">
                <img
                  src={modifApercuPhoto}
                  alt="Aperçu"
                  className="w-24 h-32 object-cover mx-auto rounded-xl shadow-xs mb-2"
                />
                <p className="text-[11px] text-stone-500 mb-2">Changer la photo (optionnel) :</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold py-2 px-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition">
                    <span>📸</span> Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setModifFichierPhoto(file);
                          setModifApercuPhoto(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-[11px] font-semibold py-2 px-2 rounded-xl flex items-center justify-center gap-1 active:scale-95 transition">
                    <span>🖼️</span> Galerie
                    <input
                      type="file"
                      accept="image/*"
                      onClick={(e) => {
                        e.target.value = null;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setModifFichierPhoto(file);
                          setModifApercuPhoto(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nom de la pièce :
              </label>
              <input
                type="text"
                value={modifTitre}
                onChange={(e) => setModifTitre(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Prix (€) :
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={modifPrix}
                  onChange={(e) => setModifPrix(e.target.value)}
                  required
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Taille :
                </label>
                <input
                  type="text"
                  value={modifTaille}
                  onChange={(e) => setModifTaille(e.target.value)}
                  required
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sauvegardeEnCours}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg cursor-pointer disabled:opacity-50"
              >
                {sauvegardeEnCours ? "Enregistrement..." : "💾 Mettre à jour l'article"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE DES RÉGLAGES */}
      {modaleReglages && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={sauvegarderReglages}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Configuration
                </span>
                <h3 className="text-lg font-bold text-stone-900">Réglages de la boutique</h3>
              </div>
              <button
                type="button"
                onClick={() => setModaleReglages(false)}
                className="text-stone-400 hover:text-stone-700 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-100 rounded-xl my-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setOngletActif("contact")}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  ongletActif === "contact"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>🔐</span> Contact & Sécurité
              </button>
              <button
                type="button"
                onClick={() => setOngletActif("general")}
                className={`py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  ongletActif === "general"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <span>⚙️</span> Paramètres généraux
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {ongletActif === "contact" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      📱 Numéro de réception (SMS & WhatsApp) :
                    </label>
                    <input
                      type="tel"
                      placeholder="Ex: 06 12 34 56 78"
                      value={nouveauTel}
                      onChange={(e) => setNouveauTel(e.target.value)}
                      required
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">
                      Les numéros 06 ou 07 sont convertis au format international +33.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      ✉️ Email de réception des alertes :
                    </label>
                    <input
                      type="email"
                      placeholder="Ex: contact@bisou-magique.fr"
                      value={nouvelEmail}
                      onChange={(e) => setNouvelEmail(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      🔑 Code secret vendeuse (Mot de passe Admin) :
                    </label>

                    <div className="flex items-center border border-stone-300 rounded-xl px-3.5 py-2 bg-white focus-within:ring-2 focus-within:ring-stone-900 focus-within:border-transparent">
                      <input
                        type={afficherMdp ? "text" : "password"}
                        placeholder="Laisser vide pour ne pas changer"
                        value={nouveauMdp}
                        onChange={(e) => setNouveauMdp(e.target.value)}
                        className="w-full text-sm font-semibold text-stone-900 outline-none bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setAfficherMdp(!afficherMdp)}
                        className="ml-2 text-base cursor-pointer select-none shrink-0 opacity-75 hover:opacity-100 transition"
                        title={afficherMdp ? "Masquer le code" : "Afficher le code"}
                      >
                        {afficherMdp ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.8}
                            stroke="currentColor"
                            className="w-5 h-5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-400 mt-1">
                      Remplissez ce champ uniquement si vous souhaitez modifier votre code secret.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={deconnecterAdmin}
                      className="w-full bg-red-50 text-red-600 font-semibold text-xs py-2.5 rounded-xl cursor-pointer hover:bg-red-100 transition"
                    >
                      🔒 Déconnecter cet appareil
                    </button>
                  </div>
                </div>
              )}

              {ongletActif === "general" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      📣 Annonce vitrine (Optionnel) :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Arrivage cachemire ce jeudi !"
                      value={messageAnnonce}
                      onChange={(e) => setMessageAnnonce(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2 text-sm text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      🛡️ Réservations simultanées par cliente :
                    </label>
                    <select
                      value={maxArticles}
                      onChange={(e) => setMaxArticles(Number(e.target.value))}
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900 bg-white"
                    >
                      <option value={1}>1 article max à la fois (Recommandé)</option>
                      <option value={2}>2 articles max à la fois</option>
                      <option value={3}>3 articles max à la fois</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      🕒 Heure limite de réservation le soir :
                    </label>
                    <select
                      value={heureSoir}
                      onChange={(e) => setHeureSoir(e.target.value)}
                      className="w-full border border-stone-300 rounded-xl px-3.5 py-2 text-sm font-semibold text-stone-900 bg-white"
                    >
                      <option value="18h00">18h00</option>
                      <option value="18h30">18h30</option>
                      <option value="19h00">19h00</option>
                      <option value="19h30">19h30</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      📅 Jours habituels de fermeture :
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {TOUS_LES_JOURS.map((jour) => {
                        const estCoche = joursFermeture.includes(jour.id);
                        return (
                          <label
                            key={jour.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer select-none ${
                              estCoche
                                ? "bg-amber-50 border-amber-300 text-amber-950 font-semibold"
                                : "bg-white border-stone-200 text-stone-600"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={estCoche}
                              onChange={() => basculerJourFermeture(jour.id)}
                              className="w-3.5 h-3.5 accent-amber-500 rounded"
                            />
                            {jour.label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                        <span>🏖️</span> Mode Congés / Pause
                      </label>
                      <input
                        type="checkbox"
                        checked={enPause}
                        onChange={(e) => setEnPause(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {enPause && (
                      <textarea
                        rows={2}
                        value={messagePause}
                        onChange={(e) => setMessagePause(e.target.value)}
                        placeholder="Message affiché aux clientes..."
                        className="w-full border border-stone-300 rounded-xl p-2 text-xs text-stone-900"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 mt-2">
              <button
                type="submit"
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm py-3 rounded-xl shadow-md cursor-pointer transition active:scale-98"
              >
                💾 Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminBoutique() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans">Chargement...</div>
      }
    >
      <ContenuAdmin />
    </Suspense>
  );
}