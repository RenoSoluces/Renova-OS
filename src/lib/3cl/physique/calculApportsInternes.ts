import { Batiment3CL } from "../batiment3CL";
import { calculBesoinECS } from "../calcul/ecs/calculBesoinECS";

// Apports internes mensuels — méthode 3CL-DPE 2021, annexe 1, §6.1. Formule officielle
// reprise à l'identique :
//   Aij = [(3,18 + 0,34) * Sh + 90 * (132/168) * Nadeq] * Nrefj    (Wh)
//
// Nadeq (nombre d'adultes équivalents) est normalement déterminé par une table officielle
// basée sur la surface habitable (§11.1, utilisée aussi pour le besoin d'ECS). Cette table
// n'a pas pu être extraite de façon fiable dans cette session : on réutilise ici le nombre
// d'occupants déjà estimé pour le calcul du besoin d'ECS (1 occupant / 35 m², borné 1-6),
// qui suit la même logique conventionnelle. Approximation documentée.
export function calculApportsInternesMois(
  batiment: Batiment3CL,
  nrefMois: number
): number {

  const sh = batiment.surfaceHabitable;
  const nadeq = calculBesoinECS(batiment).nbOccupants;

  const apports =
    ((3.18 + 0.34) * sh + 90 * (132 / 168) * nadeq) * nrefMois;

  return apports; // Wh

}
