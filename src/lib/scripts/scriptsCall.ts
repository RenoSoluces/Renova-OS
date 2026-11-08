/**
 * Scripts d'appel pour les prospects professionnels.
 * [Prénom] = prénom de la personne qui appelle. Les textes entre « » se disent à voix haute.
 */
export interface Bloc {
  titre?: string
  note?: string
  /** Texte à dire, un paragraphe par ligne. */
  dire?: string[]
  /** Questions à poser (liste à puces). */
  questions?: string[]
}

export interface ScriptProduit {
  id: string
  titre: string
  cible: string
  note?: string
  attention?: string
  etapes: Bloc[]
  infos: string
}

export const REGLES_A_FAIRE = [
  'Parler lentement et avec assurance.',
  'Poser des questions ouvertes.',
  'Laisser le prospect parler davantage que le téléprospecteur.',
  'Parler d’économies et de rentabilité avant de parler d’équipements.',
  'Adapter son vocabulaire à l’activité de l’entreprise.',
  'Proposer deux créneaux de rendez-vous.',
  'Ne jamais inventer un montant de prime ou une économie.',
]

export const REGLES_A_NE_PAS_FAIRE = [
  'Prétendre appeler au nom de l’État ou d’EDF.',
  'Garantir une prise en charge à 100 % avant validation.',
  'Dire qu’une installation est gratuite sans expliquer les conditions.',
  'Promettre des économies sans étude.',
  'Faire croire que l’entreprise a une obligation de réaliser les travaux.',
  'Insister lourdement après un refus.',
]

/** Rappel court affiché en haut de la page. */
export const REGLES_APPEL_PRO = [
  'Démarchage B2B uniquement : jamais de particulier à froid. Un refus ou « ne plus rappeler » se note aussitôt dans la fiche.',
  'Jamais « 100 % financé » avant validation du dossier : on vérifie l’éligibilité CEE, puis on chiffre.',
  'Photovoltaïque : pas de CEE. On parle de rentabilité, d’autoconsommation et de transfert de charge.',
  'Un seul produit par appel : celui qui répond au problème énergétique principal du prospect.',
  'Toujours proposer deux créneaux de rendez-vous.',
]

/* ------------------------------------------------------------------ Ouverture commune */

export const OUVERTURE: Bloc[] = [
  {
    titre: 'Passage du standard ou du secrétariat',
    dire: [
      '« Bonjour Madame/Monsieur, [Prénom] de Reno Soluces.',
      'Je souhaiterais échanger avec la personne qui s’occupe des bâtiments et des dépenses énergétiques de votre établissement, s’il vous plaît.',
      'C’est concernant des solutions d’optimisation énergétique destinées aux professionnels. »',
    ],
  },
  {
    titre: 'Si on demande la raison de l’appel',
    dire: [
      '« Nous accompagnons les entreprises sur plusieurs dispositifs permettant de réduire leurs consommations énergétiques, notamment sur le chauffage, l’isolation et les installations électriques, avec des mécanismes de financement spécifiques aux professionnels.',
      'Je souhaite simplement vérifier si certains de ces dispositifs pourraient être intéressants pour votre établissement. »',
    ],
  },
  {
    titre: 'Si le standard demande d’envoyer un mail',
    dire: [
      '« Bien sûr, aucun problème. Simplement, pour éviter de vous envoyer une documentation qui ne correspond pas à votre activité, pouvez-vous me préciser qui serait la bonne personne à contacter et son adresse mail directe ? »',
      'Puis : « Et savez-vous à quel moment je pourrais le joindre plus facilement ? »',
    ],
    note: 'Noter dans la fiche : nom, fonction, mail direct et créneau pour le rappel.',
  },
  {
    titre: 'Lorsque le décideur décroche',
    dire: [
      '« Bonjour Monsieur/Madame [Nom], [Prénom] de Reno Soluces.',
      'Je vous rassure, je vais être rapide.',
      'Nous accompagnons actuellement les professionnels dans l’optimisation énergétique de leurs bâtiments, avec plusieurs solutions qui peuvent bénéficier d’une prise en charge par les Certificats d’Économies d’Énergie, les CEE.',
      'L’idée est de voir si votre établissement présente des opportunités d’amélioration énergétique sans mobiliser inutilement votre trésorerie.',
      'Je peux vous poser deux ou trois petites questions pour voir si cela pourrait vous concerner ? »',
    ],
    note: 'Objectif : obtenir l’autorisation de poursuivre. Ensuite, passer à l’onglet du produit adapté.',
  },
  {
    titre: 'Message sur répondeur (30 secondes maximum)',
    dire: [
      '« Bonjour [Nom], [Prénom] de Reno Soluces. Je vous appelle au sujet de vos dépenses d’énergie : nous vérifions gratuitement si votre établissement peut bénéficier de dispositifs de financement pour les professionnels. Je vous rappelle [jour] ; vous pouvez aussi me joindre au [numéro]. Bonne journée. »',
    ],
    note: 'Pas plus de deux messages au même prospect.',
  },
]

/* ------------------------------------------------------------------ Scripts produits */

export const SCRIPTS_PRODUITS: ScriptProduit[] = [
  {
    id: 'pac_air_eau',
    titre: 'PAC air/eau',
    cible: 'Bâtiments tertiaires chauffés par chaudière gaz, fioul ou système de chauffage vieillissant.',
    infos: 'Surface chauffée, énergie actuelle, puissance, émetteurs.',
    etapes: [
      {
        titre: 'Étape 1 – Accroche',
        dire: [
          '« Nous intervenons notamment sur le remplacement ou l’amélioration des systèmes de chauffage des bâtiments professionnels.',
          'Nous proposons des solutions de pompes à chaleur air/eau qui permettent de produire le chauffage du bâtiment avec une consommation énergétique optimisée.',
          'L’intérêt, c’est que certaines installations peuvent être financées par les CEE, ce qui peut permettre de réaliser l’opération sans investissement initial de la part de l’entreprise, sous réserve de validation du dossier. »',
        ],
      },
      {
        titre: 'Étape 2 – Découverte des besoins',
        dire: ['« Aujourd’hui, comment est chauffé votre établissement ? » Laisser répondre.'],
        questions: [
          '« Vous êtes plutôt sur une chaudière gaz, fioul, électrique ou un autre système ? »',
          '« Vous avez une idée de l’ancienneté de votre installation ? »',
          '« Vous chauffez quelle surface approximativement ? »',
          '« Vous avez des radiateurs, un plancher chauffant ou des aérothermes ? »',
          '« Vous avez constaté une augmentation de vos dépenses de chauffage ces dernières années ? »',
        ],
      },
      {
        titre: 'Étape 3 – Argumentaire',
        dire: [
          '« D’accord, justement, c’est le type d’installation sur lequel nous pouvons intervenir.',
          'L’objectif est de remplacer ou compléter votre système actuel par une pompe à chaleur air/eau dimensionnée pour les besoins du bâtiment.',
          'Cela permet de valoriser les performances énergétiques de votre installation et potentiellement de réduire vos dépenses de chauffage.',
          'Ce qui est intéressant dans votre cas, c’est que nous étudions d’abord le potentiel de financement CEE. Si le dossier est éligible et que la prime couvre l’intégralité du coût, vous n’avez pas à financer l’installation sur vos fonds propres. »',
        ],
      },
      {
        titre: 'Étape 4 – Conclusion',
        dire: [
          '« Ce que je vous propose, c’est de programmer un rendez-vous avec notre conseiller technique.',
          'Il pourra étudier votre installation actuelle, la surface à chauffer et les caractéristiques du bâtiment pour déterminer la faisabilité et le montant du financement mobilisable.',
          'Vous seriez plutôt disponible [jour 1] ou [jour 2] ? »',
        ],
      },
    ],
  },
  {
    id: 'destratificateur',
    titre: 'Déstratificateur d’air',
    cible: 'Bâtiments à grande hauteur sous plafond : ateliers, entrepôts, garages, concessions, locaux industriels.',
    infos: 'Hauteur, surface, chauffage, volume.',
    etapes: [
      {
        titre: 'Étape 1 – Accroche',
        dire: [
          '« Nous proposons également une solution particulièrement intéressante pour les bâtiments professionnels qui disposent de grandes hauteurs sous plafond.',
          'Il s’agit de systèmes de déstratification d’air qui permettent de récupérer la chaleur accumulée en hauteur et de la redistribuer vers les zones occupées.',
          'L’objectif est d’améliorer le confort thermique et de limiter les pertes énergétiques liées à la stratification de l’air.',
          'Cette opération peut bénéficier d’un financement CEE selon les caractéristiques du bâtiment et de l’installation. »',
        ],
      },
      {
        titre: 'Étape 2 – Qualification',
        dire: ['« J’aurais simplement quelques questions : »'],
        questions: [
          '« Votre bâtiment dispose de quelle hauteur sous plafond environ ? »',
          '« Vous avez une surface de combien de mètres carrés ? »',
          '« Vous chauffez actuellement cet espace ? »',
          '« Vous avez des aérothermes, des radiateurs ou un autre système ? »',
          '« En hiver, est-ce que vous constatez que la chaleur reste principalement en hauteur alors qu’il fait plus frais au niveau du sol ? »',
        ],
      },
      {
        titre: 'Étape 3 – Argumentaire',
        dire: [
          '« C’est justement la problématique que le déstratificateur permet de traiter.',
          'Dans un bâtiment avec une grande hauteur, l’air chaud a naturellement tendance à monter. On se retrouve parfois à chauffer une partie du volume qui n’est pas réellement occupée.',
          'Le déstratificateur permet de mieux répartir cette chaleur dans le bâtiment.',
          'L’intérêt est double : améliorer le confort des salariés et optimiser le fonctionnement du chauffage.',
          'Et surtout, lorsque les conditions réglementaires sont réunies, l’installation peut être prise en charge par les CEE. »',
        ],
      },
      {
        titre: 'Étape 4 – Conclusion',
        dire: [
          '« Nous pouvons organiser une étude pour déterminer le nombre d’appareils nécessaires, leur positionnement et le financement mobilisable.',
          'Cela ne vous engage pas à réaliser les travaux.',
          'Est-ce que vous auriez un créneau cette semaine pour qu’un conseiller technique puisse étudier votre bâtiment ? »',
        ],
      },
    ],
  },
  {
    id: 'toiture_plate',
    titre: 'Isolation de toiture plate',
    cible: 'Bâtiments industriels, entrepôts, commerces, grandes surfaces, bureaux, hôtels.',
    infos: 'Surface, propriété, isolation existante, état de la toiture.',
    attention: 'Toitures plates uniquement : pas de bac acier ni de panneau sandwich.',
    etapes: [
      {
        titre: 'Étape 1 – Accroche',
        dire: [
          '« Nous accompagnons également les entreprises sur l’amélioration de l’isolation thermique des toitures plates.',
          'C’est un poste souvent négligé dans les bâtiments professionnels, alors qu’une toiture mal isolée peut entraîner des pertes thermiques importantes en hiver et contribuer à la surchauffe des locaux en été.',
          'Nous étudions la possibilité de réaliser des travaux d’isolation avec un financement par les CEE. »',
        ],
      },
      {
        titre: 'Étape 2 – Qualification',
        dire: ['« J’aurais quelques questions concernant votre bâtiment : »'],
        questions: [
          '« Vous êtes propriétaire de vos locaux ou locataire ? »',
          '« Votre bâtiment possède une toiture plate ou une toiture-terrasse ? »',
          '« Vous connaissez approximativement la surface de la toiture ? »',
          '« La toiture est-elle isolée actuellement ? »',
          '« Est-ce que vous rencontrez des problèmes de chaleur en été ou de déperditions en hiver ? »',
          '« La toiture a-t-elle déjà fait l’objet de travaux de rénovation ? »',
        ],
      },
      {
        titre: 'Étape 3 – Argumentaire',
        dire: [
          '« D’accord. L’idée serait de réaliser une étude de votre toiture pour vérifier son état, son isolation actuelle et les possibilités d’amélioration.',
          'Une isolation performante permet de limiter les échanges thermiques entre l’intérieur et l’extérieur, de réduire les besoins en chauffage et en climatisation et d’améliorer le confort des occupants.',
          'Le financement CEE peut permettre de réduire fortement, voire de couvrir la totalité du coût des travaux lorsque le dossier le permet.',
          'Nous vérifions également que les travaux envisagés sont compatibles avec les contraintes techniques de votre toiture, notamment l’étanchéité et la structure existante. »',
        ],
      },
      {
        titre: 'Étape 4 – Conclusion',
        dire: [
          '« Je vous propose de faire intervenir un conseiller pour une première étude de faisabilité.',
          'Il pourra notamment évaluer la surface, les caractéristiques de la toiture et le financement envisageable.',
          'Vous êtes disponible plutôt en début ou en fin de semaine ? »',
        ],
      },
    ],
  },
  {
    id: 'hp_flottante',
    titre: 'HP flottante',
    cible: 'Supermarchés, hypermarchés, plateformes frigorifiques, industries agroalimentaires, entrepôts réfrigérés.',
    note: 'Approche plus technique : ne pas présenter la HP flottante comme un simple équipement de rénovation. On intervient sur la régulation du groupe froid, on ne le remplace pas.',
    infos: 'Groupe froid, fluide, régulation existante, responsable technique.',
    etapes: [
      {
        titre: 'Étape 1 – Accroche',
        dire: [
          '« Nous accompagnons les professionnels équipés d’installations frigorifiques sur l’optimisation énergétique de leurs groupes de production de froid.',
          'Nous intervenons notamment sur la mise en place de systèmes de régulation en haute pression flottante.',
          'C’est une solution qui permet d’adapter automatiquement la pression de condensation aux conditions extérieures, afin d’optimiser le fonctionnement du groupe frigorifique et de réduire sa consommation électrique.',
          'Cette opération peut bénéficier du dispositif des CEE. »',
        ],
      },
      {
        titre: 'Étape 2 – Qualification technique',
        dire: ['« Pour savoir si votre installation peut être concernée, j’aurais quelques questions : »'],
        questions: [
          '« Vous disposez de chambres froides ou de meubles frigorifiques ? »',
          '« Vous avez un groupe de production de froid centralisé ? »',
          '« Votre installation fonctionne au CO2, au R404A, au R134a ou avec un autre fluide frigorigène ? »',
          '« Vous connaissez approximativement la puissance frigorifique de votre installation ? »',
          '« Votre système dispose déjà d’une régulation de pression de condensation flottante ? »',
        ],
      },
      {
        titre: 'Étape 3 – Argumentaire',
        dire: [
          '« Ce qui est intéressant avec cette opération, c’est que l’on ne cherche pas nécessairement à remplacer votre groupe frigorifique.',
          'On intervient sur sa régulation pour permettre au système d’adapter sa pression de condensation en fonction de la température extérieure.',
          'Cela peut réduire le travail demandé aux compresseurs et aux équipements de refroidissement du condenseur, et donc diminuer la consommation électrique.',
          'L’intérêt est particulièrement important pour les établissements qui fonctionnent avec des installations frigorifiques sur une grande partie de l’année.',
          'Nous pouvons étudier l’éligibilité de votre installation au financement CEE et vérifier les économies potentielles. »',
        ],
      },
      {
        titre: 'Étape 4 – Conclusion',
        dire: [
          '« Dans votre cas, le plus pertinent serait de faire intervenir un technicien qui connaît les installations frigorifiques.',
          'Il pourra vérifier votre régulation actuelle, les caractéristiques du groupe froid et déterminer si une opération de haute pression flottante est envisageable.',
          'Est-ce que vous seriez disponible pour un premier échange technique ? »',
        ],
      },
    ],
  },
  {
    id: 'photovoltaique',
    titre: 'Photovoltaïque (transfert de charge)',
    cible: 'Entreprises industrielles, bâtiments logistiques, grandes surfaces, exploitations agricoles, forte consommation électrique.',
    note: 'Argumentaire orienté rentabilité. On ne parle pas de financement CEE : on vend une optimisation des dépenses électriques par autoconsommation.',
    infos: 'Surface disponible, consommation annuelle, profil de consommation, propriétaire.',
    attention: 'Jamais de CEE sur le photovoltaïque. Préciser le montage proposé : investissement propre, tiers-investissement, location ou contrat d’achat d’électricité.',
    etapes: [
      {
        titre: 'Étape 1 – Accroche',
        dire: [
          '« Nous accompagnons actuellement les entreprises qui souhaitent réduire leurs dépenses d’électricité grâce à l’installation de panneaux photovoltaïques.',
          'Nous avons une approche particulière pour les professionnels : plutôt que de présenter le photovoltaïque comme un investissement classique, nous étudions une solution basée sur le transfert de charge énergétique.',
          'L’objectif est de produire une partie de votre électricité directement sur votre bâtiment et de consommer cette énergie au moment où votre entreprise en a besoin.',
          'Cela permet de substituer une partie de l’électricité achetée au réseau par une production solaire locale. »',
        ],
      },
      {
        titre: 'Étape 2 – Qualification',
        dire: ['« Pour savoir si votre établissement présente un potentiel intéressant, j’aurais quelques questions : »'],
        questions: [
          '« Vous êtes propriétaire ou locataire du bâtiment ? »',
          '« Vous disposez d’une toiture suffisamment importante ? »',
          '« Vous connaissez votre consommation électrique annuelle ? »',
          '« Votre activité fonctionne principalement en journée ? »',
          '« Vous avez des équipements qui consomment beaucoup d’électricité : machines, chambres froides, climatisation, compresseurs, lignes de production ? »',
          '« Vous avez déjà une installation photovoltaïque ? »',
        ],
      },
      {
        titre: 'Étape 3 – Explication du transfert de charge',
        dire: [
          '« Le principe est assez simple. Aujourd’hui, votre entreprise achète de l’électricité auprès de son fournisseur.',
          'Avec une installation photovoltaïque, une partie de cette énergie est produite directement sur votre toiture. Lorsque vos équipements consomment cette électricité pendant les heures de production solaire, vous réduisez les volumes achetés au réseau.',
          'On parle de transfert de charge parce qu’une partie de votre consommation électrique est couverte par une production locale plutôt que par votre fournisseur habituel.',
          'L’objectif est donc de diminuer votre facture sans dépendre uniquement des évolutions du prix de l’électricité.',
          'Selon le montage retenu, le projet peut être financé par un tiers investisseur ou par un autre mécanisme contractuel, ce qui permet de limiter ou d’éviter un investissement initial de votre entreprise.',
          'Nous devons évidemment vérifier le coût du montage, le prix de l’énergie produite et les économies réellement attendues. »',
        ],
      },
      {
        titre: 'Étape 4 – Argumentaire financier',
        dire: [
          '« Ce qui nous intéresse particulièrement, c’est votre profil de consommation. Une entreprise qui consomme beaucoup d’électricité en journée peut avoir un potentiel d’autoconsommation intéressant.',
          'Nous allons comparer votre facture électrique actuelle, votre consommation pendant les heures d’ensoleillement, la production photovoltaïque envisageable, la part d’énergie que vous pourrez autoconsommer, et le coût du montage avec les économies nettes attendues.',
          'L’objectif est de vérifier si le projet permet réellement de réduire vos dépenses énergétiques. »',
        ],
      },
      {
        titre: 'Étape 5 – Conclusion',
        dire: [
          '« Je vous propose de réaliser une première étude de potentiel photovoltaïque.',
          'Pour cela, notre conseiller aura simplement besoin de quelques informations sur votre bâtiment et votre consommation électrique.',
          'Vous pourrez ainsi savoir si votre toiture présente un potentiel intéressant et si l’opération peut être autofinancée par les économies générées.',
          'Est-ce que vous préférez que nous organisions un premier échange cette semaine ou la semaine prochaine ? »',
        ],
      },
    ],
  },
]

/* ------------------------------------------------------------------ Objections */

export const OBJECTIONS: { objection: string; reponse: string[] }[] = [
  { objection: 'Ça ne m’intéresse pas', reponse: [
    '« Je comprends parfaitement. Simplement, je ne vous appelle pas pour vous vendre un équipement aujourd’hui.',
    'Mon objectif est surtout de vérifier si votre entreprise peut bénéficier d’une optimisation énergétique financée en partie ou en totalité par un dispositif existant.',
    'Si après étude il n’y a aucun intérêt économique pour vous, nous en resterons là.',
    'Vous êtes d’accord pour que je vérifie simplement si votre bâtiment peut être concerné ? »',
  ] },
  { objection: 'Nous avons déjà fait des travaux', reponse: [
    '« Très bien, c’est plutôt une bonne chose. Vous avez déjà réalisé quels types de travaux ? Le chauffage, l’isolation, le photovoltaïque ?',
    'Je vous pose la question parce que certains équipements peuvent être complémentaires et qu’il peut rester des opportunités d’optimisation sur d’autres postes énergétiques. »',
  ] },
  { objection: 'Nous n’avons pas de budget', reponse: [
    '« Justement, c’est une des raisons pour lesquelles je vous contacte.',
    'Nous étudions des opérations qui peuvent bénéficier des CEE et, lorsque les conditions sont réunies, permettre une prise en charge intégrale des travaux.',
    'L’objectif est justement de ne pas vous proposer un investissement qui pèserait sur votre trésorerie.',
    'Le premier rendez-vous sert à vérifier si l’opération est économiquement intéressante. »',
  ] },
  { objection: 'Envoyez-moi une documentation', reponse: [
    '« Bien entendu. Simplement, je préfère éviter de vous envoyer une documentation générale qui ne correspondrait pas à votre installation.',
    'Vous êtes plutôt intéressé par une solution concernant votre chauffage, votre bâtiment ou votre consommation électrique ? Je pourrai ainsi vous adresser les informations pertinentes.',
    'Et je vous propose de reprendre contact avec vous après réception pour voir si cela mérite une étude. »',
  ] },
  { objection: 'Je ne crois pas aux travaux financés à 100 %', reponse: [
    '« Je comprends votre réaction, il y a effectivement beaucoup de démarchage sur les dispositifs d’aides.',
    'Je préfère être transparent : nous ne promettons pas un financement avant d’avoir vérifié le dossier. Les CEE sont un dispositif réglementé, avec des conditions techniques et administratives.',
    'Notre travail consiste à vérifier votre éligibilité, à chiffrer le financement réellement mobilisable et à vous présenter le coût restant éventuel avant tout engagement.',
    'Vous gardez ainsi une vision claire de l’opération. »',
  ] },
  { objection: 'Nous sommes locataires', reponse: [
    '« Aucun problème, cela dépend des travaux envisagés. En revanche, il faudra vérifier les conditions d’intervention et obtenir les autorisations nécessaires du propriétaire.',
    'Est-ce que vous avez un contact direct avec le propriétaire ou le gestionnaire du bâtiment ? »',
  ] },
  { objection: 'Nous avons déjà un fournisseur / installateur', reponse: [
    '« C’est très bien, nous ne cherchons pas nécessairement à remplacer vos partenaires habituels.',
    'Nous pouvons simplement intervenir dans une logique d’étude complémentaire sur les dispositifs énergétiques et les financements disponibles.',
    'Votre installateur actuel intervient-il également sur les dispositifs CEE ? »',
  ] },
  { objection: 'Je n’ai pas le temps', reponse: [
    '« Je comprends, je vais donc être très rapide. Je cherche simplement à savoir si votre établissement pourrait être concerné par une opération d’optimisation énergétique.',
    'Si c’est le cas, nous pouvons prévoir un échange de 15 à 20 minutes à un moment qui vous convient.',
    'Vous préférez que je vous rappelle demain ou en fin de semaine ? »',
  ] },
  { objection: 'Ça ne coûte vraiment rien ?', reponse: [
    '« Je préfère ne pas vous annoncer un coût nul sans avoir étudié votre situation. Le principe est de rechercher le financement CEE le plus adapté à votre opération.',
    'Si la prime couvre effectivement l’intégralité du coût éligible, il peut ne pas y avoir de reste à charge sur les travaux concernés.',
    'Dans le cas contraire, nous vous présentons clairement le montant restant avant toute décision. »',
  ] },
  { objection: 'Nous avons déjà des panneaux photovoltaïques', reponse: [
    '« Très bien. Vous avez donc déjà engagé une démarche d’autonomie énergétique.',
    'Votre installation couvre-t-elle une bonne partie de votre consommation ou avez-vous encore des achats importants d’électricité auprès de votre fournisseur ?',
    'Nous pouvons éventuellement étudier l’optimisation de votre autoconsommation, sous réserve de la configuration existante. »',
  ] },
]

/* ------------------------------------------------------------------ Rendez-vous */

/** Informations à obtenir systématiquement avant de prendre un rendez-vous. */
export const INFOS_AVANT_RDV: [string, string][] = [
  ['Nom de l’entreprise', 'Identification'],
  ['Activité', 'Vérifier le secteur'],
  ['Adresse du site', 'Identifier le bâtiment'],
  ['Nom du décideur', 'Identifier le bon interlocuteur'],
  ['Téléphone direct', 'Faciliter le suivi'],
  ['Adresse mail', 'Envoyer les informations'],
  ['Propriétaire ou locataire', 'Vérifier les droits sur le bâtiment'],
  ['Surface approximative', 'Première qualification'],
  ['Énergie utilisée', 'Identifier les besoins'],
  ['Installation existante', 'Vérifier la faisabilité'],
  ['Intérêt exprimé', 'Évaluer la maturité'],
  ['Disponibilités', 'Fixer le rendez-vous'],
]

export const CONFIRMATION_RDV: string[] = [
  '« Parfait Monsieur/Madame [Nom].',
  'Je vous confirme donc notre rendez-vous le [date] à [heure].',
  'Nous allons prévoir un échange avec notre conseiller spécialisé concernant [produit].',
  'L’objectif sera d’étudier votre installation actuelle, de vérifier les possibilités techniques et de déterminer le financement ou la rentabilité envisageable.',
  'Pour préparer cet échange, si vous disposez de vos dernières factures énergétiques ou de quelques informations sur votre bâtiment, cela pourra être utile.',
  'Je vous confirme également vos coordonnées : [coordonnées].',
  'Merci pour votre disponibilité et excellente journée à vous. »',
]

export const SMS_CONFIRMATION = `Bonjour Monsieur/Madame [Nom],

Suite à notre échange téléphonique, nous vous confirmons votre rendez-vous avec notre conseiller Reno Soluces :

Date : [date]
Heure : [heure]
Adresse : [adresse]

Objet : Étude de votre projet d’optimisation énergétique – [produit].

Cet échange permettra d’étudier la faisabilité technique et les possibilités de financement de votre projet.

Bien cordialement,
L’équipe Reno Soluces`

export const APRES_APPEL: string[] = [
  'Dans la fiche prospect : résultat (rdv pris, à rappeler, pas intéressé, ne plus appeler, numéro erroné), nom et fonction du décideur, remplir le questionnaire pro.',
  'Rdv pris : date, heure, conseiller, adresse du site et produit en jeu. Envoyer le SMS ou le mail de confirmation dans l’heure.',
  'À rappeler : toujours une date et une heure précises, jamais « plus tard ».',
  'Pas intéressé : noter la raison réelle (déjà équipé, pas propriétaire, pas de budget, mauvais moment).',
]

/* ------------------------------------------------------------------ Repères */

export const REPERES_CEE: [string, string][] = [
  ['PAC air/eau collective tertiaire', 'BAT-TH-163'],
  ['Déstratificateur tertiaire', 'BAT-TH-142'],
  ['Déstratificateur industriel', 'IND-BA-110'],
  ['Haute pression flottante', 'BAT-TH-134'],
  ['Isolation toiture plate', 'Vérifier la fiche applicable selon le bâtiment et les travaux'],
]

export const NOTES_REPERES: string[] = [
  'Références issues du script source : à faire valider avec Idehome avant de les citer à un prospect.',
  'La HP flottante (BAT-TH-134) concerne la régulation d’un groupe de production de froid.',
  'Toiture plate : faire valider la référence exacte de la fiche et ses critères avant de lancer une campagne.',
  'Photovoltaïque : le transfert de charge est un argument économique, pas une prime CEE.',
]

export const CAMPAGNES: [string, string, string][] = [
  ['PAC air/eau', 'Réduction des dépenses de chauffage', 'Haute'],
  ['Déstratificateur', 'Optimisation du chauffage des grands volumes', 'Très haute'],
  ['Toiture plate', 'Réduction des déperditions thermiques', 'Haute'],
  ['HP flottante', 'Réduction de la consommation des groupes froids', 'Très haute'],
  ['Photovoltaïque', 'Réduction durable de la facture électrique', 'Très haute'],
]

export const CONSEIL_CAMPAGNES =
  'Une campagne par produit, pas cinq produits dans le même appel. On identifie le potentiel du prospect et on propose la solution la plus pertinente. Exemple : un supermarché peut être concerné par la HP flottante, le photovoltaïque et la déstratification, mais on commence par son problème énergétique principal.'
