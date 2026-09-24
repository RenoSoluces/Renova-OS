/*
# Règle de barème générique (filet de sécurité)

Constat : les 5 règles existantes dans `commission_bareme` sont toutes liées à un
commercial ET un produit précis. `fn_commission_rule` donne toujours la priorité
aux règles les plus spécifiques (commercial + produit > l'un des deux > aucun des
deux), donc ajouter une règle générique ici est sans risque : elle ne sera
utilisée QUE quand rien de plus précis n'existe pour ce commercial/produit.

Sans cette règle, un devis signé ou une VT sur un produit non couvert crée bien
une commission (le trigger le fait toujours), mais à 0 €.

Les montants ci-dessous sont des valeurs de départ à ajuster immédiatement dans
Commissions > Barème (l'écran le permet déjà) — ce ne sont pas des valeurs
métier, juste un filet pour que plus aucune commission ne reste bloquée à 0 €
faute de règle.
*/

INSERT INTO commission_bareme (
  libelle, type, commercial_id, produit_id, mode,
    montant_commercial, montant_societe,
      pourcentage_commercial, base_pourcentage,
        actif, priorite
        ) VALUES
          ('Règle générique — devis signé', 'devis_signe', NULL, NULL, 'fixe', 50, 100, NULL, 'montant_ht', true, 0),
            ('Règle générique — VT', 'vt', NULL, NULL, 'fixe', 20, 0, NULL, 'montant_ht', true, 0);
            