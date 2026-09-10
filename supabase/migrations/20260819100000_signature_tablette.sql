/*
# Signature manuscrite sur tablette

Ajoute les champs nécessaires pour capturer une signature manuscrite directement sur
tablette (signature en direct chez le client), en complément de signature_statut /
signature_provider / signature_document_url déjà existants (prévus pour un futur
prestataire de signature électronique à distance).

- signature_image_data : image PNG (base64 data URL) du tracé de signature
- signature_nom_signataire : nom confirmé par le signataire au moment de signer
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devis' AND column_name = 'signature_image_data') THEN
    ALTER TABLE devis ADD COLUMN signature_image_data text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'devis' AND column_name = 'signature_nom_signataire') THEN
    ALTER TABLE devis ADD COLUMN signature_nom_signataire text;
  END IF;
END $$;
