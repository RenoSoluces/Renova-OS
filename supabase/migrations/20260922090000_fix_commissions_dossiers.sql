/*
# Correctif : les commissions n'apparaissaient jamais

## Diagnostic
Le "nouveau modèle financier" utilisé par DossiersPage.tsx et CommissionsPage.tsx
(prix_partenaire, commission_renova, commission_commercial saisis directement sur un
dossier) s'appuie sur des colonnes qui n'ont jamais été créées sur la table `dossiers`.

Conséquence concrète :
- Dans DossiersPage, `enregistrerFinance()` fait un `UPDATE dossiers SET
  prix_partenaire=…, commission_renova=…, commission_commercial=…` : cette requête
  échoue à chaque fois (colonne inexistante), donc rien n'est jamais enregistré.
- Même en supposant l'enregistrement réussi, aucun trigger ne crée la ligne
  correspondante dans `commissions` (reference_type = 'dossier'), alors que
  CommissionsPage.tsx attend précisément ce type de ligne pour l'affichage — le
  code d'enrichissement existe déjà côté front mais n'a jamais eu de données à lire.

Résultat : ni le commercial ni la société ne voient de commission pour les dossiers
signés.

## Correction
1. Ajout des 3 colonnes manquantes sur `dossiers`.
2. Trigger `fn_sync_commission_dossier` : quand un dossier passe (ou est déjà) au
   statut 'signe' avec un montant de commission renseigné, une ligne est
   automatiquement créée/mise à jour dans `commissions` (reference_type='dossier'),
   rattachée au commercial du prospect — sur le même principe que les triggers déjà
   en place pour les VT et les devis signés. Si le dossier n'est plus signé ou que
   les montants repassent à 0, la commission générée est retirée.
*/

-- ── 1. Colonnes financières manquantes ──────────────────────────────────────
ALTER TABLE dossiers
  ADD COLUMN IF NOT EXISTS prix_partenaire numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_renova numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_commercial numeric(12,2) DEFAULT 0;

-- ── 2. Génération automatique de la commission liée au dossier ─────────────
CREATE OR REPLACE FUNCTION fn_sync_commission_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commercial_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM commissions WHERE reference_type = 'dossier' AND reference_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.statut = 'signe'
     AND (COALESCE(NEW.commission_commercial, 0) > 0 OR COALESCE(NEW.commission_renova, 0) > 0)
  THEN
    SELECT p.commercial_id INTO v_commercial_id FROM prospects p WHERE p.id = NEW.prospect_id;

    IF v_commercial_id IS NULL THEN
      -- Pas de commercial rattaché au prospect : rien à générer.
      DELETE FROM commissions WHERE reference_type = 'dossier' AND reference_id = NEW.id;
      RETURN NEW;
    END IF;

    INSERT INTO commissions (
      commercial_id, type, libelle, reference_type, reference_id,
      montant_commercial, montant_societe, statut
    ) VALUES (
      v_commercial_id, 'dossier_signe', 'Dossier signé — ' || COALESCE(NEW.reference, ''),
      'dossier', NEW.id,
      COALESCE(NEW.commission_commercial, 0), COALESCE(NEW.commission_renova, 0), 'en_attente'
    )
    ON CONFLICT (reference_type, reference_id) DO UPDATE SET
      commercial_id = EXCLUDED.commercial_id,
      libelle = EXCLUDED.libelle,
      montant_commercial = EXCLUDED.montant_commercial,
      montant_societe = EXCLUDED.montant_societe;
  ELSE
    -- Dossier non signé, ou plus aucun montant de commission : on retire la commission liée.
    DELETE FROM commissions WHERE reference_type = 'dossier' AND reference_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_commission_dossier ON dossiers;
CREATE TRIGGER trg_sync_commission_dossier
  AFTER INSERT OR UPDATE OF statut, commission_commercial, commission_renova OR DELETE
  ON dossiers
  FOR EACH ROW EXECUTE FUNCTION fn_sync_commission_dossier();

-- Rattrapage : dossiers déjà signés avec des montants renseignés avant ce correctif
-- (aucun cas normalement, puisque l'enregistrement échouait, mais on couvre le cas
-- où les colonnes auraient été ajoutées manuellement entre-temps).
UPDATE dossiers SET statut = statut WHERE statut = 'signe';
