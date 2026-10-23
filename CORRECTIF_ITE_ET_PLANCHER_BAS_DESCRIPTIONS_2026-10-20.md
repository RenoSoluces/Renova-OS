# Correctif catalogue Renova OS — ITE et plancher bas

Cette migration complète le précédent correctif ITE en enregistrant explicitement les descriptions détaillées dans `description` et dans les caractéristiques (`description_devis`, `description_visible_devis`). Elle ajoute aussi les descriptions détaillées des 11 références plancher bas transmises le 20/10/2026.

## Plancher bas
- Pose définie à **28,44 € HT/m²**, sous forme de ligne distincte via `forfait_pose_ht`.
- Les prix fournis sont conservés ; les références sans prix communiqué restent à **0 €** avec le marqueur `prix_a_renseigner=true`.
- Les descriptions précisent la destination, les performances transmises, les points de vigilance de mise en œuvre et le fait que les aides doivent être vérifiées.
- Aucune certification, éligibilité CEE ou compatibilité avec une pose sous chape n'est présumée sans justificatif produit.

## ITE
Le correctif précédent avait renseigné des descriptions, mais cette migration les expose aussi explicitement comme `description_devis` dans les caractéristiques pour faciliter leur récupération par le catalogue et le devis. Les isolants, l'échafaudage, l'enduit et la pose restent des lignes distinctes. La pose ITE reste à 50 €/m².

## À faire après intégration
Appliquer les migrations Supabase dans l'ordre. Cette archive n'applique rien à la base distante et ne constitue pas un test de build. Vérifier ensuite un devis test avec une ligne ITE et une ligne plancher bas, notamment que la pose apparaît séparément une seule fois.
