# Mise à jour du catalogue technique — 18 octobre 2026

Cette livraison conserve l'interface actuelle de Renova OS : aucune refonte visuelle n'est incluse.

## Contenu

Une migration Supabase est ajoutée :
`supabase/migrations/20261018120000_catalogue_technique_sources_fournies.sql`

Elle enrichit ou ajoute 30 fiches produits à partir des sources communiquées :
- ITE PRB THERMOLOOK EMI ANCIEN, PSE 170 mm (caractéristiques communiquées directement) ;
- quatre PAC air/air Panasonic du tarif Excel et les plus-values bi-split / tri-split ;
- PAC Panasonic BZ tirée du devis Idehome du 18/09/2026 ;
- ballons thermodynamiques monobloc et bi-bloc du tarif Excel ;
- VMC hygroréglable Atlantic (référence exacte à compléter) ;
- systèmes de stockage Victron / RENON Xtreme LV ;
- kits photovoltaïques DMEGC 500 Wc + micro-onduleurs APS DS3H avec stockage, de 1 à 18 kWc ;
- isolation soufflée ISOVER ISOLENE 4 R7.

## Prix et confidentialité

Pour les lignes disposant d'un tarif TTC dans le classeur, le champ `prix_unitaire_ht` est calculé en divisant le tarif TTC par le taux de TVA indiqué dans la source. Le champ `tva_taux` reprend ce taux source. **Ces taux sont à confirmer avant émission d'un devis** : la migration ne constitue pas une validation de l'éligibilité fiscale du chantier.

Les coûts d'achat et de pose du classeur ne sont pas placés dans les caractéristiques techniques, car ces caractéristiques peuvent être consultées par les commerciaux. Aucun montant d'aide n'est ajouté. Les tarifs de juillet 2025 pour les kits PV sans batterie ne remplacent pas les tarifs plus récents d'août 2026.

Les produits dont aucun prix n'est fourni (ITE et VMC Atlantic) restent à 0 HT jusqu'à saisie par un administrateur.

## Points à confirmer

- La référence exacte du modèle Atlantic de VMC hygroréglable.
- La marque et les références précises des ballons thermodynamiques : le classeur ne les renseigne pas.
- Le classeur écrit « VITRON » pour un système triphasé ; la fiche indique Victron à confirmer.
- Le classeur indique 15,63 kWh pour les kits photovoltaïques 12 et 18 kWc, alors que les lignes 10 et 11 kWc indiquent 15,36 kWh. La valeur 15,63 a été conservée et signalée, sans correction arbitraire.
- La fiche d'isolation combles mentionne BAR-EN-101 comme référence de source, sans ajouter de montant de prime.

## Installation

Depuis la racine du projet, après vérification du projet Supabase cible :

```bash
npx supabase link --project-ref VOTRE_REF_SUPABASE
npx supabase db push
```

Vérifier que la référence Supabase est bien celle de Renova OS avant d'exécuter la migration. La migration n'a pas été appliquée à un projet Supabase distant depuis cette livraison.
