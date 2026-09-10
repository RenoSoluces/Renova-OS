export const ORIENTATIONS = [
  { code: 'N', label: 'Nord' },
  { code: 'NE', label: 'Nord-Est' },
  { code: 'E', label: 'Est' },
  { code: 'SE', label: 'Sud-Est' },
  { code: 'S', label: 'Sud' },
  { code: 'SO', label: 'Sud-Ouest' },
  { code: 'O', label: 'Ouest' },
  { code: 'NO', label: 'Nord-Ouest' },
] as const

export const TYPES_BATIMENT = [
  { value: 'maison', label: 'Maison individuelle' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'immeuble', label: 'Immeuble collectif' },
  { value: 'tertiaire', label: 'Local tertiaire' },
]

export const MITOYENNETE = [
  { value: 'isole', label: 'Isolé' },
  { value: 'jumele', label: 'Jumelé' },
  { value: 'continu', label: 'Continu' },
  { value: 'collectif', label: 'Collectif' },
]

export const TYPES_MUR_COMPOSITION = [
  { value: 'briques_pleines', label: 'Briques pleines' },
  { value: 'briques_creuses', label: 'Briques creuses' },
  { value: 'agglomeres', label: 'Agglomérés / Parpaings' },
  { value: 'beton', label: 'Béton banché' },
  { value: 'pierre', label: 'Pierre massive' },
  { value: 'meuliere', label: 'Meulière' },
  { value: 'bois', label: 'Ossature bois' },
  { value: 'metal', label: 'Structure métallique' },
  { value: 'mixte', label: 'Mixte' },
  { value: 'inconnu', label: 'Inconnu' },
]

export const TYPES_DOUBLAGE = [
  { value: 'aucun', label: 'Aucun' },
  { value: 'platre', label: 'Plâtre sur rail' },
  { value: 'brique', label: 'Brique de cloison' },
  { value: 'carreau', label: 'Carreau de plâtre' },
  { value: 'isolation_interieure', label: 'Isolation intérieure (ITI)' },
]

export const TYPES_ISOLANT = [
  { value: 'laine_verre', label: 'Laine de verre' },
  { value: 'laine_roche', label: 'Laine de roche' },
  { value: 'polystyrene', label: 'Polystyrène' },
  { value: 'polyurethane', label: 'Polyuréthane' },
  { value: 'ouate', label: 'Ouate de cellulose' },
  { value: 'chanvre', label: 'Chanvre' },
  { value: 'liège', label: 'Liège' },
  { value: 'laine_bois', label: 'Laine de bois' },
]

export const TYPES_MENUISERIE = [
  { value: 'fenetre', label: 'Fenêtre' },
  { value: 'porte_fenetre', label: 'Porte-fenêtre' },
  { value: 'baie_vitree', label: 'Baie vitrée' },
  { value: 'porte', label: 'Porte' },
  { value: 'vasistas', label: 'Vasistas' },
  { value: 'chassis', label: 'Châssis fixe' },
]

export const TYPES_VITRAGE = [
  { value: 'simple', label: 'Simple vitrage' },
  { value: 'double', label: 'Double vitrage' },
  { value: 'double_fe', label: 'Double vitrage FE' },
  { value: 'triple', label: 'Triple vitrage' },
]

export const MATERIAUX_MENUISERIE = [
  { value: 'pvc', label: 'PVC' },
  { value: 'bois', label: 'Bois' },
  { value: 'aluminium', label: 'Aluminium' },
  { value: 'mixte', label: 'Mixte bois-alu' },
]

export const OUI_NON = [
  { value: 'oui', label: 'Oui', badge: 'O' },
  { value: 'non', label: 'Non', badge: 'N' },
]

export function labelFromValue(list: { value: string; label: string }[], value: string): string {
  return list.find(item => item.value === value)?.label || value
}
