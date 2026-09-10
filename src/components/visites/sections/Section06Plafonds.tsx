import { PlafondFiche } from "../../../types";
import { PhotoGrid } from "../../shared/PhotoGrid";

interface Props {
  plafonds: PlafondFiche[];
  onChange: (plafonds: PlafondFiche[]) => void;
}

const TYPES = [
  "Combles perdus",
  "Rampants",
  "Toiture terrasse",
  "Plafond sous grenier",
];

const COMPOSITIONS = [
  "Béton",
  "Bois",
  "Plâtre",
  "Hourdis",
];

const ISOLANTS = [
  "Aucun",
  "Laine de verre",
  "Laine de roche",
  "Ouate",
  "Polyuréthane",
  "Polystyrène",
];

export default function Section06Plafonds({
  plafonds,
  onChange,
}: Props) {

  function ajouter() {
    onChange([
      ...plafonds,
      {
        id: crypto.randomUUID(),
        type: "",
        position: "",
        surface_m2: null,
        composition: "",
        isolation: "Non",
        isolant_type: "",
        epaisseur_isolant_cm: null,
        notes: "",
        photos: [],
      },
    ]);
  }

  function modifier(index: number, champ: keyof PlafondFiche, valeur: any) {
    const copie = [...plafonds];
    copie[index] = {
      ...copie[index],
      [champ]: valeur,
    };
    onChange(copie);
  }

  function supprimer(index: number) {
    onChange(plafonds.filter((_, i) => i !== index));
  }

  return (
    <div className="section-card">

      <div className="section-header">
        <h2>Plafonds / Toiture</h2>

        <button
          className="btn-primary"
          onClick={ajouter}
        >
          Ajouter
        </button>
      </div>

      {plafonds.map((plafond, i) => (

        <div
          className="card"
          key={plafond.id}
        >

          <div className="grid-2">

            <label>
              Type

              <select
                value={plafond.type}
                onChange={(e) =>
                  modifier(i, "type", e.target.value)
                }
              >
                <option value="">Choisir</option>

                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

            </label>

            <label>
              Surface

              <input
                type="number"
                value={plafond.surface_m2 ?? ""}
                onChange={(e) =>
                  modifier(i, "surface_m2", Number(e.target.value))
                }
              />

            </label>

            <label>
              Composition

              <select
                value={plafond.composition}
                onChange={(e) =>
                  modifier(i, "composition", e.target.value)
                }
              >
                <option value="">Choisir</option>

                {COMPOSITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

            </label>

            <label>
              Isolation

              <select
                value={plafond.isolation}
                onChange={(e) =>
                  modifier(i, "isolation", e.target.value)
                }
              >
                <option>Oui</option>
                <option>Non</option>
              </select>

            </label>

            {plafond.isolation === "Oui" && (
              <>
                <label>

                  Isolant

                  <select
                    value={plafond.isolant_type}
                    onChange={(e) =>
                      modifier(i, "isolant_type", e.target.value)
                    }
                  >
                    <option value="">Choisir</option>

                    {ISOLANTS.map((iso) => (
                      <option key={iso}>{iso}</option>
                    ))}
                  </select>

                </label>

                <label>

                  Épaisseur (cm)

                  <input
                    type="number"
                    value={plafond.epaisseur_isolant_cm ?? ""}
                    onChange={(e) =>
                      modifier(
                        i,
                        "epaisseur_isolant_cm",
                        Number(e.target.value)
                      )
                    }
                  />

                </label>
              </>
            )}

          </div>

          <PhotoGrid
            photos={plafond.photos || []}
            onChange={photos => modifier(i, "photos", photos)}
            label="Photo du plafond / toiture"
          />

          <button
            className="btn-danger"
            onClick={() => supprimer(i)}
          >
            Supprimer
          </button>

        </div>

      ))}

    </div>
  );
}