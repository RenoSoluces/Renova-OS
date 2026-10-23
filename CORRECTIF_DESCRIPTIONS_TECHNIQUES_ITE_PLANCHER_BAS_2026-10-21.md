# Correctif descriptions techniques ITE et plancher bas

Les descriptions sont désormais structurées au format fiche technique demandé : marque, référence/gamme, type, épaisseur, dimensions/conditionnement, R, lambda, certificats/normes et destination. Les champs non justifiés par les informations disponibles sont explicitement indiqués comme à confirmer au lieu d’être inventés.

Les données de surface chantier (ex. 121,51 m² PRB) sont distinguées du conditionnement fabricant. Les produits de façade indiqués pour bardage ventilé ne sont pas présentés comme automatiquement compatibles avec une ITE sous enduit.

Le correctif conserve les prix et forfaits existants ; la pose plancher bas est maintenue à 28,44 € HT/m² et reste prévue comme ligne séparée via `forfait_pose_ht`.

Migration ajoutée : `supabase/migrations/20261020260000_descriptions_techniques_format_fiches_ite_plancher_bas.sql`. Elle n’a pas été appliquée à Supabase et le build n’a pas été validé.
