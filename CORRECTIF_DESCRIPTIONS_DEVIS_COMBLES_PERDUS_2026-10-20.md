# Correctif des descriptions de devis — Combles perdus

Cette migration remplace les descriptions génériques par un format structuré inspiré du devis exemple fourni par Reno Soluces : référence, marque/gamme, type d'isolant, épaisseur, surface de chantier, résistance thermique, lambda, certificat ACERMI et consommation en sacs lorsque ces informations ont été communiquées, puis consignes de mise en œuvre.

- 16 références distinctes sont traitées, y compris les deux entrées Thermo Loft et l'entrée générique PULSR.
- La surface est indiquée comme dépendant du métrage réel : elle ne doit pas être figée à 86 m² dans une fiche catalogue.
- Les caractéristiques inconnues ne sont pas inventées. Pour le produit générique PULSR, la description indique que les données doivent venir de la référence réellement sélectionnée.
- La description du produit n'inclut pas les tarifs. Les prix de fourniture, les forfaits de pose (16 €/m² soufflage, 18 €/m² déroulage), les aides et les forfaits d'évacuation ne sont pas modifiés par cette migration.
- Les consignes de chantier sont rédigées comme une désignation technique de devis. Les dispositions relatives au pare-vapeur et aux équipements présents sont conditionnées à la configuration du chantier et aux prescriptions fabricant, plutôt que déclarées universelles.

Migration : `supabase/migrations/20261020233000_descriptions_devis_detaillees_combles_perdus.sql`.
