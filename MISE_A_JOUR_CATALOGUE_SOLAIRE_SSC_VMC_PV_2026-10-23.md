# Mise à jour catalogue — solaire thermique, SSC, VMC et production d'électricité — 23/10/2026

Source : liste de produits du catalogue partenaire fournie le 23/10/2026 (prix HT du partenaire).

## Migrations ajoutées (`supabase/migrations/`)

| Migration | Contenu |
|---|---|
| `20261024030000_catalogue_solaire_thermique_cesi_partenaire.sql` | 32 références solaire thermique (catégorie `solaire_thermique`, BAR-TH-168) : ballons et préparateurs De Dietrich Inisol Uno, packs toit De Dietrich, Giordano Giorsol (ATV, P, kits), Saunier Duval HelioSet, Viessmann Vitosol 141-FM, Chaffoteaux Zelios Easy |
| `20261024040000_catalogue_ssc_partenaire.sql` | 5 systèmes solaires combinés (catégorie `ssc`, BAR-TH-143) : Pack F 4 PV, Ecoya, Thermador Astrea, De Dietrich Quadro 700, Chappée WSC 400 |
| `20261024050000_catalogue_production_electricite_3_categories.sql` | « Production d'électricité » séparée en 3 : Panneaux photovoltaïques, Batterie de stockage (`batterie_stockage`), Domotique (`domotique`) |
| `20261024060000_catalogue_vmc_partenaire.sql` | 68 références VMC (catégorie `vmc`) : simple flux hygroréglable (BAR-TH-127), double flux (BAR-TH-125), bouches, gaines et forfaits génériques |

## Interface

- `CataloguePage.tsx` : nouvelles catégories « Batterie de stockage » et « Domotique », rangées sous « Production d'électricité », avec le filtre par marque.
- `DevisPage.tsx` : catégorie « Domotique » ajoutée (la catégorie « Batterie de stockage » existait déjà dans le devis) et rattachée à la famille « électricité ».

## Règles appliquées

- **Aucun doublon** : chaque produit est rapproché par sa référence partenaire, ou par l'ancienne référence de la migration du 19/10/2026 (43 correspondances prévues, ex. `SOL-PACK-DD-DH200-1CAP` → `CESI-DD-PACK-1-DH200SL`). L'ancienne référence est conservée dans `caracteristiques.ancienne_reference`.
- **Prix** : le prix partenaire est appliqué quand il est renseigné. « Prix à renseigner » et « 0,00 € HT » ne remplacent jamais un prix existant ; une nouvelle référence sans prix est créée à 0 avec `caracteristiques.prix_a_renseigner = true` (même convention que les ballons thermodynamiques).
- Forfaits de pose et d'évacuation, unités et descriptions déjà saisies ne sont pas écrasés. Quand le libellé partenaire n'est qu'un code (ex. `VMC-SIMPLEFLUXHYGROB`), le nom existant est conservé.
- Fiches CEE, TVA 5,5 % et éligibilités reprennent celles des lignes déjà présentes dans les mêmes catégories. Elles sont **indicatives** (`aides_a_verifier`) : à confirmer avec la fiche en vigueur et le dossier.
- Si une ancienne référence et la référence partenaire existent toutes deux en base, la référence partenaire est mise à jour et l'autre ligne reste active : le nombre de doublons probables est affiché dans le message `NOTICE` de la migration, à traiter à la main.

## Répartition « Production d'électricité »

- **Batterie de stockage** : batteries seules (Victron / RENON Xtreme LV, batterie additionnelle RENON, Huawei LUNA2000-S1, Enphase IQ Battery 5P, batterie résidentielle du catalogue de base).
- **Domotique** : accessoires Comwatt (COMPACT, module SG Ready, SmartPlug).
- **Panneaux photovoltaïques** : installations DMEGC + APS + Comwatt et kits « photovoltaïque + batterie ». Ces kits sont vendus au kWc ; pour les ranger en « Batterie de stockage », voir le commentaire en tête de la migration `…050000`.
- La création de devis à partir d'une simulation photovoltaïque sélectionne le produit `photovoltaique` le moins cher : sortir les batteries et la domotique (dont certaines à 0 €) de cette catégorie évite de les sélectionner par erreur.

## À vérifier avant production

1. Exécuter sur le bon projet Supabase, après sauvegarde.
2. 28 références de la liste n'ont pas de prix partenaire : 26 « Prix à renseigner » (Giordano, Saunier Duval, Viessmann, Chaffoteaux, 5 kits Nather MAESTRO) et 2 à 0,00 € HT (SSC Pack F 4 PV, VMC Hygro A Infinity). 5 d'entre elles ont déjà un prix en catalogue (migration du 19/10), conservé ; les 23 autres restent à compléter.
3. La mention « Puissance 12,1 kW » sur `VMC_SIMPLEFLUX` et `VMC_SIMPLEFLUXHYGROB` n'est pas reprise (incohérente pour une VMC).
4. `npm install` puis `npm run build` à lancer en environnement de développement : la compilation TypeScript n'a pas été exécutée ici.

## Vérification effectuée

Les 4 migrations ont été exécutées sur un PostgreSQL 16 de test après rejeu des migrations catalogue des 18 et 20/10/2026 : 105 références rapprochées ou créées, aucune référence en double, prix et fiches CEE existants conservés, second passage sans aucune modification (empreinte de la table identique), exécution correcte également sur une base sans ces produits.
