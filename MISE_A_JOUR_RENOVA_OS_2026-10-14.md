# Renova-OS — mise à jour du 14 octobre 2026

## Changements inclus

- Facturation partenaire : modification/suppression des échéances non facturées, annulation tracée d'une facture déjà émise, plusieurs factures possibles sur le même dossier, génération directe d'une facture supplémentaire et renvoi de l'e-mail.
- PDF de facture partenaire archivé dans les documents du dossier ; coordonnées bancaires reprises depuis **Paramètres → Entreprise**.
- Facturation client : nouvel onglet pour générer une facture d'acompte, de démarrage ou de solde à partir d'un devis signé, avec répartition des lignes et des taux de TVA du devis, PDF archivé, envoi e-mail, statut payé et annulation tracée.
- Catalogue : trois familles distinctes (Particuliers, Professionnels, Visites Techniques), sous-catégories présentées par famille, ajout de catégories et modification de la catégorie/famille d'un produit.
- Devis : répartition par familles et sous-catégories adaptées aux particuliers et professionnels ; produits de visites techniques exclus du catalogue de devis.
- Assistant de devis : description et photos, propositions limitées aux références du catalogue. Les prix ne sont jamais transmis au modèle et proviennent toujours du catalogue Renova-OS.
- Prospection : import CSV, déduplication sur téléphone/e-mail, appel direct, compte rendu, historique et création de rappel visible dans « À traiter ».
- « À traiter » : liste des tâches et relances avec échéances et possibilité de marquer une tâche terminée.
- Simulation des aides distincte des résultats 3CL issus des visites techniques ; historique des simulations d'aides par prospect.
- Menu réorganisé : Ma Journée, Ventes, Terrain, Suivi et Système. Fiches techniques rangées dans Système.
- Notifications internes à la création d'un prospect et au changement de statut d'un dossier. E-mail de notification des prospects depuis les formulaires internes et l'import CSV, sous réserve de configuration Resend.
- Adresse Idehome : 8 rue Mermoz, 34430 Saint-Jean-de-Védas.

## Migrations Supabase à appliquer

Appliquer dans l'ordre les migrations qui ne sont pas encore présentes dans le projet Supabase :

1. `20261014100000_catalogue_facturation_email_menu.sql`
2. `20261014110000_factures_clients.sql`
3. `20261014120000_simulations_aides.sql`
4. `20261014130000_idehome_address_final.sql`
5. `20261014140000_prospect_dossier_notifications.sql`

Vérifier également que les migrations de la version précédente sont déjà appliquées, notamment `20261013100000_fiches_techniques_idehome.sql` et `20261013180000_fix_numero_facture_devis_catalogue.sql`. Ne pas réexécuter manuellement une migration déjà appliquée.

## Fonctions Edge à déployer

Depuis la racine du projet :

```bash
supabase functions deploy send-invoice
supabase functions deploy suggest-devis-lines
supabase functions deploy notify-new-prospect
```

Secrets à configurer dans Supabase :

- `RESEND_API_KEY` : clé API Resend.
- `MAIL_FROM` : adresse d'expédition vérifiée chez Resend.
- `OPENAI_API_KEY` : clé API utilisée par l'assistant de devis.

Les clés ne doivent pas être placées dans le code React ni dans une variable `VITE_*`.

## Points à savoir

- Renseigner l'IBAN, le BIC et le nom de la banque dans **Paramètres → Entreprise** avant d'émettre des factures.
- La page « Mon courrier » est un emplacement préparatoire : Gmail n'est pas encore connecté. L'Agenda affiche le planning actuel ; la synchronisation Google reste à configurer.
- Les notifications internes et les e-mails de nouveaux prospects sont préparés, mais les **notifications push même lorsque l'application est fermée** nécessitent encore la configuration du service worker, des abonnements push et des clés VAPID.
- L'e-mail de nouveau prospect est déclenché par les créations dans l'application et l'import CSV. Pour couvrir aussi les prospects créés par le formulaire public du site, son endpoint doit appeler la fonction `notify-new-prospect` après l'insertion.
- Les estimations d'aides restent indicatives et ne remplacent pas la validation des fiches CEE et des règles officielles applicables au dossier.

## Vérification

Le contrôle TypeScript (`tsc --noEmit`) passe. Le build Vite n'a pas pu être terminé dans l'environnement de préparation car le ZIP de départ ne contient pas le binaire optionnel Rollup pour Linux (`@rollup/rollup-linux-x64-gnu`). Sur la machine Windows du projet, lancer `npm install`, puis `npm run build` avant déploiement.
