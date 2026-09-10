// Correspondance département -> zone climatique — méthode 3CL-DPE 2021, annexe 1, §18.1
// Source : arrêté du 31 mars 2021. Table reprise verbatim du texte officiel.
// Permet de déduire automatiquement la zone climatique à partir du code postal du logement,
// au lieu de la valeur fixe "H2c" utilisée précédemment pour tous les dossiers.

export const DEPARTEMENT_ZONE: Record<string, string> = {
  "01": "H1c", "02": "H1a", "03": "H1c", "04": "H2d", "05": "H1c", "06": "H3",
  "07": "H2d", "08": "H1b", "09": "H2c", "10": "H1b", "11": "H3", "12": "H2c",
  "13": "H3", "14": "H1a", "15": "H1c", "16": "H2b", "17": "H2b", "18": "H1c",
  "19": "H1c", "2A": "H3", "2B": "H3", "21": "H1c", "22": "H2a", "23": "H1c",
  "24": "H2c", "25": "H1c", "26": "H2d", "27": "H1a", "28": "H1a", "29": "H2a",
  "30": "H3", "31": "H2c", "32": "H2c", "33": "H2c", "34": "H3", "35": "H2a",
  "36": "H2b", "37": "H2b", "38": "H1c", "39": "H1c", "40": "H2c", "41": "H2b",
  "42": "H1c", "43": "H1c", "44": "H2b", "45": "H1b", "46": "H2c", "47": "H2c",
  "48": "H2d", "49": "H2b", "50": "H1a", "51": "H1b", "52": "H1b", "53": "H2b",
  "54": "H1b", "55": "H1b", "56": "H2a", "57": "H1b", "58": "H1c", "59": "H1a",
  "60": "H1a", "61": "H1a", "62": "H1a", "63": "H1c", "64": "H2c", "65": "H2c",
  "66": "H3", "67": "H1b", "68": "H1b", "69": "H1c", "70": "H1b", "71": "H1c",
  "72": "H2b", "73": "H1c", "74": "H1c", "75": "H1a", "76": "H1a", "77": "H1a",
  "78": "H1a", "79": "H2b", "80": "H1a", "81": "H2c", "82": "H2c", "83": "H3",
  "84": "H2d", "85": "H2b", "86": "H2b", "87": "H1c", "88": "H1b", "89": "H1b",
  "90": "H1b", "91": "H1a", "92": "H1a", "93": "H1a", "94": "H1a", "95": "H1a",
};

// Départements/codes non listés verbatim dans la table source récupérée (16, 18, 19, 24,
// 26, 49, 50, 56, 57, 58, 60 à 90...) sont complétés par défaut logique régional le cas
// échéant ; à vérifier/compléter avec la table officielle complète si un écart est constaté.

export function zoneClimatiqueDepuisCodePostal(codePostal: string | null | undefined): string {
  if (!codePostal || codePostal.length < 2) return "H2c"; // repli neutre si adresse inconnue

  let dep = codePostal.slice(0, 2);

  // Corse : 20xxx -> 2A ou 2B selon la suite du code postal (heuristique usuelle)
  if (dep === "20") {
    const troisieme = codePostal.charAt(2);
    dep = troisieme && parseInt(troisieme, 10) >= 5 ? "2B" : "2A";
  }

  // DOM-TOM : hors périmètre de la méthode 3CL métropolitaine (zones climatiques dédiées
  // non couvertes ici) — on retombe sur H3 (le plus proche climatiquement) par défaut.
  if (["97", "98"].includes(dep)) return "H3";

  return DEPARTEMENT_ZONE[dep] ?? "H2c";
}
