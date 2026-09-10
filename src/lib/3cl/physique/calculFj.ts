import { ClasseInertie } from "../database/inertie";

// Fj — méthode 3CL-DPE 2021, §6.1. Formule officielle EXACTE (reprise telle quelle) :
//
//   Xj = (Asj + Aij) / (GV * DHj)
//
//   Fj = (Xj - Xj^a) / (1 - Xj^a)     avec a = 3,6 (inertie lourde/très lourde)
//                                           a = 2,9 (inertie moyenne)
//                                           a = 2,5 (inertie légère)
//
// GV en W/K, DHj en °Ch, Asj/Aij en Wh -> Xj est sans dimension.
export function calculFj(
  asj: number,       // apports solaires du mois (Wh)
  aij: number,       // apports internes du mois (Wh)
  gv: number,         // déperditions de l'enveloppe (W/K)
  dhj: number,        // degrés-heures du mois (°Ch)
  inertie: ClasseInertie
): number {

  if (gv <= 0 || dhj <= 0) return 0;

  const exposant =
    inertie === "lourde" || inertie === "tres_lourde" ? 3.6 :
    inertie === "moyenne" ? 2.9 :
    2.5;

  // Xj = (Asj+Aij) / (GV * DHj). Les apports sont en Wh, GV*DHj est en Wh également
  // (W/K * °Ch = Wh), donc Xj est bien sans dimension.
  const xj = (asj + aij) / (gv * dhj);

  if (xj <= 0) return 0;
  if (xj >= 1) return 0.999; // le bâtiment ne nécessite quasi aucun chauffage ce mois-ci

  const fj =
    (xj - Math.pow(xj, exposant)) /
    (1 - Math.pow(xj, exposant));

  return Math.max(0, Math.min(1, fj));

}
