import { EcsData } from "../../../types";

interface Props {
  data: EcsData;
  onChange: (data: EcsData) => void;
}

const SYSTEMES = [
  "Ballon électrique",
  "Ballon thermodynamique",
  "Chaudière",
  "Solaire",
  "Instantané gaz",
  "Instantané électrique",
];

const ENERGIES = [
  "Electricité",
  "Gaz",
  "Fioul",
  "Bois",
  "Solaire",
];

export default function Section09ECS({
  data,
  onChange,
}: Props) {

  function update(
    field: keyof EcsData,
    value: any
  ) {
    onChange({
      ...data,
      [field]: value,
    });
  }

  return (

    <div className="section-card">

      <div className="section-header">
        <h2>Eau chaude sanitaire</h2>
      </div>

      <div className="grid-2">

        <label>

          Système

          <select
            value={data.systeme}
            onChange={(e) =>
              update("systeme", e.target.value)
            }
          >

            <option value="">Choisir</option>

            {SYSTEMES.map((s) => (
              <option key={s}>
                {s}
              </option>
            ))}

          </select>

        </label>

        <label>

          Energie

          <select
            value={data.energie}
            onChange={(e) =>
              update("energie", e.target.value)
            }
          >

            <option value="">Choisir</option>

            {ENERGIES.map((e) => (
              <option key={e}>
                {e}
              </option>
            ))}

          </select>

        </label>

        <label>

          Capacité (L)

          <input
            type="number"
            value={data.capacite_l ?? ""}
            onChange={(e) =>
              update(
                "capacite_l",
                Number(e.target.value)
              )
            }
          />

        </label>

        <label>

          Année d'installation

          <input
            type="number"
            value={data.annee_installation ?? ""}
            onChange={(e) =>
              update(
                "annee_installation",
                Number(e.target.value)
              )
            }
          />

        </label>

      </div>

      <label>

        Observations

        <textarea
          rows={5}
          value={data.notes}
          onChange={(e) =>
            update("notes", e.target.value)
          }
        />

      </label>

    </div>

  );

}