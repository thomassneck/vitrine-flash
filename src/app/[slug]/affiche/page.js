"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function ContenuAffiche() {
  const { slug } = useParams();
  const [boutique, setBoutique] = useState(null);
  const [urlVitrine, setUrlVitrine] = useState("");

  useEffect(() => {
    if (!slug) return;
    // Récupère l'URL actuelle (votre lien Vercel ou localhost)
    const origin = window.location.origin;
    setUrlVitrine(`${origin}/${slug}`);

    async function chargerBoutique() {
      const { data } = await supabase
        .from("boutiques")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (data) setBoutique(data);
    }
    chargerBoutique();
  }, [slug]);

  if (!boutique) {
    return <div className="p-10 text-center">Chargement de l'affiche...</div>;
  }

  // Génération automatique du QR Code haute définition (sans librairie à installer)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(
    urlVitrine
  )}`;

  return (
    <div className="min-h-screen bg-stone-200 py-8 px-4 print:bg-white print:p-0 font-sans">
      {/* BARRE D'OUTILS (Masquée à l'impression) */}
      <div className="max-w-2xl mx-auto mb-6 bg-stone-900 text-white p-4 rounded-2xl flex justify-between items-center print:hidden shadow-lg">
        <div>
          <p className="text-sm font-bold">🖨️ Kit Prêt-à-Imprimer pour {boutique.nom}</p>
          <p className="text-xs text-stone-400">
            Imprimez cette page en A4 et coupez-la en deux au milieu.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="bg-amber-400 hover:bg-amber-500 text-stone-950 font-extrabold px-5 py-2.5 rounded-xl text-sm shadow cursor-pointer"
        >
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* FEUILLE A4 */}
      <div className="max-w-2xl mx-auto bg-white shadow-2xl print:shadow-none rounded-3xl print:rounded-none overflow-hidden border border-stone-200 print:border-none">
        
        {/* PARTIE 1 (HAUT) : LE CHEVALET VITRINE POUR LES CLIENTES */}
        <div className="p-8 text-center border-b-2 border-dashed border-stone-300 relative bg-gradient-to-b from-amber-50/60 to-white">
          <span className="inline-block bg-stone-900 text-amber-300 text-xs font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full mb-3">
            ✨ Vitrine Connectée 24h/24 & 7j/7 ✨
          </span>

          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            Coup de cœur en vitrine ?
          </h1>
          <p className="text-base font-medium text-stone-600 mt-1 mb-6">
            Nos pépites sont des <strong className="text-stone-900">pièces uniques</strong>. Ne la laissez pas filer !
          </p>

          {/* Cadre QR Code */}
          <div className="inline-block bg-white p-4 rounded-3xl shadow-md border-4 border-stone-900 mb-5">
            <img
              src={qrCodeUrl}
              alt="QR Code Vitrine"
              className="w-44 h-44 mx-auto"
            />
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-900 mt-2">
              📱 Scannez avec votre appareil photo
            </p>
          </div>

          {/* Les 3 étapes clientes */}
          <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <span className="text-xs font-black bg-amber-300 text-stone-950 px-2 py-0.5 rounded-md">
                1. SCANNEZ
              </span>
              <p className="text-xs text-stone-600 mt-1">
                Découvrez les tailles et les prix de la vitrine.
              </p>
            </div>
            <div>
              <span className="text-xs font-black bg-amber-300 text-stone-950 px-2 py-0.5 rounded-md">
                2. BLOQUEZ
              </span>
              <p className="text-xs text-stone-600 mt-1">
                Réservez la pièce gratuitement par SMS en 1 clic.
              </p>
            </div>
            <div>
              <span className="text-xs font-black bg-amber-300 text-stone-950 px-2 py-0.5 rounded-md">
                3. ESSAYEZ
              </span>
              <p className="text-xs text-stone-600 mt-1">
                Elle vous attend de côté en cabine chez <strong>{boutique.nom}</strong> !
              </p>
            </div>
          </div>
        </div>

        {/* LIGNE DE DÉCOUPE AUX CISEAUX */}
        <div className="text-center -mt-3 mb-2 print:my-1">
          <span className="bg-white px-3 text-[11px] font-mono text-stone-400">
            ✂️ Plier ou découper ici (Chevalet Vitrine en haut / Mémo Comptoir en bas)
          </span>
        </div>

        {/* PARTIE 2 (BAS) : LA FICHE COMPTOIR POUR MARION (RASSURANCE TGM) */}
        <div className="p-8 bg-stone-50 text-stone-800">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                🎁 Pilote 100% Gratuit (30 jours) • Sans engagement
              </span>
              <h2 className="text-xl font-extrabold text-stone-900 mt-2">
                Mémo Vendeuse — {boutique.nom}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs mb-5">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200">
              <p className="font-bold text-stone-900 mb-1">
                ✅ 100% Compatible avec ton site & ta caisse (TGM)
              </p>
              <p className="text-stone-600 leading-relaxed">
                Aucune modification technique sur ton site ou ta caisse. C'est un simple lien indépendant pour tes <strong>Stories Instagram</strong> et ta <strong>Vitrine</strong>.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200">
              <p className="font-bold text-stone-900 mb-1">
                ⏱️ Fini les 15 DM Instagram pour la même pièce
              </p>
              <p className="text-stone-600 leading-relaxed">
                La 1ère cliente qui clique bloque la pépite jusqu'à 18h et t'envoie un SMS pré-rempli. L'article affiche <em>"Déjà en cabine"</em> pour les suivantes.
              </p>
            </div>
          </div>

          {/* Accès rapide de Marion */}
          <div className="bg-stone-900 text-white p-4 rounded-2xl flex justify-between items-center text-xs">
            <div className="space-y-1">
              <p className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                Tes accès directs sur ton smartphone :
              </p>
              <p>
                🔗 <strong>Lien Bio / Story Insta :</strong> {urlVitrine}
              </p>
              <p>
                ⚙️ <strong>Ton Espace Vendeuse (Ajout photo 15s) :</strong> {urlVitrine}/admin
              </p>
              <p>
                🔑 <strong>Code secret vendeuse :</strong> <span className="font-mono bg-stone-800 px-2 py-0.5 rounded">{boutique.mot_de_passe_admin}</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function PageAffiche() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Chargement...</div>}>
      <ContenuAffiche />
    </Suspense>
  );
}