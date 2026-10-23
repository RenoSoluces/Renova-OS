# Correctif audit catalogue — échafaudage et enduit ITE

## Objet
L’échafaudage (`prestation_ite = echafaudage`) et l’enduit (`prestation_ite = enduit`) sont des postes de prestation/fourniture distincts au m². Ils apparaissaient à tort dans « Points à auditer » car l’audit leur appliquait des contrôles destinés aux équipements (marque/référence fabricant) et exigeait un forfait de pose séparé.

## Correctif
Dans `src/pages/CataloguePage.tsx`, `auditerProduit()` reconnaît désormais ces deux valeurs `caracteristiques.prestation_ite` comme des prestations. Les contrôles génériques marque/référence et forfait de pose ne leur sont donc plus appliqués. Les autres contrôles, notamment description et prix, restent actifs.

Aucun tarif n’a été modifié par ce correctif.
