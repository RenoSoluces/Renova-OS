// Point d'entrée public du moteur 3CL.
//
// Le calcul DPE canonique est calculDPE() (./calculDPE.ts), qui agrège chauffage + ECS +
// auxiliaires, applique la méthode du double seuil (étiquette finale = la moins bonne des
// deux entre énergie et GES) et renvoie une étiquette unique dans le champ `etiquette`.
// C'est cette fonction (et ce champ) qui doit être utilisée partout dans l'application —
// ne pas réintroduire de second calculateur DPE parallèle.

export * from "./batiment3CL";
export * from "./database/zonesClimatiques";
export * from "./database/chauffages";
export * from "./database/ecs";
export * from "./database/isolants";
export * from "./database/materiaux";
export * from "./database/menuiseries";
export * from "./database/pontsThermiques";
export * from "./database/ventilation";
export * from "./database/inertie";
export * from "./database/intermittence";
export * from "./database/facteurSolaire";
export * from "./database/climatMensuel";
export * from "./database/departementsZones";

export * from "./calcul/deperditions/calculTransmission";
export * from "./calcul/ventilation/calculInfiltration";
export * from "./calcul/ventilation/calculVentilation";
export * from "./calcul/ventilation/calculRenouvellementAir";
export * from "./calcul/deperditions/calculPontsThermiques";
export * from "./construction/construirePontsThermiques";
export * from "./calcul/deperditions/calculDeperditions";
export * from "./physique/calculInertie";
export * from "./physique/calculApportsInternes";
export * from "./physique/calculApportsSolairesMensuels";
export * from "./physique/calculFj";
export * from "./physique/calculIntermittence";
export * from "./calcul/chauffage/calculBesoinChauffage";
export * from "./calcul/chauffage/calculCOP";
export * from "./calcul/chauffage/calculSCOP";
export * from "./calcul/chauffage/calculGeneration";
export * from "./calcul/chauffage/calculDistribution";
export * from "./calcul/chauffage/calculEmission";
export * from "./calcul/chauffage/calculRegulation";
export * from "./calcul/calculAuxiliaires";
export * from "./calcul/chauffage/calculConsommationChauffage";

export * from "./calcul/ecs/calculBesoinECS";
export * from "./calcul/ecs/calculGenerationECS";
export * from "./calcul/ecs/calculStockageECS";
export * from "./calcul/ecs/calculDistributionECS";
export * from "./calcul/ecs/calculConsommationECS";

export * from "./calculDPE";
export * from "./calcul/calculEtiquette";
export * from "./amelioration";
export * from "./moteur3CL";
export * from "./analyse/analyseMaison";
export * from "./analyse/proposerTravaux";
export { simulateurTravaux } from "./analyse/simulateurTravaux";
export type { TypeTravaux as TypeTravauxSimulateur } from "./analyse/simulateurTravaux";
export * from "./analyse/calculGainTravaux";
export * from "./analyse/simulerScenario";
export * from "./climatisation";
