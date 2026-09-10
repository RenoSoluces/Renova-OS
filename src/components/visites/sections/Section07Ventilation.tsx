import { VentilationData } from "../../../types";

interface Props {
  data: VentilationData;
  onChange: (data: VentilationData) => void;
}

const TYPES = [
  "Aucune",
  "Ventilation naturelle",
  "VMC simple flux autoréglable",
  "VMC simple flux hygroréglable A",
  "VMC simple flux hygroréglable B",
  "VMC double flux",
];

export default function Section07Ventilation({
  data,
  onChange,
}: Props) {
  function update(
    field: keyof VentilationData,
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
        <h2>Ventilation</h2>
      </div>

      <div className="grid-2">

        <label>
          Type de ventilation

          <select
            value={data.type}
            onChange={(e) =>
              update("type", e.target.value)
            }
          >
            <option value="">Choisir</option>

            {TYPES.map((t) => (
              <option key={t}>
                {t}
              </option>
            ))}

          </select>

        </label>

        <label>

          Présence VMC

          <select
            value={data.presence_vmc}
            onChange={(e) =>
              update("presence_vmc", e.target.value)
            }
          >
            <option>Oui</option>
            <option>Non</option>
          </select>

        </label>

        <label>

          Année d'installation

          <input
            type="number"
            value={data.age_installation ?? ""}
            onChange={(e) =>
              update(
                "age_installation",
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