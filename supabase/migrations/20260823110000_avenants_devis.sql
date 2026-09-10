/*
# RENOVA OS — Avenants de devis

Un devis signé ne doit plus être modifiable (valeur juridique du "bon pour
accord"). Pour un client qui souhaite ajouter ou modifier des travaux après
signature, on crée un **avenant** : un nouveau devis distinct, rattaché au
devis d'origine, numéroté en suffixe (ex: DEV-20260823-1234-AV1).

- `devis.devis_parent_id` : devis d'origine dont celui-ci est un avenant (null si devis normal)
- `devis.numero_avenant` : rang de l'avenant (1, 2, 3...) pour un même devis d'origine
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devis' AND column_name='devis_parent_id') THEN
    ALTER TABLE devis ADD COLUMN devis_parent_id uuid REFERENCES devis(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='devis' AND column_name='numero_avenant') THEN
    ALTER TABLE devis ADD COLUMN numero_avenant integer NOT NULL DEFAULT 0;
  END IF;
END $$;
