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

function ContenuAdmin() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [articles, setArticles] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Protection simple par code PIN / mot de passe commerçante
  const [autorise, setAutorise] = useState(false);
  const [motDePasseSaisi, setMotDePasseSaisi] = useState("");

  // États pour Mot de passe oublié & Réglages (Code + Téléphone)
  const [modeOubli, setModeOubli] = useState(false);
  const [quatreChiffres, setQuatreChiffres] = useState("");
  const [nouveauMdpOubli, setNouveauMdpOubli] = useState("");

  const [modaleReglages, setModaleReglages] = useState(false);
  const [nouveauTel, setNouveauTel] = useState("");
  const [nouveauMdp, setNouveauMdp] = useState("");

  // Connexion automatique si le téléphone s'en souvient déjà
  useEffect(() => {
    if (slug && localStorage.getItem(`admin_auth_${slug}`) === "true") {
      setAutorise(true);
    }
  }, [slug]);

  // États du formulaire d'ajout express
  const [modaleAjout, setModaleAjout] = useState(false);
  const [titre, setTitre] = useState("");
  const [prix, setPrix] = useState("");
  const [taille, setTaille] = useState("Unique");
  const [fichierPhoto, setFichierPhoto] = useState(null);
  const [apercuPhoto, setApercuPhoto] = useState(null);
  const [publicationEnCours, setPublicationEnCours] = useState(false);

  // NOUVEAU : États pour la modale de modification d'article
  const [articleEnModif, setArticleEnModif] = useState(null);
  const [modifTitre, setModifTitre] = useState("");
  const [modifPrix, setModifPrix] = useState("");
  const [modifTaille, setModifTaille] = useState("");
  const [modifFichierPhoto, setModifFichierPhoto] = useState(null);
  const [modifApercuPhoto, setModifApercuPhoto] = useState(null);
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState(false);

  // Chargement des données
  const chargerDonneesAdmin = async () => {
    const { data: dataBoutique } = await supabase
      .from("boutiques")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (dataBoutique) {
      setBoutique(dataBoutique);
      setNouveauTel(dataBoutique.telephone_pro);
      setNouveauMdp(dataBoutique.mot_de_passe_admin);

      // Charger tous les articles (sauf les vendus archivés)
      const { data: dataArticles } = await supabase
        .from("articles")
        .select("*")
        .eq("boutique_id", dataBoutique.id)
        .neq("statut", "vendu")
        .order("created_at", { ascending: false });

      setArticles(dataArticles || []);

      // Charger les réservations associées
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

  // Sélection de la photo pour l'ajout
  const gererSelectionPhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFichierPhoto(file);
      setApercuPhoto(URL.createObjectURL(file));
    }
  };

  // 1. Publier une nouvelle pépite en vitrine
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

      await supabase.from("articles").insert({
        boutique_id: boutique.id,
        titre: titre.trim(),
        taille: taille.trim(),
        prix: parseFloat(prix),
        photo_url: urlData.publicUrl,
        statut: "disponible",
      });

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

  // 2. Changer le statut d'un article
  const changerStatutArticle = async (articleId, nouveauStatut) => {
    await supabase
      .from("articles")
      .update({
        statut: nouveauStatut,
        pre_reserve_jusqua: null,
      })
      .eq("id", articleId);

    if (nouveauStatut === "disponible") {
      await supabase
        .from("reservations")
        .update({ statut: "annulee" })
        .eq("article_id", articleId);
    }

    await chargerDonneesAdmin();
  };

  // 3. Supprimer définitivement un article
  const supprimerArticle = async (article) => {
    if (!confirm(`Retirer "${article.titre}" de la vitrine en ligne ?`)) return;

    if (article.photo_url && article.photo_url.includes("/photos-vitrine/")) {
      const cheminPhoto = article.photo_url.split("/photos-vitrine/")[1];
      if (cheminPhoto) {
        await supabase.storage.from("photos-vitrine").remove([cheminPhoto]);
      }
    }

    await supabase.from("articles").delete().eq("id", article.id);
    await chargerDonneesAdmin();
  };

  // NOUVEAU : Préremplir et ouvrir la modale de modification
  const ouvrirModaleModif = (article) => {
    setArticleEnModif(article);
    setModifTitre(article.titre);
    setModifPrix(article.prix.toString());
    setModifTaille(article.taille);
    setModifFichierPhoto(null);
    setModifApercuPhoto(article.photo_url);
  };

  // NOUVEAU : Sauvegarder la modification dans Supabase
  const enregistrerModification = async (e) => {
    e.preventDefault();
    if (!modifTitre.trim() || !modifPrix) {
      alert("Le titre et le prix sont obligatoires.");
      return;
    }

    setSauvegardeEnCours(true);

    try {
      let nouvelleUrlPhoto = articleEnModif.photo_url;

      // Si une nouvelle photo a été choisie
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

        // Supprimer l'ancienne photo du stockage pour ne pas encombrer Supabase
        if (articleEnModif.photo_url && articleEnModif.photo_url.includes("/photos-vitrine/")) {
          const ancienChemin = articleEnModif.photo_url.split("/photos-vitrine/")[1];
          if (ancienChemin) {
            await supabase.storage.from("photos-vitrine").remove([ancienChemin]);
          }
        }
      }

      const { error: updateError } = await supabase
        .from("articles")
        .update({
          titre: modifTitre.trim(),
          taille: modifTaille.trim(),
          prix: parseFloat(modifPrix),
          photo_url: nouvelleUrlPhoto,
        })
        .eq("id", articleEnModif.id);

      if (updateError) throw updateError;

      setArticleEnModif(null);
      await chargerDonneesAdmin();
    } catch (err) {
      alert("Erreur lors de la modification : " + err.message);
    } finally {
      setSauvegardeEnCours(false);
    }
  };

  // 4. Sauvegarder les réglages
  const sauvegarderReglages = async (e) => {
    e.preventDefault();
    if (!nouveauTel.trim() || !nouveauMdp.trim()) {
      alert("Le téléphone et le code ne peuvent pas être vides.");
      return;
    }

    let telFormate = nouveauTel.trim().replace(/\s+/g, "");
    if (telFormate.startsWith("0")) {
      telFormate = "+33" + telFormate.substring(1);
    }

    const { error } = await supabase
      .from("boutiques")
      .update({
        telephone_pro: telFormate,
        mot_de_passe_admin: nouveauMdp.trim(),
      })
      .eq("id", boutique.id);

    if (error) {
      alert("Erreur lors de la mise à jour : " + error.message);
    } else {
      alert("✅ Vos réglages ont bien été enregistrés !");
      setModaleReglages(false);
      await chargerDonneesAdmin();
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-stone-500">Chargement de l'espace vendeuse...</div>;
  }

  if (!boutique) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Boutique introuvable.</div>;
  }

  // Écran de connexion
  if (!autorise) {
    const reinitialiserMotDePasse = async () => {
      const quatreDerniersPro = boutique.telephone_pro.slice(-4);
      if (quatreChiffres.trim() !== quatreDerniersPro) {
        alert("❌ Les 4 derniers chiffres ne correspondent pas au téléphone de la boutique.");
        return;
      }
      if (!nouveauMdpOubli.trim()) {
        alert("Merci de choisir votre nouveau code secret.");
        return;
      }

      await supabase
        .from("boutiques")
        .update({ mot_de_passe_admin: nouveauMdpOubli.trim() })
        .eq("id", boutique.id);

      alert("✅ Votre nouveau code secret est enregistré !");
      localStorage.setItem(`admin_auth_${slug}`, "true");
      setAutorise(true);
      await chargerDonneesAdmin();
    };

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
                onClick={() => {
                  if (motDePasseSaisi === boutique.mot_de_passe_admin) {
                    localStorage.setItem(`admin_auth_${slug}`, "true");
                    setAutorise(true);
                  } else {
                    alert("Code incorrect");
                  }
                }}
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
                Vérifiez votre identité avec les <strong>4 derniers chiffres</strong> du téléphone de la boutique :
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
                  placeholder="Nouveau code (ex: bisou2026)"
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModaleReglages(true)}
            className="text-xs bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold px-3 py-2 rounded-xl border border-stone-700 cursor-pointer"
          >
            ⚙️ Réglages
          </button>
          <a
            href={`/${boutique.slug}`}
            target="_blank"
            className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2 rounded-xl border border-stone-700"
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
          <span className="text-lg">📸</span> + Ajouter une pépite en vitrine
        </button>

        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 pt-2 px-1">
          Articles actifs en vitrine ({articles.length})
        </h2>

        {articles.map((article) => {
          const resa = reservations.find((r) => r.article_id === article.id);
          const estBloque =
            article.statut === "confirme" ||
            (article.statut === "pre_reserve" && new Date(article.pre_reserve_jusqua) > new Date());

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

              {/* BOUTONS D'ACTION : Vendu / Libérer / Modifier / Retirer */}
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

      {/* MODALE D'AJOUT AVEC LE CHOIX PHOTO OU GALERIE */}
      {modaleAjout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={ajouterArticle}
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-stone-900">Nouvelle pépite en vitrine</h3>
              <button
                type="button"
                onClick={() => setModaleAjout(false)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Aperçu et sélection de l'image */}
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

                {/* Les 2 boutons côte à côte */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <label className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition">
                    <span>📸</span> Prendre photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onClick={(e) => { e.target.value = null; }}
                      onChange={gererSelectionPhoto}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition">
                    <span>🖼️</span> Galerie
                    <input
                      type="file"
                      accept="image/*"
                      onClick={(e) => { e.target.value = null; }}
                      onChange={gererSelectionPhoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Titre */}
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

            {/* Prix et Taille */}
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

      {/* NOUVEAU : MODALE DE MODIFICATION D'ARTICLE */}
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
                <h3 className="text-lg font-bold text-stone-900">
                  Modifier l'article
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setArticleEnModif(null)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Aperçu et remplacement éventuel de la photo */}
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
                      onClick={(e) => { e.target.value = null; }}
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
                      onClick={(e) => { e.target.value = null; }}
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

            {/* Titre */}
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

            {/* Prix et Taille */}
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
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  Paramètres de la boutique
                </span>
                <h3 className="text-lg font-bold text-stone-900">
                  Téléphone & Code d'accès
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModaleReglages(false)}
                className="text-stone-400 font-bold text-xl px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                📱 Numéro qui reçoit les réservations (SMS & WhatsApp) :
              </label>
              <input
                type="tel"
                placeholder="Ex: 06 12 34 56 78 ou +33612345678"
                value={nouveauTel}
                onChange={(e) => setNouveauTel(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Astuce : Les numéros commençant par 06 ou 07 sont convertis au format international +33.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                🔑 Code secret vendeuse (Mot de passe Admin) :
              </label>
              <input
                type="text"
                placeholder="Ex: thonon74"
                value={nouveauMdp}
                onChange={(e) => setNouveauMdp(e.target.value)}
                required
                className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-stone-900"
              />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full bg-stone-900 text-white font-bold text-sm py-3.5 rounded-xl shadow-lg cursor-pointer"
              >
                💾 Enregistrer les modifications
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem(`admin_auth_${slug}`);
                  setAutorise(false);
                  setModaleReglages(false);
                }}
                className="w-full bg-red-50 text-red-600 font-semibold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                🔒 Déconnecter cet appareil
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <ContenuAdmin />
    </Suspense>
  );
}