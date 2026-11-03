-- Dossiers « VT pures » (toutes les échéances non annulées sont des visites techniques) :
--  * CA généré = 250 € TTC par VT  -> dossiers.montant_total
--  * commission société = montant facturé au partenaire (somme des échéances VT, HT)
--  * commission commerciale = 100 € par VT
-- Les dossiers qui mélangent une VT et un autre chantier ne sont pas modifiés.
-- Rejouable : une commission déjà saisie pour le dossier n'est pas recréée.
ALTER TABLE dossiers DISABLE TRIGGER dossiers_notify_direct_manager;
ALTER TABLE dossiers DISABLE TRIGGER trg_notify_commercial_dossier_status;

CREATE TEMP TABLE vt_pures AS
SELECT d.id AS dossier_id, d.reference, d.organisation_id, pr.commercial_id,
       count(*) AS nb_vt, sum(f.montant_ht) AS ht
FROM dossiers d
JOIN prospects pr ON pr.id = d.prospect_id
JOIN dossier_facturation f ON f.dossier_id = d.id AND f.statut <> 'annulee'
GROUP BY d.id, d.reference, d.organisation_id, pr.commercial_id
HAVING bool_and(f.libelle ILIKE 'Visite technique%');

UPDATE dossiers d SET montant_total = 250 * v.nb_vt
FROM vt_pures v WHERE v.dossier_id = d.id;

INSERT INTO commissions (commercial_id, type, libelle, reference_type, reference_id, montant_commercial, montant_societe, statut, organisation_id)
SELECT v.commercial_id, 'dossier',
       'Dossier ' || coalesce(v.reference, left(v.dossier_id::text, 8)) || ' — ' || v.nb_vt || ' visite' || CASE WHEN v.nb_vt > 1 THEN 's' ELSE '' END || ' technique' || CASE WHEN v.nb_vt > 1 THEN 's' ELSE '' END,
       'dossiers', v.dossier_id, 100 * v.nb_vt, v.ht, 'en_attente', v.organisation_id
FROM vt_pures v
WHERE v.commercial_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM commissions c WHERE c.reference_type = 'dossiers' AND c.reference_id = v.dossier_id);

DROP TABLE vt_pures;

ALTER TABLE dossiers ENABLE TRIGGER dossiers_notify_direct_manager;
ALTER TABLE dossiers ENABLE TRIGGER trg_notify_commercial_dossier_status;
