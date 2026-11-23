-- 1. TABLE DES BOUTIQUES (Multi-commerces pour Thonon)
CREATE TABLE boutiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- ex: 'bisou-magique' (pour l'URL vitrine.app.fr/bisou-magique)
  nom TEXT NOT NULL,                   -- ex: 'Bisou Magique'
  telephone_pro TEXT NOT NULL,         -- ex: '+33612345678' (le 06 de Marion qui reçoit le SMS/WhatsApp)
  email TEXT,
  mot_de_passe_admin TEXT NOT NULL,    -- Code simple ou hash pour l'accès vendeuse
  max_articles_par_client INT DEFAULT 1,
  en_pause BOOLEAN DEFAULT false,
  message_pause TEXT DEFAULT 'La boutique est actuellement fermée pour congés. Les réservations sont temporairement suspendues.',
  message_annonce TEXT DEFAULT NULL,
  max_no_shows INT default 2;

-- S'assurer que heure_fermeture_soir existe
ALTER TABLE boutiques 
ADD COLUMN IF NOT EXISTS heure_fermeture_soir TEXT DEFAULT '18h30';
  created_at TIMESTAMPTZ DEFAULT NOW()
);



-- 2. TABLE DES ARTICLES EN VITRINE
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID REFERENCES boutiques(id) ON DELETE CASCADE,
  titre TEXT NOT NULL,                 -- ex: 'Veste en cuir vintage'
  taille TEXT NOT NULL,                -- ex: 'T.38 / M' ou 'Unique'
  prix NUMERIC(6,2) NOT NULL,          -- ex: 45.00
  photo_url TEXT NOT NULL,             -- Lien vers l'image dans Supabase Storage
  
  -- Statuts possibles : 'disponible', 'confirme' (jusqu'au midi/soir), 'vendu'
  statut TEXT NOT NULL DEFAULT 'disponible',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DES RÉSERVATIONS & LISTE D'ATTENTE
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_resa TEXT UNIQUE NOT NULL,      -- ex: 'BM-402' (affiché dans le SMS de la cliente)
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  prenom_client TEXT NOT NULL,        -- ex: 'Julie'
  telephone_client TEXT,              -- Optionnel (pour la liste d'attente)
  canal TEXT DEFAULT 'sms',            -- 'sms' ou 'whatsapp'
  -- Statuts : 'attente_sms', 'validee', 'liste_attente', 'honoree', 'annulee'
  statut TEXT NOT NULL DEFAULT 'attente_sms',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  motif_annulation TEXT -- Valeurs possibles : 'libere' (essayé, pas acheté) ou 'no_show' (non honoré)
);

CREATE TABLE liste_attente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Statuts : 'en_attente', 'notifiee', 'reservee', 'annulee'
  statut TEXT NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour retrouver instantanément la cliente prioritaire (FIFO)
CREATE INDEX idx_liste_attente_ordre ON liste_attente (article_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.numeros_bloques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID REFERENCES public.boutiques(id) ON DELETE CASCADE,
  telephone TEXT NOT NULL,
  prenom TEXT,
  motif TEXT DEFAULT 'Blocage automatique (no-show)',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(boutique_id, telephone)
);

-- Index pour une vérification rapide à la réservation
CREATE INDEX IF NOT EXISTS idx_numeros_bloques_recherche 
ON numeros_bloques (boutique_id, telephone);

-- Politiques de sécurité RLS
ALTER TABLE numeros_bloques ENABLE ROW LEVEL SECURITY;

-- 2. Fonction déclenchée automatiquement à chaque mise à jour de réservation
CREATE OR REPLACE FUNCTION public.trigger_auto_blacklist_no_show()
RETURNS TRIGGER AS $$
DECLARE
  compteur_no_shows INT;
  id_boutique UUID;
  seuil_max INT;
BEGIN
  -- On déclenche uniquement quand une réservation passe en 'annulee' avec le motif 'no_show'
  IF (NEW.statut = 'annulee' AND NEW.motif_annulation = 'no_show')
     AND (OLD.motif_annulation IS DISTINCT FROM 'no_show') THEN

    -- Récupérer la boutique et son seuil paramétré (max_no_shows)
    SELECT a.boutique_id, COALESCE(b.max_no_shows, 2)
    INTO id_boutique, seuil_max
    FROM public.articles a
    JOIN public.boutiques b ON b.id = a.boutique_id
    WHERE a.id = NEW.article_id;

    -- Si le blocage automatique est activé (seuil_max > 0)
    IF seuil_max > 0 AND NEW.telephone_client IS NOT NULL THEN

      -- Compter le nombre total de no-shows de ce numéro pour cette boutique
      SELECT COUNT(*) INTO compteur_no_shows
      FROM public.reservations r
      JOIN public.articles a ON a.id = r.article_id
      WHERE a.boutique_id = id_boutique
        AND r.telephone_client = NEW.telephone_client
        AND r.motif_annulation = 'no_show';

      -- Si le seuil paramétré est atteint ou dépassé -> inscription en liste noire
      IF compteur_no_shows >= seuil_max THEN
        INSERT INTO public.numeros_bloques (boutique_id, telephone, prenom, motif)
        VALUES (
          id_boutique,
          NEW.telephone_client,
          NEW.prenom_client,
          'Blocage auto : ' || compteur_no_shows || ' no-show(s)'
        )
        ON CONFLICT (boutique_id, telephone) DO UPDATE
        SET prenom = COALESCE(EXCLUDED.prenom, public.numeros_bloques.prenom),
            motif = EXCLUDED.motif;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attacher le trigger sur la table reservations
DROP TRIGGER IF EXISTS trg_auto_blacklist_no_show ON public.reservations;
CREATE TRIGGER trg_auto_blacklist_no_show
AFTER UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_blacklist_no_show();


--------------------
------DATA---------
--------------------
INSERT INTO boutiques (slug, nom, telephone_pro, mot_de_passe_admin)
VALUES ('bisou-magique', 'Bisou Magique', '+33600000000', 'thonon74');

INSERT INTO articles (boutique_id, titre, taille, prix, photo_url)
SELECT id, 'Veste en jean Vintage Levi''s', 'T.38 / M', 45.00, 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=600'
FROM boutiques WHERE slug = 'bisou-magique';

INSERT INTO articles (boutique_id, titre, taille, prix, photo_url)
SELECT id, 'Robe fleurie Printemps', 'T.36 / S', 29.00, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600'
FROM boutiques WHERE slug = 'bisou-magique';

-- Exemple pour Bisou Magique (fermé dimanche=0 et lundi=1)
UPDATE boutiques 
SET jours_fermeture = '{0, 1}', heure_fermeture_soir = '18h30'
WHERE slug = 'bisou-magique';

-- Activer le RLS
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;

-- Autoriser tout le monde à lire les infos des boutiques (nécessaire pour afficher le nom et le téléphone)
/*CREATE POLICY "Lecture publique des boutiques"
ON boutiques FOR SELECT
USING (true);

-- 1. On retire le droit de lecture général au rôle public/anonyme
REVOKE SELECT ON public.boutiques FROM anon, authenticated;
*/

-- 2. On réattribue le SELECT uniquement sur les colonnes non sensibles
GRANT SELECT (
  id,
  nom,
  slug,
  telephone_pro,
  email,
  max_articles_par_client,
  heure_fermeture_soir,
  en_pause,
  message_pause,
  message_annonce,
  jours_fermeture,
  created_at
) ON public.boutiques TO anon, authenticated;

-- Activer le RLS
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Autoriser tout le monde à voir les articles
CREATE POLICY "Lecture publique des articles"
ON articles FOR SELECT
USING (true);

-- Autoriser l'insertion/modification (par exemple via l'interface admin de Marion ou l'API de réservation)
CREATE POLICY "Gestion des articles"
ON articles FOR ALL
USING (true)
WITH CHECK (true);

-- Activer le RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Autoriser la création d'une réservation lorsqu'une cliente clique sur le bouton
CREATE POLICY "Création de réservation publique"
ON reservations FOR INSERT
WITH CHECK (true);

-- Autoriser la lecture
CREATE POLICY "Lecture des réservations"
ON reservations FOR SELECT
USING (true);

CREATE POLICY "Acces public update reservations" ON reservations FOR UPDATE USING (true);
CREATE POLICY "Acces public suppression articles" ON articles FOR DELETE USING (true);
CREATE POLICY "Acces public suppression photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos-vitrine');
CREATE POLICY "Autoriser modification reglages boutique" ON boutiques FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Acces public upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos-vitrine');
CREATE POLICY "Acces public lecture photos" ON storage.objects FOR SELECT USING (bucket_id = 'photos-vitrine');

-- Politiques RLS (lecture/écriture publique pour inscription)
ALTER TABLE liste_attente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acces public insertion liste_attente" ON liste_attente FOR INSERT WITH CHECK (true);
CREATE POLICY "Acces public lecture liste_attente" ON liste_attente FOR SELECT USING (true);
CREATE POLICY "Acces public update liste_attente" ON liste_attente FOR UPDATE USING (true);
CREATE POLICY "Lecture publique liste noire" ON numeros_bloques FOR SELECT USING (true);
CREATE POLICY "Gestion liste noire" ON numeros_bloques FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 1. TABLE BOUTIQUES
-- ==============================================================================
ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

-- Supprimer d'anciennes politiques permissives si elles existent
DROP POLICY IF EXISTS "Autoriser modification reglages boutique" ON public.boutiques;
DROP POLICY IF EXISTS "Gestion boutiques" ON public.boutiques;
DROP POLICY IF EXISTS "Acces public boutiques" ON public.boutiques;
DROP POLICY IF EXISTS "Lecture publique des boutiques" ON public.boutiques;

-- Autoriser UNIQUEMENT la lecture (SELECT) pour afficher la vitrine
CREATE POLICY "Lecture publique des boutiques"
ON public.boutiques
FOR SELECT
TO anon, authenticated
USING (true);


-- ==============================================================================
-- 2. TABLE ARTICLES
-- ==============================================================================
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques d'écriture/suppression publiques
DROP POLICY IF EXISTS "Gestion des articles" ON public.articles;
DROP POLICY IF EXISTS "Acces public update articles" ON public.articles;
DROP POLICY IF EXISTS "Acces public suppression articles" ON public.articles;
DROP POLICY IF EXISTS "Lecture publique des articles" ON public.articles;

-- Autoriser UNIQUEMENT la lecture (SELECT) des articles de la vitrine
CREATE POLICY "Lecture publique des articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (true);


-- ==============================================================================
-- 3. TABLE RESERVATIONS
-- ==============================================================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques publiques
DROP POLICY IF EXISTS "Création de réservation publique" ON public.reservations;
DROP POLICY IF EXISTS "Lecture des réservations" ON public.reservations;
DROP POLICY IF EXISTS "Lecture publique reservations" ON public.reservations;
DROP POLICY IF EXISTS "Lecture réservations" ON public.reservations;

-- Pour les réservations, si vous affichez les réservations actives dans l'admin 
-- via le client public supabase, conservez uniquement le SELECT :
CREATE POLICY "Lecture réservations"
ON public.reservations
FOR SELECT
TO anon, authenticated
USING (true);

-- 1. Réactiver les permissions de base pour le rôle public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.boutiques TO anon, authenticated;
GRANT SELECT ON public.articles TO anon, authenticated;

-- 2. Vérifier que la politique de lecture RLS autorise tout le monde
DROP POLICY IF EXISTS "Lecture publique des boutiques" ON public.boutiques;

CREATE POLICY "Lecture publique des boutiques"
ON public.boutiques
FOR SELECT
TO anon, authenticated
USING (true);