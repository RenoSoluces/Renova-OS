# Intégration catalogue complémentaire — 19/10/2026

## Contenu

- Les SSC sont classés dans la section **Production d’eau chaude** du catalogue et de la création de devis (catégorie technique conservée : `ssc`, fiche BAR-TH-143).
- Migration idempotente `supabase/migrations/20261019220000_catalogue_ssc_menuiseries_vmc_plancher.sql` : 89 références de produits/prestations, comprenant plancher bas, SSC, solaire thermique, menuiseries extérieures — fenêtres et portes — et VMC.
- Les prix de fourniture sont séparés des forfaits de pose. Les offres explicitement « matériel + pose » sont marquées comme telles pour limiter le risque de double facturation de la pose.
- Les champs de caractéristiques stockent les valeurs utiles à la conformité (R, Uw/Sw à compléter, type de VMC, rendement, volumes et surfaces de capteurs).
- La conformité des SSC utilise BAR-TH-143. La VMC double flux utilise BAR-TH-125 et la simple flux hygroréglable BAR-TH-127.

## Important avant production

1. La migration doit être exécutée sur le bon projet Supabase après sauvegarde.
2. Les aides et primes mentionnées dans les caractéristiques sont **indicatives** et doivent être vérifiées avec la fiche CEE officielle applicable, le délégataire et le dispositif d'aide en vigueur à la date du dossier.
3. Les prix dits « complétés » ou moyens de marché restent des estimations commerciales, pas des tarifs fabricant certifiés.
4. Les champs Uw, Sw, justificatifs fabricant et critères exacts ne sont pas inventés : ils doivent être renseignés à partir des fiches techniques des modèles effectivement retenus.
5. La TVA à 5,5 % ne doit pas être considérée comme garantie pour toute ligne : le taux dépend des conditions légales, de la nature des travaux et de l'équipement. Les accessoires seuls peuvent relever d'un autre taux.

## Vérification

La compilation TypeScript n'a pas pu être validée dans cet environnement : l'installation des dépendances a expiré et a laissé des définitions de types incomplètes. Il faut lancer `npm install` puis `npm run build` dans l'environnement de développement avant déploiement. La migration n'a pas été appliquée à Supabase depuis cet environnement.


## Ajustements complémentaires — portes d’entrée

- Libellé fenêtres : « Menuiseries Extérieures - Fenêtres ».
- Nouvelle catégorie « Menuiseries Extérieures - Portes », avec les 17 modèles fournis et le forfait dépose totale/pose à 380 € HT.
- Les valeurs de primes CEE restent indicatives ; l’éligibilité doit être confirmée à partir de la fiche officielle et des justificatifs fabricant.
