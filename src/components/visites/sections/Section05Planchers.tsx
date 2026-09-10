import { PlancherFiche } from "../../../types";
import { PhotoGrid } from "../../shared/PhotoGrid";

interface Props {
  planchers: PlancherFiche[];
  onChange: (planchers: PlancherFiche[]) => void;
}

const TYPES = [
  "Terre-plein",
  "Vide sanitaire",
  "Sous-sol",
  "Local non chauffé",
];

const COMPOSITIONS = [
  "Béton",
  "Bois",
  "Hourdis béton",
  "Hourdis polystyrène",
];

const ISOLANTS = [
  "Aucun",
  "Laine de verre",
  "Laine de roche",
  "Ouate",
  "Polyuréthane",
  "Polystyrène",
];

export default function Section05Planchers({
  planchers,
  onChange,
}: Props) {

  function ajouter() {
    onChange([
      ...planchers,
      {
        id: crypto.randomUUID(),

        type: "",

        position: "",

        surface_m2: null,

        composition: "",

        isolation: "non",

        isolant_type: "",

        epaisseur_isolant_cm: null,

        notes: "",

        photos: [],
      },
    ]);
  }

  function modifier(
    id: string,
    champ: keyof PlancherFiche,
    valeur: any
  ) {
    onChange(
      planchers.map((p) =>
        p.id === id
          ? {
              ...p,
              [champ]: valeur,
            }
          : p
      )
    );
  }

  function supprimer(id: string) {
    onChange(planchers.filter((p) => p.id !== id));
  }

  return (
    <div className="audit-section">

      <div className="audit-section-header">

        <h2>5. Planchers</h2>

        <button
          type="button"
          onClick={ajouter}
        >
          Ajouter un plancher
        </button>

      </div>

      {planchers.map((p) => (

        <div
          key={p.id}
          className="audit-card"
        >

          <div className="audit-grid">

            <div>

              <label>Type</label>

              <select
                value={p.type}
                onChange={(e) =>
                  modifier(
                    p.id,
                    "type",
                    e.target.value
                  )
                }
              >
                <option value="" />
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>

            </div>

            <div>

              <label>Surface (m²)</label>

              <input
                type="number"
                value={p.surface_m2 ?? ""}
                onChange={(e) =>
                  modifier(
                    p.id,
                    "surface_m2",
                    Number(e.target.value)
                  )
                }
              />

            </div>

            <div>

              <label>Composition</label>

              <select
                value={p.composition}
                onChange={(e) =>
                  modifier(
                    p.id,
                    "composition",
                    e.target.value
                  )
                }
              >
                <option value="" />

                {COMPOSITIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}

              </select>

            </div>

            <div>

              <label>Isolation</label>

              <select
                value={p.isolation}
                onChange={(e) =>
                  modifier(
                    p.id,
                    "isolation",
                    e.target.value
                  )
                }
              >
                <option value="oui">Oui</option>

                <option value="non">Non</option>

              </select>

            </div>

            {p.isolation === "oui" && (

              <>

                <div>

                  <label>Isolant</label>

                  <select
                    value={p.isolant_type}
                    onChange={(e) =>
                      modifier(
                        p.id,
                        "isolant_type",
                        e.target.value
                      )
                    }
                  >
                    <option value="" />

                    {ISOLANTS.map((i) => (
                      <option key={i}>{i}</option>
                    ))}

                  </select>

                </div>

                <div>

                  <label>Épaisseur (cm)</label>

                  <input
                    type="number"
                    value={p.epaisseur_isolant_cm ?? ""}
                    onChange={(e) =>
                      modifier(
                        p.id,
                        "epaisseur_isolant_cm",
                        Number(e.target.value)
                      )
                    }
                  />

                </div>

              </>

            )}

          </div>

          <textarea
            placeholder="Observations..."
            value={p.notes}
            onChange={(e) =>
              modifier(
                p.id,
                "notes",
                e.target.value
              )
            }
          />

          <PhotoGrid
            photos={p.photos || []}
            onChange={photos => modifier(p.id, "photos", photos)}
            label="Photo du plancher"
          />

          <button
            type="button"
            onClick={() => supprimer(p.id)}
          >
            Supprimer
          </button>

        </div>

      ))}

    </div>
  );
}