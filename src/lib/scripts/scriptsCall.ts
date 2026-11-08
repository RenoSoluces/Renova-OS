export interface ScriptProduit {
  id: string
  titre: string
  cible: string
  accroche: string
  questions: string[]
  arguments: string[]
  objections: { objection: string; reponse: string }[]
  cloture: string
  attention?: string
}

/** Rappel commun à tous les appels pros : présentation, objectif, respect des refus. */
export const REGLES_APPEL_PRO = [
  'On appelle uniquement des professionnels (démarchage B2B). Jamais de particulier à froid.',
  'On se présente, on dit d’où vient le contact (annuaire des entreprises, données ouvertes) et on respecte tout refus.',
  'Un refus ou « ne plus rappeler » se note aussitôt dans la fiche et le prospect n’est plus appelé.',
  'Aucun prix au téléphone : l’objectif est un rendez-vous de 30 minutes avec le décideur.',
  'Le numéro est celui de l’entreprise : demander la direction ou la personne en charge des bâtiments et de l’énergie.',
]

export const INTRO_APPEL =
  'Bonjour, Melissa de Reno Soluces, à Trausse. Je cherche la personne qui s’occupe des bâtiments ou des dépenses d’énergie, pour lui présenter une solution qui baisse la facture avec des aides à la clé.'

export const SCRIPTS_PRODUITS: ScriptProduit[] = [
  {
    id: 'destratificateur',
    titre: 'Déstratificateur d’air',
    cible: 'Ateliers, entrepôts, hangars, halls de logistique chauffés, 6 m de hauteur sous plafond et plus.',
    accroche: 'Dans les grands volumes chauffés, l’air chaud monte au plafond et vous payez pour chauffer le toit. Un déstratificateur le ramène au sol et réduit la consommation de chauffage.',
    questions: [
      'Votre bâtiment est-il chauffé en hiver, et par quoi (gaz, fioul, électrique, aérothermes) ?',
      'Quelle est la hauteur sous plafond, et la surface à peu près ?',
      'Avez-vous remarqué un écart de température entre le sol et le plafond ?',
      'Qui décide des travaux dans le bâtiment : vous, le propriétaire, un gestionnaire ?',
    ],
    arguments: [
      'Baisse de la consommation de chauffage sur les grands volumes.',
      'Pose rapide, sans arrêt de l’activité.',
      'Opération éligible à des aides (certificats d’économies d’énergie) qui couvrent une partie du coût.',
      'Étude de dimensionnement incluse dans notre offre.',
    ],
    objections: [
      { objection: 'Nous ne chauffons presque pas', reponse: 'Très bien, alors le sujet est peut-être l’électricité : je peux regarder avec vous si une centrale solaire sur votre toiture a du sens.' },
      { objection: 'Le bâtiment n’est pas à nous', reponse: 'Pas de souci, qui est le propriétaire ou le gestionnaire ? Je préfère lui présenter la solution directement.' },
      { objection: 'Envoyez-moi un mail', reponse: 'Volontiers. À quelle adresse, et à quel nom ? Je le fais dans l’heure et je vous rappelle jeudi pour en parler.' },
    ],
    cloture: 'Je vous propose 30 minutes sur place ou en visio pour regarder votre bâtiment. Mardi ou jeudi, matin ou après-midi ?',
  },
  {
    id: 'hp_flottante',
    titre: 'HP flottante (groupe froid)',
    cible: 'Supermarchés, commerces alimentaires, magasins avec chambres froides et groupes froids.',
    accroche: 'La HP flottante adapte automatiquement la pression de votre groupe froid à la température extérieure, ce qui réduit la consommation électrique du froid, souvent le premier poste d’un magasin alimentaire.',
    questions: [
      'Quelle est la puissance de votre groupe froid et quel âge a-t-il ?',
      'Avez-vous un contrat de maintenance sur le froid, et avec qui ?',
      'Combien représente le froid sur votre facture d’électricité, à peu près ?',
      'Un projet de rénovation ou d’agrandissement du magasin est-il prévu ?',
    ],
    arguments: [
      'Baisse de la consommation du groupe froid, surtout en saison fraîche.',
      'Solution éligible à des aides qui couvrent une partie de l’investissement.',
      'Installation planifiée pour ne pas interrompre la chaîne du froid.',
    ],
    objections: [
      { objection: 'Ce n’est pas moi qui décide, nous sommes en franchise', reponse: 'Je comprends. Qui prend les décisions techniques pour le magasin : vous, ou le siège ? Je peux m’adresser à la bonne personne.' },
      { objection: 'Mon frigoriste s’en occupe', reponse: 'Très bien, nous travaillons avec les installateurs en place. Je ne vous demande qu’un échange pour voir si l’économie vaut le coup.' },
    ],
    cloture: 'Je vous propose 30 minutes avec le responsable technique pour regarder votre installation. Quel créneau vous arrange ?',
  },
  {
    id: 'pac_air_eau',
    titre: 'PAC air-eau pro',
    cible: 'Hôtels, campings, restauration, bâtiments avec chauffage central ou production d’eau chaude importante.',
    accroche: 'Une pompe à chaleur air-eau remplace une chaudière fioul ou gaz vieillissante et divise nettement la facture de chauffage et d’eau chaude.',
    questions: [
      'Comment produisez-vous aujourd’hui le chauffage et l’eau chaude (fioul, gaz, électrique) ?',
      'Quel âge a la chaudière, et à quelle puissance environ ?',
      'Avez-vous eu des pannes ou des factures qui montent ces dernières années ?',
      'Un remplacement est-il déjà envisagé ?',
    ],
    arguments: [
      'Baisse de la facture énergétique par rapport à une chaudière fioul ou gaz.',
      'Aides mobilisables selon l’opération.',
      'Une seule entreprise suit le dossier, de la visite à la mise en service.',
    ],
    objections: [
      { objection: 'La chaudière fonctionne encore', reponse: 'C’est justement le bon moment pour préparer le remplacement : on chiffre à l’avance, sans engagement, pour ne pas subir une panne en pleine saison.' },
      { objection: 'Trop d’investissement', reponse: 'Je ne donne aucun prix au téléphone : la visite sert à chiffrer votre cas précis, avec les aides, et vous jugez ensuite.' },
    ],
    cloture: 'Je vous propose une visite de 30 minutes pour voir la chaufferie. Quel jour vous arrange ?',
  },
  {
    id: 'toiture_plate',
    titre: 'Toiture plate (toit-terrasse)',
    cible: 'Bâtiments pros avec toiture-terrasse : commerces, locaux d’activité, hôtels. Hors bac acier et panneau sandwich.',
    accroche: 'Nous traitons les toitures plates des bâtiments professionnels : étanchéité et isolation, et le toit peut ensuite accueillir une centrale solaire.',
    questions: [
      'Quel est le type de toiture (toit-terrasse, étanchéité bitume, membrane) et son âge ?',
      'Y a-t-il des infiltrations ou des réparations répétées ?',
      'Quelle est la surface approximative ?',
      'Le bâtiment est-il à vous ou en location ?',
    ],
    arguments: [
      'Étanchéité et isolation traitées ensemble, avec une garantie.',
      'Possibilité de coupler avec une centrale photovoltaïque jusqu’à 18 kWc.',
      'Aides possibles selon l’isolation réalisée.',
    ],
    objections: [
      { objection: 'Notre toit est en bac acier', reponse: 'Dans ce cas nous ne sommes pas la bonne entreprise pour la couverture, mais je peux regarder la partie solaire. Est-ce que cela vous intéresse ?' },
      { objection: 'Nous avons un artisan habituel', reponse: 'Très bien. Je ne vous demande pas de le changer, seulement de regarder une offre complète avec les aides.' },
    ],
    cloture: 'Je vous propose de passer 30 minutes sur place pour voir l’état de la toiture. Quel créneau vous convient ?',
    attention: 'Ne pas proposer ce produit si le toit est en bac acier ou en panneau sandwich.',
  },
  {
    id: 'photovoltaique',
    titre: 'Photovoltaïque jusqu’à 18 kWc',
    cible: 'Tout pro avec une toiture exploitable et une consommation d’électricité en journée.',
    accroche: 'Une centrale solaire sur votre toiture produit une part de votre électricité à un coût stable, et son économie s’ajoute à la facture évitée.',
    questions: [
      'Quelle est votre consommation d’électricité par an, à peu près ?',
      'La consommation est-elle surtout en journée ?',
      'La toiture est-elle dégagée, orientée sud ou est-ouest ?',
      'Le bâtiment est-il à vous, et la toiture en bon état ?',
    ],
    arguments: [
      'Production d’électricité sur place, utilisée en journée par l’activité.',
      'Installation jusqu’à 18 kWc, adaptée aux bâtiments de taille moyenne.',
      'Étude gratuite et sans engagement.',
    ],
    objections: [
      { objection: 'Nous louons nos locaux', reponse: 'Le propriétaire a-t-il déjà été sollicité ? Je peux lui présenter l’idée avec vous.' },
      { objection: 'Nous avons déjà été démarchés', reponse: 'Je comprends. Je ne vous demande pas de signer : seulement de comparer une étude chiffrée à ce que vous connaissez.' },
    ],
    cloture: 'Je vous propose une visite de 30 minutes avec étude de toiture. Quel jour vous arrange ?',
  },
]
