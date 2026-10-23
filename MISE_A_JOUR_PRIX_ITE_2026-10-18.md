# Mise à jour Renova OS — tarifs ITE (18 octobre 2026)

- Les prix de fourniture et de pose/accessoires sont séparés dans le catalogue.
- Lorsqu'un produit est ajouté au devis, Renova OS crée une ligne de fourniture et une ligne « Pose — … » si le forfait de pose est renseigné.
- Les taux de TVA sont renseignés d'après les indications fournies par Reno Soluces.
- Les tarifs sont enregistrés en HT, car le devis calcule la TVA à partir de `tva_taux`. Les montants fournis pour la fourniture et la pose sont conservés tels quels.
- Pour Rockfaçade 130 mm, Rockfaçade 150 mm, Rockfaçade Premium 120 mm, Isofaçade 32R 120 mm et Smartfaçade 32/35 BR, le total HT comprend le prix du matériau seul et le forfait pose/accessoires annoncé.
- Le produit générique nommé exactement « Isolation » est désactivé dans les catégories d'isolation particulières, plutôt que supprimé physiquement, afin de préserver les éventuels devis historiques.
- L'échafaudage (`FAC_ECHAFAUDAGE`, 24 €/m² HT, TVA 10 %) et l'enduit (`FAC_ENDUIT`, 72 €/m² HT, TVA 10 %) conservent leurs tarifs dédiés dans la migration ITE précédente.

## À appliquer

Appliquer la migration `20261018230000_prix_ite_fourniture_pose_et_nettoyage.sql` au bon projet Supabase Renova OS après avoir vérifié son identifiant. Cette archive n'applique pas elle-même la migration à Supabase.
