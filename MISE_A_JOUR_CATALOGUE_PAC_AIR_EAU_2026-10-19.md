# Mise à jour du catalogue PAC air/eau — 19 octobre 2026

## Contenu importé
- 200 références extraites du texte transmis par Reno Soluces.
- 171 références disposent d'un prix HT dans la source.
- 29 références sont indiquées « Prix à renseigner » et ne reçoivent pas de prix inventé.
- Les fiches comprennent des packs complets ainsi que des composants vendus séparément (modules intérieurs et unités extérieures).
- Les informations disponibles (marque, référence, description, gamme, puissance, SCOP et ETAS lorsqu'ils figurent dans la source) sont conservées dans le catalogue.

## Règles de préservation
- Le prix HT communiqué est enregistré dans `prix_unitaire_ht`.
- Pour les produits existants, `forfait_pose_ht`, `eligible_mpr`, `eligible_cee` et `fiche_cee` ne sont pas modifiés.
- Pour les nouveaux produits, aucun forfait de pose ni montant d'aide n'est inventé. Les indicateurs d'aide sont laissés à `false` jusqu'à vérification documentaire et le forfait de pose doit être renseigné séparément.
- Les 29 produits sans prix conservent leur prix actuel s'ils existaient déjà; sinon, ils sont créés à 0 HT avec l'information « Prix à renseigner » dans leurs caractéristiques.
- Les données techniques et d'éligibilité doivent être vérifiées sur la fiche officielle correspondant à la configuration exacte avant d'établir un devis ou de déclarer une éligibilité MPR/CEE.

## Application
La migration SQL ajoutée est `supabase/migrations/20261019235000_catalogue_pac_air_eau_tarifs_2026.sql`.
Elle n'est pas appliquée automatiquement à Supabase par la génération de ce ZIP.
