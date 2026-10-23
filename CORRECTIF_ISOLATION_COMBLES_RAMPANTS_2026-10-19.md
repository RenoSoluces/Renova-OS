# Correctif Renova OS — isolation et aides (19/10/2026)

## Catalogue et devis
- Séparation des catégories : **Isolation des combles perdus**, **Isolation des rampants**, **Isolation par l’extérieur (ITE)**, **Isolation du plancher bas**, **Menuiseries**.
- Les anciennes références `combles` sont reclassées en `rampants`. Les anciennes références `murs` sont reclassées en `ite`.
- Ajout des références de combles perdus communiquées par Reno Soluces, en TVA 5,5 %, avec les prix HT fournis. Ces prix sont enregistrés comme prix installés indicatifs : aucun forfait pose ou évacuation n’est ajouté automatiquement, pour éviter un double comptage.
- Le sélecteur du catalogue est placé au-dessus des lignes du devis. Les catégories se sélectionnent en rangée et les produits s’affichent en grille pour limiter le défilement.

## Champs de conformité
- Les champs de résistance thermique et de surface ne s’affichent que pour une vraie ligne de produit d’isolation.
- Les lignes de prestation ajoutées automatiquement (« Pose — … » et « Évacuation des déchets — … ») ne reçoivent plus les champs techniques d’isolation.
- La surface d’isolation suit la quantité réelle de la ligne produit.

## Aides
- Combles perdus : MaPrimeRénov’ transmise par Reno Soluces — Bleu 25 €/m², Jaune 20 €/m², Violet 15 €/m², Rose non éligible en geste seul ; CEE BAR-EN-101 — Bleu 13 €/m², autres profils 10 €/m².
- Rampants/sarking : calcul séparé sur les produits dont la résistance thermique catalogue atteint R ≥ 6 m²·K/W, selon BAR-EN-102. L’injection/les billes ne sont pas exclues d’office : elles peuvent entrer dans le calcul si R ≥ 6 est effectivement renseigné. MaPrimeRénov’ suit le barème transmis pour les rampants : Bleu 25 €/m², Jaune 20 €/m², Violet 15 €/m², Rose non éligible en geste seul ; CEE Bleu 13 €/m², autres profils 10 €/m².
- ITE : le texte et le calcul de prime restent distincts (Bleu 12 €/m² ; Jaune, Violet et Rose 8 €/m²), sans inclure échafaudage/enduit dans la surface isolante.
- Les notes d’aide dans le devis changent selon la catégorie sélectionnée ; le texte général sur l’ITE n’est plus affiché lorsqu’on est sur les rampants ou les combles perdus.

## Migration Supabase à appliquer
`supabase/migrations/20261019090000_separer_combles_perdus_rampants.sql`

La migration reclassifie les anciennes catégories et insère les produits combles perdus. Elle n’a pas été appliquée à un projet Supabase depuis cet environnement.

## Validation
- Contrôle de syntaxe TypeScript effectué sans erreur de syntaxe signalée ; les erreurs restantes du contrôle isolé sont liées aux dépendances/modules non installés dans l’environnement.
- Build complet non confirmé : `node_modules` n’est pas présent et les dépendances n’ont pas été installées ici.
