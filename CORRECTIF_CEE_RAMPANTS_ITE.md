# Correctif devis — fiches isolation et CEE rampants/ITE

- Pour les lignes `combles` et `ite`, les champs de fiche isolant sont repris automatiquement des données du produit : désignation/marque/référence, résistance thermique présente dans les caractéristiques ou la description, et surface égale à la quantité de la ligne.
- La surface affichée dans la fiche suit la quantité du devis ; aucune seconde saisie de surface n'est demandée.
- La prime CEE indicative rampants/sarking est recalculée à partir de la surface totale des lignes de catégorie `combles` dont la résistance thermique catalogue est au moins R = 6. Les produits d'injection/vrac ne sont pas inclus sans justificatif de R.
- L'aide CEE rampants/sarking est distincte de la ligne CEE ITE calculée par la règle Reno Soluces existante. Les montants CEE hors règle interne ITE restent des estimations indicatives à confirmer avec le délégataire.
- Le build complet n'a pas pu être confirmé dans cet environnement : l'installation npm a expiré et les définitions de types sont incomplètes.
