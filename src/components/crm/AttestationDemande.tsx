// Attestation de demande exigée par le contrat de partenariat : pour chaque lead, le partenaire certifie que le contact
// a lui-même demandé à être contacté, et indique la date et la manière dont la demande a été faite.
export const TEXTE_ATTESTATION = 'Je certifie que ce contact a lui-même demandé à être contacté par Reno Soluces au sujet de travaux, et qu’il a accepté d’être contacté.'

export const MODES_DEMANDE: { value: string; label: string }[] = [
  { value: 'formulaire', label: 'Formulaire' },
  { value: 'appel_entrant', label: 'Appel entrant' },
  { value: 'message', label: 'Message' },
  { value: 'parrainage', label: 'Parrainage' },
]

export type ValeurAttestation = { attestation: boolean; date: string; mode: string }
export const ATTESTATION_VIDE: ValeurAttestation = { attestation: false, date: '', mode: '' }

/** Rôles dont les leads doivent porter l'attestation (partenaires, apporteurs, centres d'appels). */
export const ROLES_ATTESTATION = ['apporteur', 'teleconseiller', 'partner_admin', 'company_admin']
export const doitAttester = (role?: string | null) => !!role && ROLES_ATTESTATION.includes(role)

/** Message d'erreur si l'attestation est incomplète, sinon chaîne vide. */
export function erreurAttestation(v: ValeurAttestation): string {
  if (!v.attestation) return 'Cochez l’attestation de demande : elle est obligatoire pour valider la fiche.'
  if (!v.date) return 'Indiquez la date à laquelle le contact a fait sa demande.'
  if (v.date > new Date().toISOString().slice(0, 10)) return 'La date de la demande ne peut pas être dans le futur.'
  if (!v.mode) return 'Indiquez comment le contact a fait sa demande.'
  return ''
}

export function AttestationDemande({ value, onChange }: { value: ValeurAttestation; onChange: (v: ValeurAttestation) => void }) {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  return (
    <fieldset className="attestation-demande" style={{ border: '1px solid var(--border, #d9e2e0)', borderRadius: 12, padding: 14, margin: '12px 0' }}>
      <legend style={{ padding: '0 6px', fontWeight: 600 }}>Attestation de demande (obligatoire)</legend>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={value.attestation} onChange={e => onChange({ ...value, attestation: e.target.checked })} style={{ marginTop: 3 }} />
        <span>{TEXTE_ATTESTATION}</span>
      </label>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Date de la demande
          <input type="date" className="input" max={aujourdhui} value={value.date} onChange={e => onChange({ ...value, date: e.target.value })} />
        </label>
        <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
          Manière dont la demande a été faite
          <select className="input" value={value.mode} onChange={e => onChange({ ...value, mode: e.target.value })}>
            <option value="">Choisir…</option>
            {MODES_DEMANDE.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted" style={{ marginTop: 10 }}>
        Cette attestation est une déclaration du partenaire, qui engage sa responsabilité. Conservez pendant 5 ans tout élément en votre possession sur la demande (message, formulaire, enregistrement) et remettez-le à Reno Soluces sur simple demande, sous 48 heures.
      </p>
    </fieldset>
  )
}
