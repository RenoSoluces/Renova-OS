# Catalogue Hitachi airH2O — 68 packs PAC air/eau (23/10/2026)

Migration : `supabase/migrations/20261023210000_catalogue_hitachi_pac_air_eau_68_references.sql`

## Constat
- 41 packs Hitachi (gammes 400 S et 600 S, R32, bi-bloc) avaient été importés le 19/10/2026.
- Le 42ᵉ produit visible était un doublon : « Hitachi airH2O 600 S Combi 10 kW + ECS 220 L (haut) », importé depuis le fichier Excel du 20/10/2026 sous la référence `RAS-4WHVRP2E + RWD-4.0RW3E-220S`. C'est le même pack que `HITACHI-RAS-4WHVRP2E-RWD-4_0RW3E-220S`.
- Les 27 packs R290 (gamme 800) n'avaient jamais été importés.

## Ce que fait la migration
| Gamme | Type | Packs | Action |
|---|---|---|---|
| airH2O 400 S Combi / 400 S | Bi-bloc R32 | 17 | mis à niveau (prix à renseigner) |
| airH2O 600 S Combi / 600 S | Bi-bloc R32 | 24 | mis à niveau |
| airH2O 800 H Combi | Hydrosplit R290, ECS 220 L | 9 | **ajoutés** (prix à renseigner) |
| airH2O 800 H | Hydrosplit R290, chauffage seul | 9 | **ajoutés** avec prix |
| airH2O 800 M | Monobloc R290, chauffage seul | 9 | **ajoutés** avec prix |

Résultat : **68 packs Hitachi actifs**.

- Les 68 packs reçoivent : BAR-TH-171, TVA 5,5 %, usage, régime de température, ETAS à 55 °C, fluide, topologie, alimentation, température de départ, volume du ballon, unités extérieure/intérieure.
- Les prix, forfaits de pose/évacuation et descriptions déjà saisis à la main sont conservés.
- Doublon Excel : son forfait de pose (3 900 € HT) et ses données d'aides sont reportés sur le pack `HITACHI-RAS-4WHVRP2E-RWD-4_0RW3E-220S`, puis il est désactivé (pas supprimé).
- La migration peut être rejouée sans créer de doublons. Elle a été testée sur PostgreSQL 18 après les migrations du 19/10 et du 20/10 : 27 packs ajoutés, 41 mis à jour, 68 actifs.

## Reste à faire dans l'application
- **Classe du régulateur** (BAR-TH-171) : elle n'est pas dans la liste source. Il faut la renseigner pour chaque pack à partir de la fiche produit Hitachi. D'ici là, les packs restent « à compléter » dans l'audit CEE.
- **Prix** : 26 packs restent à 0 € HT (400 S et 800 H Combi), comme dans la liste source.
- **Forfaits de pose** : à renseigner pour tous les packs, sauf le 600 S Combi 10 kW monophasé (3 900 € HT).
