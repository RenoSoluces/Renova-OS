# Extension du catalogue fabricants — 18 octobre 2026

Ajout d'une migration idempotente `supabase/migrations/20261018190000_catalogue_fabricants_lg_daikin_comwatt.sql` avec des références produits et caractéristiques publiques confirmées sur les pages officielles LG Business France, Daikin France et Comwatt.

- LG THERMA V : HM051MRS UA40, HM071MRS UA40, HM123MRS UB40, HM163MRS UB40.
- Daikin Altherma : EPBX14A4V, EPBX14A9W, EPVX14A4V, EBVH-D6V, EBVH-D9W.
- Comwatt : gestionnaire COMPACT/GEN4, module SG Ready et SmartPlug (références commerciales à confirmer selon le pack réellement fourni).

Les produits sont créés à 0 € HT afin de ne pas inventer de prix. Aucune éligibilité MPR/CEE n'est déclarée automatiquement. Les références correspondant à une unité intérieure seule sont signalées comme nécessitant une combinaison compatible. Les caractéristiques issues des pages fabricant sont enregistrées avec l'URL source.

Cette extension n'a pas été appliquée à Supabase. Avant `db push`, vérifier que le projet Supabase lié est bien celui de Renova OS. Cette archive est basée sur `Renova-OS-catalogue-technique.zip` présent dans la bibliothèque, pas sur une nouvelle archive fournie aujourd'hui par l'utilisateur; elle doit donc être comparée au dernier dossier local avant remplacement.
