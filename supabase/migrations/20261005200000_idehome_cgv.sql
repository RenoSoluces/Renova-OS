-- IDEHOME by Reno Soluces : CGV fournies par Reno Soluces pour les devis émis
-- depuis Renova OS au nom d'IDEHOME.
-- Cette migration est volontairement autonome : elle peut être exécutée
-- même si la migration V30 précédente n'a pas encore été appliquée.

ALTER TABLE installateurs
  ADD COLUMN IF NOT EXISTS devis_cgv text DEFAULT '';

UPDATE installateurs
SET devis_cgv = $$CONDITIONS GÉNÉRALES DE VENTE

Article 1 – Objet et champ d’application

Toute commande de produits implique l’acceptation sans réserve par l’acheteur des présentes conditions générales de vente, qui prévalent sur tout autre document. Tout accord contraire doit faire l’objet d’un accord écrit et préalable. Les catalogues, prospectus ou notices n’ont qu’une valeur informative et indicative, non contractuelle.

Article 2 – Propriété intellectuelle

Tous les documents techniques remis restent la propriété exclusive de la société. Ils doivent être restitués immédiatement sur simple demande.

Article 3 – Commandes définitives

La commande est conclue sous conditions suspensives de visite technique et d’acceptation du dossier de financement (crédit) le cas échéant. En cas de souscription d’un crédit, le contrat devient définitif une fois le financement accepté. Pour les transactions au comptant, toute commande signée est ferme et définitive. Toute modification demandée par le client doit être acceptée par le vendeur et peut entraîner un report de la date de livraison ou une modification du prix.

Article 4 – Procédures préalables

Lorsque les travaux nécessitent une autorisation d’urbanisme (déclaration préalable ou permis de construire), l’acheteur s’engage à accomplir les démarches nécessaires. Le contrat est conclu sous condition suspensive d’absence d’opposition de la mairie ou d’obtention du permis de construire. En cas de refus ou de non-obtention d’autorisation administrative non imputable au client, le contrat est rendu caduc et les sommes versées sont restituées.

Article 5 – Recours à un crédit

L’acheteur dispose d’un droit de rétractation pour le crédit affecté conformément au Code de la consommation. L’exercice de ce droit entraîne l’annulation automatique du contrat de vente sans pénalité.

Article 6 – Droit de rétractation

Le consommateur dispose d’un délai de 14 jours pour exercer son droit de rétractation à compter de la conclusion du contrat (prestations de service) ou de la réception du bien (vente de biens).

Exercice du droit : La notification doit être adressée par écrit (courrier recommandé ou formulaire de rétractation) à :

IDEHOME France – 8 Rue Mermoz, 34430 Saint-Jean-de-Védas.

Exceptions : Le droit de rétractation ne s’applique pas aux prestations pleinement exécutées avant la fin du délai avec accord préalable du client, ni aux travaux d’urgence expressément demandés.

Article 7 – Tarif – Prix – Paiement – Réserve de propriété

Le prix est celui mentionné au devis. Un acompte peut être exigé à la commande (jusqu’à 30 % du prix TTC). Le solde est payable après la livraison ou à la réception des travaux. Réserve de propriété : la société reste propriétaire des biens vendus jusqu’au paiement intégral du prix principal et des accessoires.

Article 8 – Accord des parties

La signature du devis ou du bon de commande matérialise l’accord des parties sur le prix, la nature des prestations et les présentes CGV.

Article 9 – Délais d’exécution des travaux

Le délai d’exécution figure sur le devis ou le bon de commande. En cas de dépassement non justifié (hors force majeure ou retard imputable au client), le client peut résoudre le contrat selon les termes prévus par la loi.

Article 10 – Prescriptions techniques

Les travaux sont réalisés conformément aux règles de l’art et aux normes en vigueur. La société se réserve le droit de refuser toute exécution non conforme aux règles de l’art.

Article 11 – Garantie

Le client bénéficie des garanties légales :
- Garantie légale de conformité (articles L. 217-4 et suivants du Code de la consommation) : délai d’action de 2 ans à compter de la délivrance du bien.
- Garantie des vices cachés (articles 1641 et suivants du Code civil).

Article 12 – Exclusion de garantie

La garantie ne couvre pas les dommages résultant de :
- Cas de force majeure, intempéries ou catastrophes naturelles.
- Mauvaise utilisation, négligence ou défaut d’entretien par le client.
- Intervention d’un tiers non autorisé sur les installations.

Article 13 – Intégralité

Si une clause venait à être déclarée nulle, les autres clauses restent pleinement applicables et valides.

Article 14 – Tolérance

Le fait pour la société de ne pas se prévaloir d’une clause à un moment donné ne vaut pas renonciation à s’en prévaloir ultérieurement.

Article 15 – Réclamation et médiation

En cas de litige, le client doit d’abord adresser une réclamation écrite à la société :
Adresse : IDEHOME France, 8 Rue Mermoz, 34430 Saint-Jean-de-Védas
Email : secretariat@ofce.org / contact@szmediation-solution.com

En cas de réponse insatisfaisante ou d’absence de réponse sous un mois, le client peut recourir gratuitement au médiateur de la consommation :

Médiation Solution
222 chemin de la bergerie
01800 Saint-Jean-de-Niost
szmediation-solution.com

Article 16 – Protection des données personnelles

Les données collectées sont utilisées pour la gestion des commandes et de la relation client. Conformément au RGPD et à la loi Informatique et Libertés, le client dispose d’un droit d’accès, de rectification et de suppression de ses données. Le client peut également s’inscrire sur la liste d’opposition au démarchage téléphonique Bloctel.

BORDEREAU DE RÉTRACTATION

(À renvoyer uniquement en cas d’annulation du contrat)

Numéro de commande : ...........................................................

À l’attention de : IDEHOME France – 8 RUE MERMOZ – 34430 ST JEAN DE VÉDAS

Je vous notifie par la présente ma rétractation du contrat portant sur la vente du bien / la prestation de service ci-dessous :

Intitulé du bien / service : ...........................................................
Commandé le / reçu le : ..... / ..... / 20.....
Nom du consommateur : ...........................................................
Adresse du consommateur : ...........................................................

Signature : ...........................................................
Date : ..... / ..... / 20.....$$
WHERE lower(nom) LIKE '%idehome%';
