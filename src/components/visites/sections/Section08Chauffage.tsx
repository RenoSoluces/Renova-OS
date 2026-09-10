import { ChauffageData } from "../../../types";

interface Props {
  data: ChauffageData;
  onChange: (data: ChauffageData) => void;
}

const SYSTEMES = [
  "Radiateurs électriques",
  "PAC Air/Air",
  "PAC Air/Eau",
  "Chaudière gaz",
  "Chaudière fioul",
  "Chaudière bois",
  "Poêle à granulés",
  "Poêle à bois",
  "Réseau de chaleur",
  "Aucun",
];

const ENERGIES = [
  "Electricité",
  "Gaz",
  "Fioul",
  "Bois",
  "Granulés",
  "GPL",
];

export default function Section08Chauffage({
  data,
  onChange,
}: Props) {

  function update(
    field: keyof ChauffageData,
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
        <h2>Chauffage</h2>
      </div>

      <div className="grid-2">

        <label>

          Système principal

          <select
            value={data.systeme_principal}
            onChange={(e) =>
              update("systeme_principal", e.target.value)
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

          Puissance (kW)

          <input
            type="number"
            value={data.puissance_kw ?? ""}
            onChange={(e) =>
              update(
                "puissance_kw",
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

        <label>

          Système secondaire

          <select
            value={data.systeme_secondaire}
            onChange={(e) =>
              update(
                "systeme_secondaire",
                e.target.value
              )
            }
          >

            <option value="">Aucun</option>

            {SYSTEMES.map((s) => (
              <option key={s}>
                {s}
              </option>
            ))}

          </select>

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