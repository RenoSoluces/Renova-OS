/*
# Rattrapage des commissions de visites techniques (VT)

Le trigger `trg_sync_commission_vt` sur `planning_events` utilisait la même
clause `ON CONFLICT (reference_type, reference_id)` que celle qui posait
problème pour les devis signés (cf. `20260923100000_cleanup_commission_dossier_duplicates.sql`,
index partiel corrigé). Toute VT posée avant cette correction, avec un barème
correspondant, n'a donc jamais eu sa commission réellement enregistrée.

On régénère ici les commissions manquantes pour les VT déjà posées, sans toucher
à celles qui existent déjà (ON CONFLICT DO NOTHING).
*/

INSERT INTO commissions (
  commercial_id, type, libelle, reference_type, reference_id,
  montant_commercial, montant_societe, statut
)
SELECT
  pe.user_id,
  'vt',
  'Visite technique — ' || COALESCE(pe.titre, ''),
  'planning_events',
  pe.id,
  COALESCE(pe.commission_montant_commercial, r.montant_commercial, 0),
  COALESCE(pe.commission_montant_societe, r.montant_societe, 0),
  'en_attente'
FROM planning_events pe
LEFT JOIN LATERAL (
  SELECT * FROM fn_commission_rule('vt', pe.user_id, pe.produit_id, pe.date)
) r ON true
WHERE pe.type = 'visite'
  AND pe.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM commissions c
    WHERE c.reference_type = 'planning_events' AND c.reference_id = pe.id
  )
ON CONFLICT (reference_type, reference_id) DO NOTHING;
