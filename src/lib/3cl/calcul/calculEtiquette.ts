export interface EtiquetteDPE {

  lettre: string;

  couleur: string;

}

// Seuils énergie primaire — arrêté du 31 mars 2021 (kWhEP/m².an)
const SEUILS_ENERGIE = [

  { max: 70, lettre: "A", couleur: "#009640" },
  { max: 110, lettre: "B", couleur: "#52AE32" },
  { max: 180, lettre: "C", couleur: "#CADB2A" },
  { max: 250, lettre: "D", couleur: "#F6EB14" },
  { max: 330, lettre: "E", couleur: "#F5A623" },
  { max: 420, lettre: "F", couleur: "#E67E22" },
  { max: Infinity, lettre: "G", couleur: "#D0021B" },

];

// Seuils émissions de GES — arrêté du 31 mars 2021 (kgCO2/m².an)
// ATTENTION : distincts des seuils énergie ci-dessus (confusion fréquente : les deux
// grilles ont été confondues à un moment de l'historique de ce fichier).
const SEUILS_GES = [

  { max: 6, lettre: "A", couleur: "#009640" },
  { max: 11, lettre: "B", couleur: "#52AE32" },
  { max: 30, lettre: "C", couleur: "#CADB2A" },
  { max: 50, lettre: "D", couleur: "#F6EB14" },
  { max: 70, lettre: "E", couleur: "#F5A623" },
  { max: 100, lettre: "F", couleur: "#E67E22" },
  { max: Infinity, lettre: "G", couleur: "#D0021B" },

];

const ORDRE_LETTRES = ["A", "B", "C", "D", "E", "F", "G"];

function chercherEtiquette(valeur: number, table: typeof SEUILS_ENERGIE): EtiquetteDPE {

  for (const e of table) {

    if (valeur <= e.max) {

      return { lettre: e.lettre, couleur: e.couleur };

    }

  }

  return { lettre: "G", couleur: "#D0021B" };

}

export function calculEtiquetteEnergie(consommationM2: number): EtiquetteDPE {
  return chercherEtiquette(consommationM2, SEUILS_ENERGIE);
}

export function calculEtiquetteGES(emissionsM2: number): EtiquetteDPE {
  return chercherEtiquette(emissionsM2, SEUILS_GES);
}

// Méthode du double seuil (arrêté du 31 mars 2021, en vigueur depuis le 1er juillet 2021) :
// l'étiquette DPE finale retient la lettre la MOINS FAVORABLE des deux critères
// (énergie primaire et émissions de GES). C'est cette étiquette fusionnée qui doit être
// affichée comme résultat du DPE, pas l'étiquette énergie seule.
export function fusionnerEtiquettes(energie: EtiquetteDPE, ges: EtiquetteDPE): EtiquetteDPE {
  const iEnergie = ORDRE_LETTRES.indexOf(energie.lettre);
  const iGes = ORDRE_LETTRES.indexOf(ges.lettre);
  return iEnergie >= iGes ? energie : ges;
}

// Conservé pour compatibilité ascendante (ancien usage à seuil unique) — utilise désormais
// explicitement la grille énergie. Préférer calculEtiquetteEnergie / calculEtiquetteGES.
export function calculEtiquette(valeur: number): EtiquetteDPE {
  return calculEtiquetteEnergie(valeur);
}
