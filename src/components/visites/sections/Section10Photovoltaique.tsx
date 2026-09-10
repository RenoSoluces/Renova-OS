import { PhotovoltaiqueData } from "../../../types";

interface Props {
  data: PhotovoltaiqueData;
  onChange: (data: PhotovoltaiqueData) => void;
}

const ORIENTATIONS = [
  { value: "sud", label: "Sud" },
  { value: "sud_est", label: "Sud-Est" },
  { value: "sud_ouest", label: "Sud-Ouest" },
  { value: "est", label: "Est" },
  { value: "ouest", label: "Ouest" },
  { value: "nord_est", label: "Nord-Est" },
  { value: "nord_ouest", label: "Nord-Ouest" },
  { value: "nord", label: "Nord" },
];

const TYPES_TOITURE = [
  { value: "tuiles", label: "Tuiles" },
  { value: "ardoises", label: "Ardoises" },
  { value: "bac_acier", label: "Bac acier" },
  { value: "toit_terrasse", label: "Toit terrasse" },
  { value: "autre", label: "Autre" },
];

const MASQUES = [
  { value: "aucun", label: "Aucun masque solaire" },
  { value: "faible", label: "Faible (cheminée, antenne isolée)" },
  { value: "moyen", label: "Moyen (arbre proche, bâtiment voisin)" },
  { value: "fort", label: "Fort (ombrage important une partie de la journée)" },
];

const USAGES = [
  { value: "autoconsommation_revente_surplus", label: "Autoconsommation avec revente du surplus" },
  { value: "autoconsommation_batterie", label: "Autoconsommation avec batterie de stockage" },
  { value: "revente_totale", label: "Revente totale de la production" },
];

export default function Section10Photovoltaique({ data, onChange }: Props) {
  function update(field: keyof PhotovoltaiqueData, value: any) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <h2>Photovoltaïque</h2>
      </div>

      <label>
        Le client est-il intéressé par le photovoltaïque ?
        <select value={data.interet_client} onChange={e => update("interet_client", e.target.value)}>
          <option value="">Choisir</option>
          <option value="oui">Oui, projet identifié</option>
          <option value="a_etudier">À étudier / pas encore décidé</option>
          <option value="non">Non, pas intéressé pour l'instant</option>
        </select>
      </label>

      <div className="grid-2">
        <label>
          Type de toiture
          <select value={data.type_toiture} onChange={e => update("type_toiture", e.target.value)}>
            <option value="">Choisir</option>
            {TYPES_TOITURE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label>
          Orientation principale du pan de toiture
          <select value={data.orientation_toiture} onChange={e => update("orientation_toiture", e.target.value)}>
            <option value="">Choisir</option>
            {ORIENTATIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>

        <label>
          Inclinaison du toit (degrés)
          <input
            type="number"
            min={0}
            max={90}
            value={data.inclinaison_deg ?? ""}
            onChange={e => update("inclinaison_deg", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="ex: 30"
          />
        </label>

        <label>
          Surface de toiture disponible (m²)
          <input
            type="number"
            min={0}
            value={data.surface_disponible_m2 ?? ""}
            onChange={e => update("surface_disponible_m2", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="ex: 40"
          />
        </label>

        <label>
          Masques solaires (ombrage)
          <select value={data.masques_solaires} onChange={e => update("masques_solaires", e.target.value)}>
            <option value="">Choisir</option>
            {MASQUES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>

        <label>
          Type de raccordement électrique
          <select value={data.type_raccordement} onChange={e => update("type_raccordement", e.target.value)}>
            <option value="">Choisir</option>
            <option value="monophase">Monophasé</option>
            <option value="triphase">Triphasé</option>
          </select>
        </label>

        <label>
          Usage souhaité de la production
          <select value={data.usage_souhaite} onChange={e => update("usage_souhaite", e.target.value)}>
            <option value="">Choisir</option>
            {USAGES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </label>

        <label>
          Puissance souhaitée (kWc) — si déjà exprimée par le client
          <input
            type="number"
            min={0}
            step={0.5}
            value={data.puissance_souhaitee_kwc ?? ""}
            onChange={e => update("puissance_souhaitee_kwc", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="ex: 6"
          />
        </label>

        <label>
          Consommation électrique annuelle actuelle (kWh) — voir facture EDF
          <input
            type="number"
            min={0}
            value={data.consommation_annuelle_kwh ?? ""}
            onChange={e => update("consommation_annuelle_kwh", e.target.value === "" ? null : Number(e.target.value))}
            placeholder="ex: 5500"
          />
        </label>
      </div>

      <label>
        Observations (accès toiture, état de la charpente, compteur Linky, etc.)
        <textarea
          rows={4}
          value={data.notes}
          onChange={e => update("notes", e.target.value)}
        />
      </label>
    </div>
  );
}
