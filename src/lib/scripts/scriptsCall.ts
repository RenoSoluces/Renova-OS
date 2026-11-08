export interface SectionScript {
  id: string
  titre: string
  note?: string
  paragraphes: string[]
}

export interface ScriptProduit {
  id: string
  titre: string
  cible: string
  presentation: string[]
  attention?: string
}

/** Règles à respecter pendant tout l'appel. */
export const REGLES_APPEL_PRO = [
  'Démarchage B2B uniquement : jamais de particulier à froid. Un refus ou « ne plus rappeler » se note aussitôt dans la fiche.',
  'Ne jamais affirmer « c’est 100 % financé par les CEE » avant l’étude : cela dépend de la fiche d’opération, des performances techniques, de l’installateur RGE et du bénéficiaire.',
  'Ne pas confondre CEE résidentiel et CEE professionnels : les fiches et conditions ne sont pas les mêmes.',
  'Ne pas promettre un montant de prime sans dossier complet.',
  'Photovoltaïque : parler de rentabilité, d’autoconsommation et de transfert de charge, jamais de financement CEE.',
  'Toujours obtenir : type de site, surface, chauffage actuel, consommation, décisionnaire, disponibilité pour un rendez-vous.',
  'Toujours proposer une action concrète : étude gratuite, visite technique ou rendez-vous de 10 à 15 minutes.',
]

export const SECTIONS_GENERALES: SectionScript[] = [
  {
    id: 'ouverture',
    titre: '1. Ouverture',
    paragraphes: [
      'Bonjour, [Prénom du décideur] ?',
      'Moi, c’est [Prénom] de [Nom de l’entreprise]. Je vous appelle rapidement car nous accompagnons les entreprises de votre secteur sur la réduction de leurs charges énergétiques, notamment à travers des solutions de rénovation financées, en tout ou partie, par les certificats d’économies d’énergie.',
      'Je sais que je vous appelle sans rendez-vous : je vous dérange ou vous avez 30 secondes pour que je vous explique pourquoi je vous contacte ?',
    ],
  },
  {
    id: 'accroche',
    titre: '2. Accroche selon la cible',
    note: 'Si le prospect est un industriel, un logisticien, un agriculteur ou un gestionnaire de bâtiment.',
    paragraphes: [
      'Nous intervenons sur les bâtiments professionnels pour identifier les postes où l’énergie est gaspillée : chauffage, production d’eau chaude, air comprimé, froid, éclairage, isolation et consommation électrique.',
      'Selon votre situation, nous pouvons étudier des solutions comme une pompe à chaleur air/eau, un déstratificateur pour réduire la facture de chauffage des grands volumes, une isolation de toiture plate, une pompe à chaleur flottante ou encore une installation photovoltaïque en autoconsommation.',
      'L’objectif n’est pas de vous vendre un équipement, mais de voir s’il existe une opération rentable pour votre site, avec un financement possible via les CEE lorsque le projet est éligible.',
      'Transition : Concrètement, je ne vous demande pas de prendre une décision aujourd’hui. Je souhaite simplement comprendre votre configuration et voir si une étude gratuite peut vous faire économiser de l’argent.',
      'Qui gère aujourd’hui les dépenses énergétiques ou la maintenance des équipements chez vous : vous-même, le responsable technique, ou une autre personne ?',
    ],
  },
  {
    id: 'qualification',
    titre: '3. Qualification du prospect',
    note: 'Poser ces questions dans cet ordre, sans les transformer en interrogatoire.',
    paragraphes: [
      '« Vous êtes bien [fonction / entreprise] à [ville] ? »',
      '« Quel type de site gérez-vous : atelier, entrepôt, magasin, bureau, exploitation agricole, hôtel, restaurant, ou autre ? »',
      '« Quelle est approximativement la surface à chauffer ou à équiper ? »',
      '« Quel est votre système de chauffage actuel : gaz, fioul, électrique, pompe à chaleur, ou autre ? »',
      '« Avez-vous des plafonds hauts, une halle, un entrepôt ou des zones de production où la chaleur monte rapidement ? »',
      '« Avez-vous une toiture plate, une toiture ancienne, ou des problèmes de déperditions thermiques ? »',
      '« Avez-vous un bassin, un process industriel, ou un besoin de production de chaud ou de froid qui pourrait justifier une pompe à chaleur flottante ? »',
      '« Quelle est approximativement votre facture d’énergie annuelle, ou votre consommation en kWh ? »',
      '« Avez-vous déjà étudié une installation photovoltaïque ou un projet d’autoconsommation ? »',
      '« Qui prend la décision sur ce type d’investissement : vous, le dirigeant, le responsable technique, ou le propriétaire du bâtiment ? »',
    ],
  },
  {
    id: 'relance',
    titre: '4. Si le prospect hésite',
    paragraphes: [
      'Je comprends. Ce n’est pas pour vous vendre quelque chose aujourd’hui. Mon rôle est juste de vérifier si votre site présente un potentiel d’économies et si les CEE peuvent réduire fortement le reste à charge.',
      'Sur la base de deux ou trois informations, je peux déjà vous dire si cela vaut la peine d’aller plus loin. Vous avez une idée de votre système de chauffage actuel ?',
    ],
  },
  {
    id: 'financier',
    titre: '6. Argumentaire financier',
    paragraphes: [
      'Notre approche est simple : nous réalisons d’abord une étude gratuite de faisabilité.',
      'Nous regardons votre consommation, vos équipements, vos contraintes techniques et les financements mobilisables. Ensuite, nous vous présentons une proposition claire : économies estimées, investissement, reste à charge et temps de retour.',
      'Pour les opérations éligibles, les CEE peuvent financer une part importante, parfois la totalité selon le montage du projet. Mais je préfère être précis : nous ne promettons pas 100 % avant d’avoir vérifié l’éligibilité réelle de votre site et de l’opération.',
      'Vous n’avez rien à décider aujourd’hui. L’étude est gratuite et sans engagement.',
    ],
  },
  {
    id: 'rdv',
    titre: '8. Prise de rendez-vous et confirmation',
    paragraphes: [
      'Très bien. Je vous propose donc un échange de 10 à 15 minutes avec [Nom du conseiller / technicien].',
      'Il pourra regarder votre consommation, vos équipements, vos contraintes techniques et les financements possibles. À l’issue de cet échange, vous saurez si une étude complète est pertinente.',
      'Je vous propose [jour] à [heure], ou [jour alternatif] à [heure]. Lequel vous convient le mieux ?',
      'Confirmation : Parfait. Je confirme donc [jour] à [heure] avec [Nom du conseiller]. Je vous envoie une invitation par e-mail avec un récapitulatif. Pouvez-vous me confirmer votre adresse e-mail professionnelle, s’il vous plaît ?',
      'Merci [Prénom], je vous souhaite une excellente journée. Au revoir.',
    ],
  },
  {
    id: 'refus',
    titre: '9. Si refus',
    paragraphes: [
      'Je comprends, merci de votre franchise.',
      'Est-ce que je peux simplement vous poser une dernière question : est-ce que c’est le bon moment, ou est-ce que le sujet énergétique n’est pas prioritaire pour vous actuellement ?',
      'Très bien. Je note que je peux vous recontacter dans [3 mois / 6 mois] pour voir si votre situation a évolué. Est-ce que cela vous convient ?',
      'Merci pour votre temps, [Prénom]. Excellente journée.',
    ],
  },
]

export const OBJECTIONS: { objection: string; reponse: string[] }[] = [
  {
    objection: 'Nous n’avons pas le temps',
    reponse: [
      'Je comprends parfaitement. C’est justement pour cela que je ne vous demande pas de meeting technique aujourd’hui.',
      'Je vous propose simplement un échange de 10 minutes avec notre conseiller technique, à une date qui vous convient. Il regardera si votre site présente un potentiel. Si ce n’est pas le cas, nous vous le dirons franchement.',
      'Vous préférez plutôt un créneau en début ou en fin de semaine ?',
    ],
  },
  {
    objection: 'Nous avons déjà un prestataire',
    reponse: [
      'C’est très bien, cela veut dire que vous prenez le sujet au sérieux.',
      'Nous ne venons pas remplacer votre prestataire. Nous pouvons simplement réaliser une étude indépendante et vérifier si des financements CEE ou une solution technique complémentaire peuvent améliorer votre rentabilité.',
      'Cela ne vous engage à rien. Qui gère ce sujet en interne : vous ou votre responsable technique ?',
    ],
  },
  {
    objection: 'Nous n’avons pas de budget',
    reponse: [
      'C’est justement l’intérêt de notre approche.',
      'Lorsqu’une opération est éligible, les CEE peuvent réduire fortement le reste à charge. Selon le projet, le financement peut couvrir une part très importante, voire la totalité de l’investissement.',
      'Mais cela se vérifie cas par cas. Puis-je vous poser deux questions rapides pour voir si votre site est éligible ?',
    ],
  },
  {
    objection: 'Nous avons déjà fait des travaux',
    reponse: [
      'Parfait, cela veut dire que vous avez déjà engagé une démarche.',
      'Nous pouvons vérifier s’il reste des postes non traités : chauffage, isolation, air comprimé, éclairage, production d’eau chaude, froid ou autoconsommation photovoltaïque.',
      'Quel type de travaux avez-vous déjà réalisés ?',
    ],
  },
  {
    objection: 'Envoyez-moi une documentation',
    reponse: [
      'Je peux bien sûr vous l’envoyer. Mais une documentation générale ne vous dira pas si votre site est éligible ni quelles économies vous pouvez réaliser.',
      'Je vous propose mieux : un échange de 10 à 15 minutes avec notre conseiller. Il regardera votre configuration et vous dira si une étude complète a du sens.',
      'Vous êtes plutôt disponible mardi matin ou jeudi après-midi ?',
    ],
  },
  {
    objection: 'Ce n’est pas intéressant',
    reponse: [
      'Je comprends. Peut-être que ce n’est pas la bonne solution pour votre site, ou peut-être que nous n’avons pas encore identifié le bon poste d’économie.',
      'Juste pour être précis : est-ce le principe qui ne vous intéresse pas, ou est-ce que vous avez déjà étudié le sujet et trouvé une offre plus intéressante ?',
      'Si vous avez déjà une proposition, je peux la comparer gratuitement avec notre étude. Cela ne vous engage à rien.',
    ],
  },
]

/** 5. Présentation des solutions : à utiliser après avoir identifié un besoin. */
export const SCRIPTS_PRODUITS: ScriptProduit[] = [
  {
    id: 'pac_air_eau',
    titre: 'Pompe à chaleur air/eau',
    cible: 'Sites chauffés par chaudière gaz ou fioul, chauffage électrique énergivore ou installation vieillissante.',
    presentation: [
      'Pour remplacer ou compléter une chaudière, un système électrique énergivore ou une installation vieillissante, la pompe à chaleur air/eau peut produire du chauffage et de l’eau chaude avec une consommation électrique nettement réduite.',
      'Selon les caractéristiques du bâtiment, de l’équipement et de l’opération, elle peut être éligible aux CEE. Nous vérifions cela gratuitement avant toute proposition chiffrée.',
      'L’intérêt pour vous, c’est de réduire la facture énergétique, d’améliorer le confort de vos équipes et de sécuriser une installation plus performante.',
      'Les CEE concernent notamment les pompes à chaleur air/eau, mais l’éligibilité dépend des critères de la fiche d’opération applicable, de l’installation réalisée par un professionnel RGE et de la conformité technique du projet.',
    ],
  },
  {
    id: 'destratificateur',
    titre: 'Déstratificateur',
    cible: 'Ateliers, entrepôts, halles, hangars et salles de production chauffés, grande hauteur sous plafond.',
    presentation: [
      'Si vous avez des volumes importants — atelier, entrepôt, halle, hangar, salle de production — la chaleur monte naturellement vers le plafond. Résultat : il fait froid au sol alors que vous chauffez inutilement les 8, 10 ou 15 mètres supérieurs.',
      'Le déstratificateur redistribue l’air chaud vers la zone d’activité. Cela permet généralement de réduire la consommation de chauffage, d’améliorer le confort des équipes et de rentabiliser rapidement l’investissement.',
      'C’est une solution simple, sans gros travaux, particulièrement intéressante si vous chauffez un grand volume.',
    ],
  },
  {
    id: 'toiture_plate',
    titre: 'Isolation de toiture plate',
    cible: 'Bâtiments à toiture-terrasse ancienne ou mal isolée.',
    presentation: [
      'Sur une toiture plate, une part importante des déperditions peut passer par le toit, surtout si l’isolation est ancienne, insuffisante ou dégradée.',
      'Nous pouvons étudier une isolation par l’extérieur, qui améliore le confort d’été comme d’hiver, réduit les consommations et valorise le bâtiment.',
      'Selon la nature des travaux et les caractéristiques du projet, l’opération peut entrer dans le cadre des CEE. Nous vérifions les critères avant de vous proposer un chiffrage.',
      'L’isolation des toitures-terrasses figure parmi les opérations pouvant relever des CEE, sous réserve de respecter la fiche standardisée et les exigences techniques applicables.',
    ],
    attention: 'Toitures plates uniquement : pas de bac acier ni de panneau sandwich.',
  },
  {
    id: 'hp_flottante',
    titre: 'Pompe à chaleur flottante',
    cible: 'Sites avec bassin, plan d’eau, process industriel ou besoin de production de chaud et/ou de froid.',
    presentation: [
      'Si vous avez un bassin, un plan d’eau, une application industrielle ou un besoin de production de chaud et/ou de froid, la pompe à chaleur flottante peut être une solution intéressante.',
      'Elle utilise la masse d’eau comme source d’énergie et peut remplacer ou compléter une installation énergivore.',
      'Nous regardons d’abord votre besoin réel, la température requise, les contraintes techniques et le potentiel d’économies. Ensuite seulement, nous étudions le financement CEE possible.',
    ],
  },
  {
    id: 'photovoltaique',
    titre: 'Photovoltaïque',
    cible: 'Pros avec toiture exploitable et consommation d’électricité en journée (jusqu’à 18 kWc).',
    presentation: [
      'Concernant le photovoltaïque, ce n’est pas financé par les CEE. En revanche, il peut s’autofinancer grâce à l’autoconsommation : vous produisez une partie de votre électricité, vous réduisez vos achats au réseau et vous maîtrisez mieux votre facture.',
      'Nous étudions votre profil de consommation, vos heures de fonctionnement, la surface de toiture disponible et l’orientation du projet. L’objectif est de déterminer si l’installation est rentable et en combien de temps elle peut être amortie.',
      'Ce n’est pas une dépense : c’est un investissement qui doit être rentable. Si les chiffres ne sont pas bons, nous vous le dirons clairement.',
      'Le photovoltaïque en autoconsommation permet de réduire l’électricité achetée au réseau ; la rentabilité dépend notamment du profil de consommation, de la puissance installée, du tarif d’électricité et des éventuels revenus de revente.',
    ],
    attention: 'Jamais de CEE sur le PV : parler de rentabilité, d’autoconsommation et de transfert de charge.',
  },
]
