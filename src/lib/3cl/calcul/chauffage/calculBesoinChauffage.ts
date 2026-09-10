import { Batiment3CL } from "../../batiment3CL";

import { calculDeperditions } from "../../calcul/deperditions/calculDeperditions";
import { calculInertieBatiment } from "../../physique/calculInertie";
import { calculApportsInternesMois } from "../../physique/calculApportsInternes";
import { calculApportsSolairesMois } from "../../physique/calculApportsSolairesMensuels";
import { calculFj } from "../../physique/calculFj";
import { donneesClimatMensuelles } from "../../database/climatMensuel";

export interface DetailMoisChauffage {
  mois: number;
  dh19: number;
  fj: number;
  besoinKWh: number;
}

export interface ResultatBesoin {

  hTotal: number; // GV (W/K)

  besoinAnnuel: number; // kWh, hors intermittence (appliquée en aval)

  detailMensuel: DetailMoisChauffage[];

}

// Besoin de chauffage — méthode 3CL-DPE 2021, §2 et §6.1 (calcul MENSUEL, remplace
// l'ancien calcul annuel simplifié "GV x DJU x 24").
//
// Pour chaque mois j de la saison de chauffe :
//   BVj = GV * (1 - Fj)                              (§2, formule officielle exacte)
//   Bchj = BVj * DHj / 1000                           (§9.1.1, simplifié : les pertes
//                                                       récupérées de génération/distribution
//                                                       ECS ne sont pas encore modélisées ici)
//   Bch = Σj Bchj
//
// Fj dépend de l'inertie du bâtiment et du ratio apports gratuits / déperditions du mois
// (voir calculFj.ts). Les données climatiques mensuelles (DHj, ensoleillement) sont une
// approximation en attendant la table officielle exacte (voir database/climatMensuel.ts).
export function calculBesoinChauffage(
  batiment: Batiment3CL
): ResultatBesoin {

  const deperditions = calculDeperditions(batiment);
  const gv = deperditions.total;

  const inertie = calculInertieBatiment(batiment);
  const climat = donneesClimatMensuelles(batiment.zoneClimatique);

  const detailMensuel: DetailMoisChauffage[] = [];
  let besoinAnnuel = 0;

  for (const moisData of climat) {

    if (moisData.dh19 <= 0) {
      detailMensuel.push({ mois: moisData.mois, dh19: 0, fj: 0, besoinKWh: 0 });
      continue;
    }

    const aij = calculApportsInternesMois(batiment, moisData.nref);
    const asj = calculApportsSolairesMois(batiment, moisData.mois, moisData.ensoleillementSud);

    const fj = calculFj(asj, aij, gv, moisData.dh19, inertie);

    const bvj = gv * (1 - fj);

    const bchj = (bvj * moisData.dh19) / 1000; // kWh

    besoinAnnuel += Math.max(0, bchj);

    detailMensuel.push({
      mois: moisData.mois,
      dh19: moisData.dh19,
      fj: Math.round(fj * 1000) / 1000,
      besoinKWh: Math.round(bchj),
    });

  }

  return {

    hTotal: gv,

    besoinAnnuel: Math.round(besoinAnnuel),

    detailMensuel,

  };

}
