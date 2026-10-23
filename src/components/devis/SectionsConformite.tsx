import type { ConformiteMeta, PointConformite } from '../../lib/devis/conformite'
import { REGLES_FICHES } from '../../lib/devis/reglesFichesCEE'
import './rv.css'

interface Props {
  meta: ConformiteMeta
  onChange: (maj: (m: ConformiteMeta) => ConformiteMeta) => void
  points: PointConformite[]
  disabled?: boolean
  /** fiches CEE présentes sur le devis (pour les cases « la qualification couvre… ») */
  fichesDuDevis: string[]
  /** libellé de la catégorie de revenus déduite du prospect (ex. « Modestes ») */
  categorieRevenusLabel: string | null
}

const STATUTS = ['Propriétaire occupant', 'Propriétaire bailleur', 'Locataire']

/** Trois panneaux : Logement et ménage, Professionnel qualifié, Dates et travaux. */
export function SectionsConformite({ meta, onChange, points, disabled, fichesDuDevis, categorieRevenusLabel }: Props) {
  const mauvais = (champ: string) => points.some(p => p.gravite === 'bloc' && p.champ === champ)
  const L = meta.logement
  const setL = (patch: Partial<ConformiteMeta['logement']>) => onChange(m => ({ ...m, logement: { ...m.logement, ...patch } }))
  const setPro = (patch: Partial<Omit<ConformiteMeta['pro'], 'couvre'>>) => onChange(m => ({ ...m, pro: { ...m.pro, ...patch } }))
  const setD = (patch: Partial<ConformiteMeta['dates']>) => onChange(m => ({ ...m, dates: { ...m.dates, ...patch } }))

  const input = (champ: string, label: string, value: string, set: (v: string) => void, type = 'text') => (
    <label className={`lab ${mauvais(champ) ? 'bad' : ''}`}>{label}
      <input type={type} disabled={disabled} value={value} onChange={e => set(e.target.value)} />
    </label>
  )
  const select = (champ: string, label: string, value: string, options: string[], set: (v: string) => void, vide = false) => (
    <label className={`lab ${mauvais(champ) ? 'bad' : ''}`}>{label}
      <select disabled={disabled} value={value} onChange={e => set(e.target.value)}>
        {vide && <option value="">À renseigner</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )

  return (
    <>
      <section className="panel">
        <h2 className="rv-h">Logement et ménage</h2>
        <div className="grid g3">
          {select('logement.type', 'Type de logement', L.type, ['Maison individuelle', 'Appartement'], v => setL({ type: v }))}
          {input('logement.annee', 'Année de construction', L.annee, v => setL({ annee: v }), 'number')}
          {select('logement.zone', 'Zone climatique', L.zone, ['H1', 'H2', 'H3'], v => setL({ zone: v }), true)}
          {input('logement.surface', 'Surface chauffée (m²)', L.surface, v => setL({ surface: v }), 'number')}
          {select('logement.energie', 'Énergie de chauffage actuelle', L.energie, ['Gaz', 'Fioul', 'Électricité', 'Bois', 'GPL', 'Charbon', 'Aucune'], v => setL({ energie: v }), true)}
          {select('statutDemandeur', 'Statut du demandeur', meta.statutDemandeur, STATUTS, v => onChange(m => ({ ...m, statutDemandeur: v })))}
          <label className="lab">Catégorie de revenus
            <input readOnly value={categorieRevenusLabel || 'RFR à renseigner (fiche prospect)'} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
          <label className={`check ${mauvais('logement.residencePrincipale') ? 'bad' : ''}`}>
            <input type="checkbox" disabled={disabled} checked={L.residencePrincipale} onChange={e => setL({ residencePrincipale: e.target.checked })} />
            Résidence principale occupée au moins 8 mois par an
          </label>
          <label className="check">
            <input type="checkbox" disabled={disabled} checked={L.fossileConserve} onChange={e => setL({ fossileConserve: e.target.checked })} />
            Équipement d’eau chaude fossile conservé
          </label>
        </div>
      </section>

      <section className="panel">
        <h2 className="rv-h">Professionnel qualifié</h2>
        <div className="grid g3">
          {input('pro.assurance', 'Assurance décennale (assureur, n°)', meta.pro.assurance, v => setPro({ assurance: v }))}
          {input('pro.rge', 'N° de qualification', meta.pro.rge, v => setPro({ rge: v }))}
          {input('pro.organisme', 'Organisme (Qualibat, Qualit’EnR…)', meta.pro.organisme, v => setPro({ organisme: v }))}
          {input('pro.validite', 'Valable jusqu’au', meta.pro.validite, v => setPro({ validite: v }), 'date')}
        </div>
        {fichesDuDevis.filter(f => REGLES_FICHES[f]).length > 0 && (
          <div style={{ marginTop: 10 }}>
            {fichesDuDevis.filter(f => REGLES_FICHES[f]).map(f => (
              <label key={f} className="check">
                <input type="checkbox" disabled={disabled} checked={!!meta.pro.couvre[f]}
                  onChange={e => onChange(m => ({ ...m, pro: { ...m.pro, couvre: { ...m.pro.couvre, [f]: e.target.checked } } }))} />
                <span>La qualification couvre {f} <span className="hint">({REGLES_FICHES[f].qualif})</span></span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="rv-h">Dates et travaux</h2>
        <div className="grid g3">
          {input('dates.visite', 'Visite préalable', meta.dates.visite, v => setD({ visite: v }), 'date')}
          {input('dates.debut', 'Début des travaux', meta.dates.debut, v => setD({ debut: v }), 'date')}
          {input('dates.duree', 'Durée estimée', meta.dates.duree, v => setD({ duree: v }))}
          {input('dates.acompte', 'Acompte (%)', meta.dates.acompte, v => setD({ acompte: v }), 'number')}
        </div>
        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" disabled={disabled} checked={meta.venteHorsEtablissement} onChange={e => onChange(m => ({ ...m, venteHorsEtablissement: e.target.checked }))} />
          Vente hors établissement : délai de rétractation de 14 jours et formulaire joint
        </label>
      </section>
    </>
  )
}
