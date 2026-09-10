// Facteur d'intermittence I0 — méthode 3CL-DPE 2021, annexe 1, §8.
// Table "Pour les maisons individuelles (chauffage individuel)" reprise verbatim.
// Ce module ne couvre que le cas maison individuelle (le cas d'usage principal de l'outil) ;
// les tables immeuble collectif (individuel/collectif) du §8 ne sont pas reprises ici.

export type TypeEmetteur = "air_souffle" | "radiateur" | "plafond_chauffant" | "plancher_chauffant";
export type TypeChauffageInt = "divise" | "central_avec_regulation" | "central_sans_regulation";
export type EquipementIntermittence =
  | "absent"
  | "central_sans_minimum"
  | "central_avec_minimum"
  | "piece_par_piece"
  | "piece_par_piece_detection";

interface LigneI0 {
  [key: string]: number; // clé = équipement d'intermittence
}

const TABLE_I0_MAISON_LEGERE_MOYENNE: Record<string, LigneI0> = {
  "divise_air_souffle": { absent: 0.84, central_sans_minimum: 0.83, central_avec_minimum: 0.81, piece_par_piece: 0.77, piece_par_piece_detection: 0.75 },
  "divise_radiateur": { absent: 0.84, central_sans_minimum: 0.83, central_avec_minimum: 0.81, piece_par_piece: 0.77, piece_par_piece_detection: 0.75 },
  "divise_plafond_chauffant": { absent: 0.84, central_sans_minimum: 0.83, central_avec_minimum: 0.81, piece_par_piece: 0.77, piece_par_piece_detection: 0.75 },
  "divise_plancher_chauffant": { absent: 0.90, central_sans_minimum: 0.89, central_avec_minimum: 0.88, piece_par_piece: 0.86, piece_par_piece_detection: 0.86 },
  "central_avec_regulation_air_souffle": { absent: 0.86, central_sans_minimum: 0.85, central_avec_minimum: 0.83, piece_par_piece: 0.79, piece_par_piece_detection: 0.77 },
  "central_avec_regulation_radiateur": { absent: 0.88, central_sans_minimum: 0.87, central_avec_minimum: 0.85, piece_par_piece: 0.82, piece_par_piece_detection: 0.80 },
  "central_avec_regulation_plafond_chauffant": { absent: 0.88, central_sans_minimum: 0.87, central_avec_minimum: 0.85, piece_par_piece: 0.82, piece_par_piece_detection: 0.80 },
  "central_avec_regulation_plancher_chauffant": { absent: 0.90, central_sans_minimum: 0.89, central_avec_minimum: 0.88, piece_par_piece: 0.86, piece_par_piece_detection: 0.86 },
  "central_sans_regulation_air_souffle": { absent: 0.90, central_sans_minimum: 0.89, central_avec_minimum: 0.87 },
  "central_sans_regulation_radiateur": { absent: 0.91, central_sans_minimum: 0.90, central_avec_minimum: 0.88 },
  "central_sans_regulation_plafond_chauffant": { absent: 0.91, central_sans_minimum: 0.90, central_avec_minimum: 0.88 },
  "central_sans_regulation_plancher_chauffant": { absent: 0.92, central_sans_minimum: 0.91, central_avec_minimum: 0.90 },
};

const TABLE_I0_MAISON_LOURDE: Record<string, LigneI0> = {
  "divise_air_souffle": { absent: 0.86, central_sans_minimum: 0.85, central_avec_minimum: 0.83, piece_par_piece: 0.80, piece_par_piece_detection: 0.78 },
  "divise_radiateur": { absent: 0.86, central_sans_minimum: 0.85, central_avec_minimum: 0.83, piece_par_piece: 0.80, piece_par_piece_detection: 0.78 },
  "divise_plafond_chauffant": { absent: 0.86, central_sans_minimum: 0.85, central_avec_minimum: 0.83, piece_par_piece: 0.80, piece_par_piece_detection: 0.78 },
  "divise_plancher_chauffant": { absent: 0.92, central_sans_minimum: 0.91, central_avec_minimum: 0.90, piece_par_piece: 0.88, piece_par_piece_detection: 0.88 },
  "central_avec_regulation_air_souffle": { absent: 0.88, central_sans_minimum: 0.87, central_avec_minimum: 0.85, piece_par_piece: 0.82, piece_par_piece_detection: 0.80 },
  "central_avec_regulation_radiateur": { absent: 0.90, central_sans_minimum: 0.89, central_avec_minimum: 0.87, piece_par_piece: 0.85, piece_par_piece_detection: 0.82 },
  "central_avec_regulation_plafond_chauffant": { absent: 0.90, central_sans_minimum: 0.89, central_avec_minimum: 0.87, piece_par_piece: 0.85, piece_par_piece_detection: 0.82 },
  "central_avec_regulation_plancher_chauffant": { absent: 0.92, central_sans_minimum: 0.91, central_avec_minimum: 0.90, piece_par_piece: 0.88, piece_par_piece_detection: 0.88 },
  "central_sans_regulation_air_souffle": { absent: 0.91, central_sans_minimum: 0.91, central_avec_minimum: 0.89 },
  "central_sans_regulation_radiateur": { absent: 0.93, central_sans_minimum: 0.92, central_avec_minimum: 0.90 },
  "central_sans_regulation_plafond_chauffant": { absent: 0.93, central_sans_minimum: 0.92, central_avec_minimum: 0.90 },
  "central_sans_regulation_plancher_chauffant": { absent: 0.94, central_sans_minimum: 0.93, central_avec_minimum: 0.92 },
};

export function getI0(
  inertieLourde: boolean,
  typeChauffage: TypeChauffageInt,
  emetteur: TypeEmetteur,
  equipement: EquipementIntermittence
): number {
  const table = inertieLourde ? TABLE_I0_MAISON_LOURDE : TABLE_I0_MAISON_LEGERE_MOYENNE;
  const cle = `${typeChauffage}_${emetteur}`;
  const ligne = table[cle];
  if (!ligne) return 0.88; // repli neutre si combinaison non couverte
  return ligne[equipement] ?? ligne["central_avec_minimum"] ?? 0.88;
}
