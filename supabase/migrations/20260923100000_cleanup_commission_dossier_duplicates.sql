/*
# Nettoyage définitif : un seul mécanisme de génération des commissions

## Diagnostic complet (établi à partir d'un dump de la base réelle)

Trois mécanismes coexistaient pour générer une commission à la signature :

1. `trg_sync_commission_devis_signe` sur `devis` (migration du 12/09, versionnée) :
   quand `devis.statut` passe à 'signe', crée une ligne dans `commissions` avec
   `reference_type = 'devis'`, montant calculé depuis `commission_bareme`.
   → C'est CE mécanisme qui correspond au fonctionnement voulu et qui reste.

2. `fn_prepare_dossier_financier` (BEFORE) + `trg_sync_commission_dossier_signe`
   (AFTER) sur `dossiers` : jamais versionnés (créés directement dans Supabase),
   ils recalculent le même montant et créent une DEUXIÈME ligne dans `commissions`
   avec `reference_type = 'dossier'` au moment où le dossier passe à 'signe'
   (ce qui arrive dans la foulée de la signature du devis, cf. DevisPage.tsx).
   → Fait doublon avec le mécanisme n°1. Supprimé.

3. `fn_sync_commission_dossier` + `trg_sync_commission_dossier` : ajoutés par erreur
   dans `20260922090000_fix_commissions_dossiers.sql`. Ce trigger a la particularité
   de SUPPRIMER la ligne de commission dès que `dossiers.statut` n'est plus 'signe'
   (ex. passage en 'installation') — c'est ce qui expliquait que la commission
   calculée disparaissait après quelques instants. Supprimé.

Résultat après cette migration : une seule commission générée par devis signé
(mécanisme n°1), qui ne disparaît jamais quel que soit le statut ultérieur du
dossier. Les colonnes `prix_partenaire` / `commission_renova` /
`commission_commercial` sur `dossiers` n'étant plus utilisées par aucun trigger,
elles sont retirées (le front lit désormais la commission directement dans
`commissions`, via `reference_type = 'devis'` et `reference_id = dossiers.devis_id`).
*/

-- Mécanisme n°3 (le mien, celui qui supprimait la commission)
DROP TRIGGER IF EXISTS trg_sync_commission_dossier ON dossiers;
DROP FUNCTION IF EXISTS fn_sync_commission_dossier();

-- Mécanisme n°2 (pré-existant, non versionné, faisait doublon avec le n°1)
DROP TRIGGER IF EXISTS trg_sync_commission_dossier_signe ON dossiers;
DROP FUNCTION IF EXISTS fn_sync_commission_dossier_signe();

DROP TRIGGER IF EXISTS trg_prepare_dossier_financier ON dossiers;
DROP FUNCTION IF EXISTS fn_prepare_dossier_financier();

-- Fonction orpheline trouvée dans le dump (plus attachée à aucun trigger, jamais
-- utilisée) : on la supprime aussi par propreté.
DROP FUNCTION IF EXISTS creer_commission_dossier_signe();

-- Toute commission résiduelle générée par les mécanismes n°2/3 (reference_type =
-- 'dossier') est retirée : elle fait doublon avec celle du mécanisme n°1
-- (reference_type = 'devis') pour le même devis signé.
DELETE FROM commissions WHERE reference_type = 'dossier';

-- Plus aucun trigger ne dépend de ces colonnes : elles peuvent être retirées.
ALTER TABLE dossiers
  DROP COLUMN IF EXISTS prix_partenaire,
  DROP COLUMN IF EXISTS commission_renova,
  DROP COLUMN IF EXISTS commission_commercial;

/*
BUG RACINE trouvé en testant le rattrapage ci-dessous :

  ERROR 42P10: there is no unique or exclusion constraint matching the
  ON CONFLICT specification

L'index unique sur `commissions` est PARTIEL :
  CREATE UNIQUE INDEX uq_commissions_reference
    ON commissions(reference_type, reference_id) WHERE reference_id IS NOT NULL;

Or tous les triggers (y compris ceux d'origine : fn_sync_commission_vt et
fn_sync_commission_devis_signe) utilisent `ON CONFLICT (reference_type,
reference_id) DO ...` SANS répéter cette condition — Postgres exige que la
clause ON CONFLICT corresponde exactement à un index (y compris son prédicat
partiel) pour l'utiliser. Résultat concret : depuis le tout début, chaque fois
qu'un trigger tentait réellement d'insérer une commission (barème trouvé,
commercial assigné — donc dans les vrais cas d'usage), l'INSERT échouait. Cette
erreur ne remontait nulle part dans l'interface (les pages qui déclenchent ces
triggers avalent l'erreur avec un simple `console.error`), d'où l'impression
que "rien ne se passe".

Le prédicat partiel n'apporte rien ici (une contrainte unique standard traite
déjà chaque NULL comme distinct) : on le retire pour que l'index corresponde
enfin aux clauses ON CONFLICT existantes, sans avoir à toucher à chaque trigger.
*/
DROP INDEX IF EXISTS uq_commissions_reference;
CREATE UNIQUE INDEX IF NOT EXISTS uq_commissions_reference
  ON commissions(reference_type, reference_id);

-- Rattrapage : régénère la commission (mécanisme n°1) pour les devis déjà signés
-- qui n'en ont pas encore. On ne peut pas se contenter d'un simple
-- "UPDATE devis SET statut = statut" : le trigger ignore volontairement le cas
-- où le devis était déjà signé avant l'UPDATE (pour ne pas se redéclencher sur
-- une simple resauvegarde). On reproduit donc directement sa logique ici, en ne
-- traitant que les devis signés qui n'ont pas encore de commission.
INSERT INTO commissions (
  commercial_id, type, libelle, reference_type, reference_id,
  montant_commercial, montant_societe, statut
)
SELECT
  p.commercial_id,
  'devis_signe',
  'Devis signé — ' || COALESCE(d.numero, ''),
  'devis',
  d.id,
  COALESCE(r.montant_commercial, 0)
    + COALESCE(r.pourcentage_commercial, 0) / 100 * (
        CASE r.base_pourcentage
          WHEN 'reste_a_charge' THEN COALESCE(d.reste_a_charge, 0)
          WHEN 'montant_ttc' THEN COALESCE(d.montant_ttc, 0)
          ELSE COALESCE(d.montant_ht, 0)
        END
      ),
  COALESCE(r.montant_societe, 0),
  'en_attente'
FROM devis d
JOIN prospects p ON p.id = d.prospect_id
LEFT JOIN LATERAL (
  SELECT dl.produit_id
  FROM devis_lignes dl
  WHERE dl.devis_id = d.id AND dl.produit_id IS NOT NULL
  ORDER BY dl.ordre
  LIMIT 1
) prod ON true
CROSS JOIN LATERAL (
  SELECT * FROM fn_commission_rule(
    'devis_signe', p.commercial_id, prod.produit_id,
    COALESCE(d.date_creation::date, current_date)
  )
) r
WHERE d.statut = 'signe'
  AND p.commercial_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM commissions c
    WHERE c.reference_type = 'devis' AND c.reference_id = d.id
  )
ON CONFLICT (reference_type, reference_id) DO NOTHING;
