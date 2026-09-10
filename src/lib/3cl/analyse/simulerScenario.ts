import { Batiment3CL } from "../batiment3CL";

import { calculDPE } from "../calculDPE";

import {

    simulerIsolationCombles,
    simulerIsolationMurs,
    simulerIsolationPlancher,
    simulerMenuiseries,
    simulerPAC,
    simulerPACAirAir,
    simulerBallonThermodynamique,
    simulerVMC

} from "../amelioration";

import { TypeTravaux } from "./calculGainTravaux";

export interface ResultatScenario {

    avant: ReturnType<typeof calculDPE>;

    apres: ReturnType<typeof calculDPE>;

    travaux: TypeTravaux[];

}

export function simulerScenario(

    batiment: Batiment3CL,

    travaux: TypeTravaux[]

): ResultatScenario {

    let courant = structuredClone(batiment);

    const avant = calculDPE(courant);

    for (const travail of travaux) {

        switch (travail) {

            case "combles":
                courant = simulerIsolationCombles(courant).batiment;
                break;

            case "murs":
                courant = simulerIsolationMurs(courant).batiment;
                break;

            case "plancher":
                courant = simulerIsolationPlancher(courant).batiment;
                break;

            case "menuiseries":
                courant = simulerMenuiseries(courant).batiment;
                break;

            case "pac":
                courant = simulerPAC(courant).batiment;
                break;

            case "pac_air_air":
                courant = simulerPACAirAir(courant).batiment;
                break;

            case "ballon_thermodynamique":
                courant = simulerBallonThermodynamique(courant).batiment;
                break;

            case "vmc":
                courant = simulerVMC(courant).batiment;
                break;

        }

    }

    return {

        avant,

        apres: calculDPE(courant),

        travaux,

    };

}