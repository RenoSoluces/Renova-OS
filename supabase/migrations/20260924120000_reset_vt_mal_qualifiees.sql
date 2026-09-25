/*
# Nettoyage des VT mal qualifiées

Avant ce correctif, `vt_produit_id` était enregistré sur la VT avant même de
vérifier qu'un barème correspondait. Les tentatives de qualification qui ont
échoué ("aucun barème VT actif...") ont donc quand même laissé un produit
enregistré sur la VT, sans commission générée — ce qui la fait apparaître à
tort comme "déjà qualifiée" côté interface (bouton caché).

On réinitialise vt_produit_id à null pour toute VT terminée qui a un produit
enregistré mais aucune commission correspondante : elle redevient qualifiable
normalement, avec la liste de produits maintenant filtrée aux vrais types de VT.
*/

ALTER TABLE visites DISABLE TRIGGER trg_guard_vt_produit_admin;

UPDATE visites v
SET vt_produit_id = NULL
WHERE v.statut = 'terminee'
  AND v.vt_produit_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM commissions c
    WHERE c.reference_type = 'visites' AND c.reference_id = v.id
  );

ALTER TABLE visites ENABLE TRIGGER trg_guard_vt_produit_admin;
