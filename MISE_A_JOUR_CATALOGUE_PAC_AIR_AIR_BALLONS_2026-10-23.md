# Mise à jour catalogue — PAC air/air et ballons thermodynamiques (23/10/2026)

## Fichiers
- `supabase/migrations/20261024010000_catalogue_pac_air_air_par_marque.sql`
- `supabase/migrations/20261024020000_catalogue_ballons_thermodynamiques_par_marque.sql`
- `src/pages/CataloguePage.tsx` : le filtre « Marque » est maintenant aussi proposé pour les ballons thermodynamiques
  (liste unique `CATEGORIES_FILTRE_MARQUE`).

## PAC air/air — 200 références
Daikin 51 · Mitsubishi Electric 30 · LG 27 · Panasonic 26 · Atlantic 24 · Toshiba 23 · Airwell 15 · Mitsubishi Heavy Industries 4.

- 198 déjà présentes (import Excel du 20/10) mises à jour ; MHI-SCM71ZS-W et MHI-SCM80ZS-W créées si absentes (forfait de pose à 0).
- Caractéristiques ajoutées : configuration (Mono-split, Bi-split, Tri-split, Quadri-split, Penta-split,
  Multi-split 6 unités et plus, Unité intérieure), type d'élément (set complet / groupe extérieur / unité intérieure),
  nombre de sorties, puissance froid / chaud, `puissance` (contrôle BAR-TH-129), SCOP, SEER, classe, gamme, fluide.
- Unités intérieures (22) : composants sans fiche CEE, le contrôle BAR-TH-129 porte sur le groupe extérieur ou le set.
- 15 références libres normalisées (ancienne conservée dans `ancienne_reference`) :
  LG_MONO_STDPLUS_25/35/50/66KW → LG-PC09SK/PC12SK/PC18SK/PC24SK-SET ; UE_2SORTIES_4KW → LG-MU2R15 ;
  UE_2SORTIES_5KW → LG-MU2R17 ; UE_3SORTIES_6KW → LG-MU3R19 ; UE_3SORTIES_7KW → LG-MU3R21 ;
  GROUPE_EXTERIEUR_PAC_AIR_AIR_LG_MU4R27 → LG-MU4R27 ; UE_5SORTIES_10KW → LG-MU5R30 ;
  Airwell → AIRWELL-ZDAA-2050-09M25, AIRWELL-ZDAA-4090-09M25, AIRWELL-ZDAE-2050/4080/5130-09M25.
- Noms Airwell ZDAE et MHI réécrits au format standard du catalogue.
- 10 références sans prix (drapeau `prix_a_renseigner`).
- AIRWELL-ZDAA-5130-09M25 : 12,31 kW, au-delà du plafond de 12 kW de BAR-TH-129, signalé par le contrôle.
- DAIKIN-FTXJ35A9 et DAIKIN-FTXJ42A9 absents de la liste : non modifiés.

## Ballons thermodynamiques — 60 références
Thermor 15 · Atlantic 9 · Clivet 9 · Ariston 9 · Générique 6 · Daikin 4 · De Dietrich 4 · Toshiba 3 · Midea 1.

- Références BT… sans marque → « Générique » ; « BT-250L)MONO » corrigé en « BT-250L-MONO ».
- Champs BAR-TH-148 renseignés quand la donnée existe : `profil` (M / L / XL) et `efficacite` (ηwh %),
  plus volume, COP, fluide, monobloc / split, code article, gamme, classe.
- Correspondance aussi avec les références de la migration du 19/10 (ex. THERMOR-AEROMAX6-VERTICAL-150).
- BAR-TH-148, TVA 5,5 %, CEE oui, MPR non.
- Sans prix : BALLON THERMODYNAMIQUE (Toshiba), Midea 200 L, Toshiba Estia 190 / 260, Aéromax 5 (×4),
  Aéromax Split 2 (×2), Ariston Primo HC 240.
- Sans ηwh ni profil dans la liste : Clivet (profil seul), Atlantic Calypso / Egeo, Aéromax 5 / Split 2, Toshiba, Midea, génériques.
- Doublons probables laissés actifs : BT200L / BT_200L_SPLIT et BT270L / BT270LBIBLOC (même prix).

## Exécution
SQL Editor Supabase : exécuter les deux fichiers dans l'ordre. Ils sont rejouables.
