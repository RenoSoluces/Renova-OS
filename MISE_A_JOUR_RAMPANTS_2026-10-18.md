# Mise à jour catalogue rampants — 18 octobre 2026

Ajout des références et tarifs transmis par Reno Soluces pour l'isolation des rampants : injection/vrac, fibre de bois, laine de roche, laine de verre, sarking et isolant mince thermo-réflecteur.

- Catégorie catalogue : `combles` (Isolation combles / rampants), cible particuliers.
- Prix catalogue saisis en HT au m², avec TVA de 5,5 % pour que le TTC calculé corresponde aux montants fournis.
- Les prix n'étant pas ventilés entre fourniture et pose (à l'exception de la fourchette indicative de main-d'œuvre sarking), aucun forfait de pose supplémentaire n'est ajouté automatiquement afin d'éviter un double comptage.
- La fourchette sarking de 90 à 130 € HT/m² est mentionnée dans la description, mais aucun montant arbitraire n'est ajouté au devis.
- Les conditions CEE sont enregistrées dans les caractéristiques produit. Le déclenchement automatique d'une prime CEE n'est pas activé pour ces nouveaux produits, car le moteur actuel estime une aide dès l'ajout du produit et ne vérifie pas le R réel, la double couche ni la certification du système. À valider/adapter avant automatisation de la prime.
- Migration SQL idempotente : `supabase/migrations/20261018233000_catalogue_rampants_tarifs.sql`.
