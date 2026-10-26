/**
 * Relevé de pose : les informations dont l'équipe d'installation a besoin, produit par produit.
 *
 * L'audit thermique (sections 1 à 10) décrit le logement ; le relevé de pose décrit le chantier :
 * emplacements, distances, alimentation électrique, accès, photos à prendre. Il sert à chiffrer juste
 * (longueurs de liaison, dépose, nacelle…) et à préparer l'intervention sans seconde visite.
 */
export type TypeChamp = 'choix' | 'nombre' | 'texte'

export interface ChampReleve {
  id: string
  label: string
  type: TypeChamp
  options?: string[]
  unite?: string
  obligatoire?: boolean
  aide?: string
}

export interface ReleveProduit {
  produit: string
  label: string
  champs: ChampReleve[]
  photos: string[]
}

const OUI_NON = ['Oui', 'Non']

export const RELEVES_POSE: ReleveProduit[] = [
  {
    produit: 'pac', label: 'Pompe à chaleur air/eau',
    champs: [
      { id: 'generateur_existant', label: 'Générateur existant', type: 'choix', options: ['Chaudière fioul', 'Chaudière gaz', 'Chaudière propane', 'Chaudière bois', 'Électrique', 'Autre'], obligatoire: true },
      { id: 'puissance_existante', label: 'Puissance de l’existant (plaque)', type: 'nombre', unite: 'kW', obligatoire: true },
      { id: 'depose', label: 'Dépose de l’ancien générateur', type: 'choix', options: ['À déposer', 'Conservé en appoint', 'Déjà déposé'], obligatoire: true },
      { id: 'cuve_fioul', label: 'Cuve fioul', type: 'choix', options: ['Aucune', 'À neutraliser', 'À évacuer'] },
      { id: 'emetteurs', label: 'Émetteurs', type: 'choix', options: ['Radiateurs fonte', 'Radiateurs acier', 'Radiateurs alu', 'Plancher chauffant', 'Mixte'], obligatoire: true },
      { id: 'temperature_depart', label: 'Température de départ nécessaire', type: 'choix', options: ['Basse (≤ 45 °C)', 'Moyenne (≤ 55 °C)', 'Haute (≤ 65 °C)'], obligatoire: true },
      { id: 'emplacement_groupe', label: 'Emplacement du groupe extérieur', type: 'choix', options: ['Au sol sur dalle', 'Au sol sur plots', 'Console murale', 'Toit-terrasse'], obligatoire: true },
      { id: 'distance_liaisons', label: 'Longueur des liaisons groupe ↔ module', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'carottage', label: 'Carottage du mur', type: 'choix', options: OUI_NON },
      { id: 'voisinage', label: 'Distance au voisin le plus proche', type: 'nombre', unite: 'm', aide: 'Bruit : vérifier la distance aux fenêtres voisines.' },
      { id: 'alimentation', label: 'Alimentation électrique', type: 'choix', options: ['Monophasé', 'Triphasé'], obligatoire: true },
      { id: 'puissance_compteur', label: 'Puissance souscrite', type: 'nombre', unite: 'kVA', obligatoire: true },
      { id: 'tableau', label: 'Tableau électrique', type: 'choix', options: ['Conforme, place disponible', 'À compléter', 'À refaire'], obligatoire: true },
      { id: 'ecs', label: 'Eau chaude sanitaire', type: 'choix', options: ['Ballon intégré (PAC duo)', 'Ballon séparé', 'Conserver l’existant'] },
      { id: 'desembouage', label: 'Désembouage nécessaire', type: 'choix', options: ['Oui', 'Non', 'À évaluer'] },
    ],
    photos: ['Plaque signalétique du générateur existant', 'Chaufferie / local du module', 'Emplacement du groupe extérieur', 'Tableau électrique ouvert', 'Compteur', 'Un radiateur type'],
  },
  {
    produit: 'pac_air_air', label: 'Pompe à chaleur air/air',
    champs: [
      { id: 'nb_unites', label: 'Nombre d’unités intérieures', type: 'nombre', obligatoire: true },
      { id: 'pieces', label: 'Pièces équipées', type: 'texte', obligatoire: true, aide: 'Ex. séjour 35 m², chambre 1 12 m²…' },
      { id: 'type_unites', label: 'Type d’unités', type: 'choix', options: ['Murales', 'Consoles', 'Gainable', 'Cassettes'], obligatoire: true },
      { id: 'emplacement_groupe', label: 'Emplacement du groupe extérieur', type: 'choix', options: ['Au sol', 'Console murale', 'Balcon', 'Toit-terrasse'], obligatoire: true },
      { id: 'longueur_liaisons', label: 'Longueur totale des liaisons', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'goulottes', label: 'Passage des liaisons', type: 'choix', options: ['Goulotte extérieure', 'Goulotte intérieure', 'Encastré / combles'] },
      { id: 'condensats', label: 'Évacuation des condensats', type: 'choix', options: ['Gravitaire', 'Pompe de relevage'], obligatoire: true },
      { id: 'alimentation', label: 'Alimentation électrique', type: 'choix', options: ['Monophasé', 'Triphasé'], obligatoire: true },
      { id: 'copropriete', label: 'Accord de copropriété', type: 'choix', options: ['Non concerné', 'Obtenu', 'À demander'] },
    ],
    photos: ['Chaque pièce avec le mur prévu', 'Façade et emplacement du groupe', 'Tableau électrique'],
  },
  {
    produit: 'ballon_thermodynamique', label: 'Chauffe-eau thermodynamique',
    champs: [
      { id: 'ballon_existant', label: 'Ballon existant', type: 'choix', options: ['Cumulus électrique', 'Ballon sur chaudière', 'Chauffe-eau gaz', 'Aucun'], obligatoire: true },
      { id: 'capacite_existante', label: 'Capacité existante', type: 'nombre', unite: 'L' },
      { id: 'piece', label: 'Pièce d’installation', type: 'choix', options: ['Garage', 'Cellier / buanderie', 'Sous-sol', 'Version split (unité extérieure)'], obligatoire: true },
      { id: 'volume_piece', label: 'Volume de la pièce', type: 'nombre', unite: 'm³', obligatoire: true, aide: '20 m³ minimum en air ambiant non gainé.' },
      { id: 'hauteur', label: 'Hauteur sous plafond', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'gainage', label: 'Gainage de l’air', type: 'choix', options: ['Non', 'Aspiration', 'Rejet', 'Aspiration et rejet'] },
      { id: 'evacuation', label: 'Évacuation des condensats', type: 'choix', options: ['Siphon à proximité', 'À créer'], obligatoire: true },
      { id: 'escalier', label: 'Accès (escalier, porte étroite)', type: 'choix', options: ['Facile', 'Difficile'] },
    ],
    photos: ['Ballon existant et sa plaque', 'Pièce d’installation', 'Arrivée d’eau et groupe de sécurité', 'Tableau électrique'],
  },
  {
    produit: 'combles', label: 'Isolation des combles',
    champs: [
      { id: 'type', label: 'Type', type: 'choix', options: ['Combles perdus soufflés', 'Combles perdus déroulés', 'Rampants', 'Sarking'], obligatoire: true },
      { id: 'surface', label: 'Surface à isoler', type: 'nombre', unite: 'm²', obligatoire: true },
      { id: 'hauteur_faitage', label: 'Hauteur sous faîtage', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'acces', label: 'Accès aux combles', type: 'choix', options: ['Trappe intérieure', 'Par l’extérieur', 'Ouverture à créer'], obligatoire: true },
      { id: 'isolant_existant', label: 'Isolant existant', type: 'choix', options: ['Aucun', 'Laine tassée < 10 cm', 'Laine 10 – 20 cm', 'À retirer'], obligatoire: true },
      { id: 'spots', label: 'Spots encastrés', type: 'nombre', aide: 'Capots de protection à prévoir.' },
      { id: 'conduits', label: 'Conduits de fumée', type: 'choix', options: ['Aucun', '1', '2 et +'], aide: 'Écart au feu à respecter.' },
      { id: 'vmc', label: 'VMC dans les combles', type: 'choix', options: OUI_NON },
      { id: 'pare_vapeur', label: 'Pare-vapeur', type: 'choix', options: ['Présent', 'À poser', 'Non nécessaire'] },
      { id: 'distance_camion', label: 'Distance camion ↔ trappe', type: 'nombre', unite: 'm' },
    ],
    photos: ['Trappe d’accès', 'Vue générale des combles', 'Isolant existant avec mètre', 'Spots et conduits'],
  },
  {
    produit: 'murs', label: 'Isolation des murs',
    champs: [
      { id: 'technique', label: 'Technique', type: 'choix', options: ['ITE enduit', 'ITE bardage', 'ITI'], obligatoire: true },
      { id: 'surface', label: 'Surface de murs', type: 'nombre', unite: 'm²', obligatoire: true },
      { id: 'hauteur', label: 'Hauteur maximale', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'echafaudage', label: 'Échafaudage', type: 'choix', options: ['Pied', 'Nacelle', 'Non nécessaire'], obligatoire: true },
      { id: 'support', label: 'Support', type: 'choix', options: ['Parpaing', 'Brique', 'Pierre', 'Béton', 'Bois'], obligatoire: true },
      { id: 'tableaux', label: 'Retours de tableaux', type: 'nombre', unite: 'ml' },
      { id: 'urbanisme', label: 'Déclaration préalable', type: 'choix', options: ['À déposer', 'Déposée', 'Accordée'] },
    ],
    photos: ['Chaque façade', 'Détail du support', 'Appuis de fenêtres et descentes d’eau'],
  },
  {
    produit: 'plancher', label: 'Isolation du plancher bas',
    champs: [
      { id: 'local', label: 'Local en dessous', type: 'choix', options: ['Sous-sol', 'Vide sanitaire', 'Garage'], obligatoire: true },
      { id: 'surface', label: 'Surface', type: 'nombre', unite: 'm²', obligatoire: true },
      { id: 'hauteur', label: 'Hauteur disponible', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'reseaux', label: 'Réseaux au plafond', type: 'choix', options: ['Peu', 'Nombreux'] },
    ],
    photos: ['Vue générale du plafond', 'Réseaux existants'],
  },
  {
    produit: 'menuiseries', label: 'Menuiseries',
    champs: [
      { id: 'nombre', label: 'Nombre de menuiseries', type: 'nombre', obligatoire: true },
      { id: 'pose', label: 'Type de pose', type: 'choix', options: ['Rénovation sur dormant', 'Dépose totale', 'Applique', 'Tunnel'], obligatoire: true },
      { id: 'cotes', label: 'Cotes relevées', type: 'texte', obligatoire: true, aide: 'Une ligne par menuiserie : pièce, largeur × hauteur (tableau).' },
      { id: 'materiau', label: 'Matériau souhaité', type: 'choix', options: ['PVC', 'Aluminium', 'Bois', 'Mixte bois-alu'], obligatoire: true },
      { id: 'couleur', label: 'Couleur', type: 'texte' },
      { id: 'volets', label: 'Volets', type: 'choix', options: ['Conservés', 'Roulants à poser', 'Battants à remplacer'] },
      { id: 'etage', label: 'Étage le plus haut', type: 'choix', options: ['RDC', '1er', '2e et +'] },
    ],
    photos: ['Chaque menuiserie, intérieur', 'Chaque menuiserie, extérieur', 'Détail du dormant existant'],
  },
  {
    produit: 'vmc', label: 'Ventilation',
    champs: [
      { id: 'type', label: 'Système prévu', type: 'choix', options: ['Simple flux hygro A', 'Simple flux hygro B', 'Double flux'], obligatoire: true },
      { id: 'pieces_humides', label: 'Pièces humides', type: 'nombre', obligatoire: true },
      { id: 'emplacement_caisson', label: 'Emplacement du caisson', type: 'choix', options: ['Combles', 'Placard', 'Faux plafond'], obligatoire: true },
      { id: 'sortie', label: 'Sortie de toiture', type: 'choix', options: ['Existante', 'À créer', 'Sortie murale'] },
      { id: 'entrees_air', label: 'Entrées d’air sur menuiseries', type: 'choix', options: ['Présentes', 'À créer'] },
    ],
    photos: ['Emplacement du caisson', 'Bouches existantes', 'Sortie de toiture'],
  },
  {
    produit: 'photovoltaique', label: 'Photovoltaïque',
    champs: [
      { id: 'couverture', label: 'Couverture', type: 'choix', options: ['Tuiles mécaniques', 'Tuiles canal', 'Ardoises', 'Bac acier', 'Fibrociment'], obligatoire: true },
      { id: 'orientation', label: 'Orientation', type: 'choix', options: ['Sud', 'Sud-Est', 'Sud-Ouest', 'Est', 'Ouest'], obligatoire: true },
      { id: 'inclinaison', label: 'Inclinaison', type: 'nombre', unite: '°', obligatoire: true },
      { id: 'surface', label: 'Surface exploitable', type: 'nombre', unite: 'm²', obligatoire: true },
      { id: 'hauteur_gouttiere', label: 'Hauteur à la gouttière', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'charpente', label: 'Charpente', type: 'choix', options: ['Fermettes', 'Traditionnelle', 'Métallique'] },
      { id: 'emplacement_onduleur', label: 'Emplacement onduleur / batterie', type: 'texte' },
      { id: 'distance_tableau', label: 'Distance champ ↔ tableau', type: 'nombre', unite: 'm', obligatoire: true },
      { id: 'compteur', label: 'Compteur', type: 'choix', options: ['Linky monophasé', 'Linky triphasé', 'Ancien compteur'], obligatoire: true },
      { id: 'urbanisme', label: 'Contraintes d’urbanisme', type: 'choix', options: ['Aucune', 'Bâtiments de France', 'PLU à vérifier'] },
    ],
    photos: ['Pan de toiture complet', 'Masques (arbres, cheminées)', 'Combles / charpente', 'Tableau électrique et compteur'],
  },
]

export const releveDe = (produit: string | null | undefined) => RELEVES_POSE.find(r => r.produit === produit) || null

export type DonneesReleve = Record<string, Record<string, string>>

/** Avancement d'un relevé : champs obligatoires remplis et photos cochées. */
export function avancementReleve(produit: string, donnees: Record<string, string> | undefined) {
  const r = releveDe(produit)
  if (!r) return { obligatoiresRemplis: 0, obligatoires: 0, photos: 0, photosTotal: 0, complet: true }
  const d = donnees || {}
  const obligatoires = r.champs.filter(c => c.obligatoire)
  const obligatoiresRemplis = obligatoires.filter(c => String(d[c.id] ?? '').trim() !== '').length
  const photos = r.photos.filter((_, i) => d[`photo_${i}`] === 'oui').length
  return { obligatoiresRemplis, obligatoires: obligatoires.length, photos, photosTotal: r.photos.length, complet: obligatoiresRemplis === obligatoires.length }
}
