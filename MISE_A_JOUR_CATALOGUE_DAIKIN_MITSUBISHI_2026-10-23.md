# Catalogue Daikin et Mitsubishi Electric — PAC air/eau (23/10/2026)

Migration : `supabase/migrations/20261023230000_catalogue_daikin_mitsubishi_pac_air_eau.sql`
À exécuter **après** `20261023210000_catalogue_hitachi_pac_air_eau_68_references.sql`.

## Constat
L'import du 19/10/2026 s'est arrêté à 200 lignes : une partie des produits Daikin et Mitsubishi n'a jamais été importée.
L'import Excel du 20/10/2026 avait aussi créé 6 doublons sous des références différentes.

| Marque | Liste du 23/10 | Déjà en base | Ajoutés |
|---|---|---|---|
| Daikin | 197 | 102 | **95** |
| Mitsubishi Electric | 27 | 12 | **15** |

Composition Daikin : 124 packs, 43 modules intérieurs, 28 unités extérieures, 2 kits.
Composition Mitsubishi : 25 packs (Eco Inverter, Power Inverter Silence, Zubadan), 2 modules intérieurs vendus seuls.

## Ce que fait la migration
- **Packs** : BAR-TH-171, TVA 5,5 %, usage, régime de température, ETAS à 55 °C et à 35 °C, fluide, topologie, alimentation, température de départ, ballon, unités extérieure/intérieure, classes énergétiques.
- **Composants vendus seuls** (modules, unités extérieures, kits) : pas de fiche CEE ni d'aide, car ce ne sont pas des installations BAR-TH-171 complètes. TVA existante conservée.
- **Données préservées** : les prix, forfaits de pose/évacuation et descriptions déjà saisis à la main sont conservés.
- **Références normalisées** : 40 packs portaient une référence libre, par exemple `PAC_DAIKIN_HT_14_KW_ECS_180_L_MONO`, `CHAUD_SEUL_MITSU_12KW` ou `CHUAD_SEUL_MITSU_14KW`. Ils passent au format `DAIKIN-unité-module` / `MITSU-unité-module`. L'ancienne référence est gardée dans `ancienne_reference`, et le produit déjà en base est retrouvé et mis à jour, sans doublon.
- **Doublons Excel** : leur forfait de pose (3 900 € HT) et leurs données d'aides sont reportés sur le pack correspondant, puis les doublons sont désactivés (pas supprimés).

| Doublon Excel désactivé | Pack conservé |
|---|---|
| `ERGA06EVH + EHVH08S18E6V` | `DAIKIN-ERGA06EVH-EHVH08S18E6V` |
| `ERGA08EVH7 + EHVH08S18E6V` | `DAIKIN-ERGA08EVH7-EHVH08S18E6V` |
| `ERLA11DV3 + EBVH11S18D6V` | `DAIKIN-ERLA11DV3-EBVH11S18D6V` |
| `ERLA14DV3 + EBVH16S18D6V` | `DAIKIN-ERLA14DV3-EBVH16S18D6V` |
| `ERLA16DV37 + EBVH16S18D6V` | `DAIKIN-ERLA16DV37-EBVH16S18D6V` |
| `PUZ-SHWM100VAA` (Mitsubishi) | `MITSU-PUZ-SHWM100VAA-ERST20F-VM2E-M` |

Résultat : **197 Daikin et 27 Mitsubishi Electric actifs**. La migration peut être rejouée sans créer de doublons. Elle a été testée sur PostgreSQL 18 à la suite des migrations du 19/10, du 20/10 et de la migration Hitachi.

## Reste à faire dans l'application
- **Classe du régulateur** (BAR-TH-171) : à renseigner sur chaque pack.
- **Prix Mitsubishi** : 12 packs restent à 0 € HT, comme dans la liste source (8 Eco Inverter, 4 Power Inverter Silence). Tous les produits Daikin ont un prix.
- **Forfaits de pose** : à renseigner, sauf pour les 6 packs repris du fichier Excel.
