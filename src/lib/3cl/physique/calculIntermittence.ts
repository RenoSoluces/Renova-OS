import { Batiment3CL } from "../batiment3CL";
import { ClasseInertie } from "../database/inertie";
import { getI0, TypeChauffageInt, TypeEmetteur } from "../database/intermittence";

// INT = I0 / (1 + 0,1*(G-1)), G = GV / (Hsp * Sh)  — formule officielle exacte (§8).
//
// Le wizard actuel ne capture pas le type de régulation (thermostat pièce par pièce,
// central...) ni précisément le type d'émetteur : on déduit une hypothèse raisonnable à
// partir du système de chauffage principal renseigné, avec un réglage médian par défaut
// ("central avec minimum de température", cas le plus courant en rénovation : chaudière +
// robinets thermostatiques). Cette hypothèse est documentée et peut faire varier le
// résultat de quelques % ; une saisie dédiée dans le wizard permettrait de l'affiner.
function deduireEmetteurEtChauffage(systemePrincipal: string | undefined): {
  typeChauffage: TypeChauffageInt;
  emetteur: TypeEmetteur;
} {
  const val = (systemePrincipal || "").toLowerCase();

  if (val.includes("plancher")) {
    return { typeChauffage: "central_avec_regulation", emetteur: "plancher_chauffant" };
  }
  if (val.includes("convecteur") || val.includes("radiateur_electrique") || val.includes("effet_joule")) {
    return { typeChauffage: "divise", emetteur: "radiateur" };
  }
  if (val.includes("pac_air_air") || val.includes("air_air")) {
    return { typeChauffage: "central_avec_regulation", emetteur: "air_souffle" };
  }
  // Chaudière (gaz/fioul/bois), PAC air/eau, réseau de chaleur : cas central + radiateurs
  return { typeChauffage: "central_avec_regulation", emetteur: "radiateur" };
}

export function calculIntermittence(
  batiment: Batiment3CL,
  gv: number,
  inertie: ClasseInertie
): number {

  const sh = batiment.surfaceHabitable;
  const hsp = batiment.hauteurSousPlafond || 2.5;

  if (sh <= 0 || hsp <= 0) return 0.85;

  const g = gv / (hsp * sh);

  const { typeChauffage, emetteur } = deduireEmetteurEtChauffage(
    batiment.chauffage?.systeme_principal
  );

  const i0 = getI0(
    inertie === "lourde" || inertie === "tres_lourde",
    typeChauffage,
    emetteur,
    "central_avec_minimum" // hypothèse par défaut : régulation avec un minimum de température
  );

  const int = i0 / (1 + 0.1 * (g - 1));

  return Math.max(0.5, Math.min(1.1, int));

}
