# Correctifs audit CEE — 23/10/2026

À appliquer : déployer le front, puis exécuter la migration `supabase/migrations/20261023190000_correctifs_audit_catalogue_cee.sql`.

## Catalogue (5 points signalés)

| Problème | Correction | Fichiers |
|---|---|---|
| Descriptions Atlantic « Fiche CEE de référence… » jugées contaminées | `nettoyerDescriptionProduit` retire ces mentions (affichage, PDF, enregistrement) ; la migration nettoie les descriptions en base (Atlantic et De Dietrich) | `CataloguePage.tsx`, migration 20261023190000 |
| `prix_a_renseigner = true` réappliqué sur des produits déjà chiffrés | Un prix > 0 prime toujours sur ce drapeau (formulaire, liste, PDF, audit tarifs) ; la migration Atlantic ne remet plus le drapeau si un prix existe ; la nouvelle migration supprime les drapeaux devenus faux | `CataloguePage.tsx`, `20261023150000_…atlantic…sql`, migration 20261023190000 |
| Échafaudage, enduit et consommables soumis aux contrôles de fiche (R, marque…) et au contrôle « pose » | Nouvelle fonction `estPrestationSansFiche` ; `ficheDuProduit` renvoie null pour ces postes (catalogue et devis) ; pas de contrôle de pose pour eux ; la migration passe FAC_ECHAFAUDAGE / FAC_ENDUIT en `eligible_cee=false` | `conformite.ts`, `CataloguePage.tsx` |
| Fenêtres : clés `coefficient_Uw_W_m2K` / `facteur_solaire_Sw` non reconnues | Alias ajoutés pour Uw, Sw et `type_menuiserie` (fenetre, porte_fenetre, fenetre_de_toit) ; accessoires (`type_menuiserie = accessoire`) hors BAR-EN-104 | `conformite.ts` |
| Fiches BAT-* « non intégrées » bloquées à vie dans « À auditer » | N'est plus comptée comme anomalie ; la pastille indique « Règles non intégrées — contrôle manuel » | `CataloguePage.tsx` |

## Conformité CEE / MaPrimeRénov' (audit)

- MaPrimeRénov' par geste (dossiers déposés à partir du 01/09/2026) : isolation, menuiseries, VMC et chauffe-eau thermodynamique ne génèrent plus d'aide (`eligibleParcoursGeste: false`, retirés de `CATEGORIE_VERS_GESTE_MPR`). Il n'y a plus d'ajout automatique de MPR rampants ou combles perdus. Pour un dossier déposé avant cette date, passer `MPR_ISOLATION_PAR_GESTE_ACTIF` à `true` (`calculDevis.ts`).
- Combles perdus : l'aide MPR automatique est maintenant bien supprimée quand la surface retombe à 0.
- Prime CEE rampants : la fiche passe de BAR-EN-102 à BAR-EN-101.
- Fiches de référence des estimations CEE : PAC air/eau passe de BAR-TH-104 (abrogée) à BAR-TH-171 ; murs passent de BAR-EN-103 à BAR-EN-102 ; combles = BAR-EN-101 ; la VMC devient « simple flux hygroréglable » (BAR-TH-127).
- Les gestes `isolation_rampants` et `isolation_combles_perdus` ne donnent plus 0 € : ils reprennent le coefficient combles (BAR-EN-101).
- Forfaits CEE avec une quantité supérieure à 1 : un avertissement est ajouté (le forfait n'est pas multiplié).
- BAR-TH-171 : la classe du régulateur est lue même avec une mention longue (ex. « VI (à confirmer…) »).
- BAR-TH-127 : l'option « Sans objet » est retirée de l'avis technique, car elle bloquait toujours le devis.
- Qualification RGE : une date de validité vide bloque désormais le devis aidé.
- Isolation (BAR-EN-101/102/103) : une visite préalable postérieure à la signature bloque le devis.
- Bonification 01/09–31/12/2026 : BAR-TH-162 est ajoutée.

## Vérifications

- Tests de régression (moteur de conformité et calcul des aides) : résultats conformes aux attentes.
- `tsc --noEmit` : aucune erreur de type, il ne reste que des avertissements de variables inutilisées, déjà présents avant les correctifs.
