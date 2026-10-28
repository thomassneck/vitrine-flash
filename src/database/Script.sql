-- 1. TABLE DES BOUTIQUES (Multi-commerces pour Thonon)
CREATE TABLE boutiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- ex: 'bisou-magique' (pour l'URL vitrine.app.fr/bisou-magique)
  nom TEXT NOT NULL,                   -- ex: 'Bisou Magique'
  telephone_pro TEXT NOT NULL,         -- ex: '+33612345678' (le 06 de Marion qui reçoit le SMS/WhatsApp)
  email TEXT,
  mot_de_passe_admin TEXT NOT NULL,    -- Code simple ou hash pour l'accès vendeuse
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
  
  -- Statuts possibles : 'disponible', 'pre_reserve' (15 min), 'confirme' (jusqu'au soir), 'vendu'
  statut TEXT NOT NULL DEFAULT 'disponible',
  
  -- Gestion des expirations automatiques (Anti-fantôme & fin de journée)
  pre_reserve_jusqua TIMESTAMPTZ,      -- Heure du clic + 15 minutes
  reserve_jusqua TIMESTAMPTZ,          -- ex: Aujourd'hui à 18h00
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DES RÉSERVATIONS & LISTE D'ATTENTE
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_resa TEXT UNIQUE NOT NULL,      -- ex: 'BM-402' (affiché dans le SMS de la cliente)
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  prenom_cliente TEXT NOT NULL,        -- ex: 'Julie'
  telephone_cliente TEXT,              -- Optionnel (pour la liste d'attente)
  canal TEXT DEFAULT 'sms',            -- 'sms' ou 'whatsapp'
  
  -- Statuts : 'attente_sms', 'validee_cabine', 'liste_attente', 'honoree', 'annulee'
  statut TEXT NOT NULL DEFAULT 'attente_sms',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Activer le RLS
ALTER TABLE boutiques ENABLE ROW LEVEL SECURITY;

-- Autoriser tout le monde à lire les infos des boutiques (nécessaire pour afficher le nom et le téléphone)
CREATE POLICY "Lecture publique des boutiques"
ON boutiques FOR SELECT
USING (true);

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

-- 2. Renseigne l'e-mail pour votre première boutique (Bisou Magique)
UPDATE boutiques 
SET email = 'contact@bisou-magique.fr' 
WHERE slug = 'bisou-magique';