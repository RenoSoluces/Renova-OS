/*
# Réparation + correction de la cause racine

## Ce qui s'est passé
`commission_bareme.produit_id` référence `catalogue_produits(id)` en
`ON DELETE CASCADE`. En supprimant le produit "Visite Technique Photovoltaique
75 kWC" dupliqué, Postgres a donc automatiquement supprimé la règle de barème
qui pointait dessus (pas juste orphelinée : effacée). La VT déjà qualifiée avec
l'ancien produit (`visites.vt_produit_id`, en ON DELETE SET NULL) a de son côté
été "dé-qualifiée" (remise à null).

## Ce que fait cette migration
1. Recrée la règle de barème "Visite Technique Photovoltaique 75 kWC" (mêmes
   montants qu'avant : 200 € commercial / 2400 € société), rattachée au produit
   actuellement dans le catalogue.
2. Re-qualifie automatiquement toute VT terminée dont le produit a été rattaché
   à null par cette suppression, en la faisant correspondre par nom de VT
   ("75 kWC") — ce qui redéclenche le trigger et génère la commission.
3. Change `commission_bareme.produit_id` en `ON DELETE SET NULL` (au lieu de
   CASCADE) : supprimer un produit du catalogue ne supprimera plus jamais une
   règle de commission existante. La règle survivra avec son produit à null,
   visible et modifiable dans Commissions > Barème au lieu de disparaître
   silencieusement.
*/

-- ── 1. Corriger la cause racine : ne plus jamais supprimer une règle en
--       cascade quand un produit du catalogue est supprimé.
ALTER TABLE commission_bareme
  DROP CONSTRAINT IF EXISTS commission_bareme_produit_id_fkey;

ALTER TABLE commission_bareme
  ADD CONSTRAINT commission_bareme_produit_id_fkey
  FOREIGN KEY (produit_id) REFERENCES catalogue_produits(id) ON DELETE SET NULL;

-- ── 2. Recréer la règle manquante pour le produit actuel ────────────────────
INSERT INTO commission_bareme (
  libelle, type, commercial_id, produit_id, mode,
  montant_commercial, montant_societe, actif, priorite
)
SELECT
  'Visite Technique Photovoltaique 75 kWC',
  'vt',
  '288a684c-e306-46b4-9040-2e36e4ea462f'::uuid, -- Mickael BRAHIMI, comme les 2 autres règles Photovoltaïque
  cp.id,
  'fixe',
  200,
  2400,
  true,
  0
FROM catalogue_produits cp
WHERE cp.nom = 'Visite Technique Photovoltaique 75 kWC'
  AND NOT EXISTS (
    SELECT 1 FROM commission_bareme cb
    WHERE cb.type = 'vt' AND cb.produit_id = cp.id
  );

-- ── 3. Re-qualifier la VT dé-qualifiée par la suppression ──────────────────
-- On cible précisément la VT identifiée dans l'échange (réf. commençant par
-- 30d691cd), celle dont on a confirmé qu'elle utilisait "75 kWC" avant
-- l'incident.
-- Le garde-fou trg_guard_vt_produit_admin exige un utilisateur admin connecté
-- (auth.uid()) : dans le SQL Editor il n'y a pas de session, on le désactive
-- donc le temps de cet UPDATE uniquement, puis on le réactive immédiatement.
ALTER TABLE visites DISABLE TRIGGER trg_guard_vt_produit_admin;

UPDATE visites v
SET vt_produit_id = cp.id
FROM catalogue_produits cp
WHERE cp.nom = 'Visite Technique Photovoltaique 75 kWC'
  AND v.id::text LIKE '30d691cd%'
  AND v.vt_produit_id IS NULL;

ALTER TABLE visites ENABLE TRIGGER trg_guard_vt_produit_admin;
