import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { compterParEtat, compterParEtapeParcours, performanceParCollaborateur, type LigneRepartition } from '../../lib/dashboard/etatsEquipe'
import { compterSav } from '../../lib/sav/statutsSav'

interface Props {
  prospects: { id: string; statut?: string | null; commercial_id?: string | null }[]
  dossiers: { prospect_id?: string | null; statut?: string | null; parcours_etape?: string | null }[]
  profiles: { id: string; nom_complet?: string | null }[]
  onNavigate: (page: any) => void
}

function Barres({ lignes, vide }: { lignes: LigneRepartition[]; vide: string }) {
  const max = Math.max(1, ...lignes.map(l => l.nb))
  const total = lignes.reduce((s, l) => s + l.nb, 0)
  if (total === 0) return <p className="text-sm text-muted">{vide}</p>
  return (
    <ul className="etats-barres">
      {lignes.filter(l => l.nb > 0).map(l => (
        <li key={l.label}>
          <span className="etats-barres-label">{l.label}</span>
          <span className="etats-barres-piste"><i style={{ width: `${Math.max(4, Math.round((l.nb / max) * 100))}%` }} /></span>
          <b>{l.nb}</b>
        </li>
      ))}
    </ul>
  )
}

export function PilotageEtats({ prospects, dossiers, profiles, onNavigate }: Props) {
  const [savs, setSavs] = useState<{ statut: string; date_cloture: string | null; created_at: string }[]>([])
  useEffect(() => {
    let annule = false
    supabase.from('sav_interventions').select('statut,date_cloture,created_at')
      .then(({ data }) => { if (!annule) setSavs((data || []) as any) })
    return () => { annule = true }
  }, [])

  const parEtat = useMemo(() => compterParEtat(prospects), [prospects])
  const parEtape = useMemo(() => compterParEtapeParcours(dossiers), [dossiers])
  const equipe = useMemo(() => performanceParCollaborateur(prospects, dossiers, profiles), [prospects, dossiers, profiles])
  const sav = useMemo(() => compterSav(savs), [savs])

  return (
    <section className="admin-panel etats-equipe" aria-label="Répartition par état et performance de l'équipe">
      <div className="admin-panel-head">
        <div>
          <h2>État du portefeuille et de l’équipe</h2>
          <p>Prospects par état, dossiers par étape de parcours, SAV et performance par collaborateur.</p>
        </div>
      </div>
      <div className="etats-grille">
        <div className="etats-bloc">
          <h3>Prospects par état</h3>
          <Barres lignes={parEtat} vide="Aucun prospect." />
        </div>
        <div className="etats-bloc">
          <h3>Dossiers par étape du parcours</h3>
          <Barres lignes={parEtape} vide="Aucun dossier." />
        </div>
        <div className="etats-bloc">
          <h3>SAV</h3>
          <ul className="etats-sav">
            <li><b>{sav.aTraiter}</b><span>à traiter</span></li>
            <li><b>{sav.enCours}</b><span>en cours</span></li>
            <li><b>{sav.rdvPlanifies}</b><span>RDV planifiés</span></li>
            <li><b>{sav.attenteFournisseur}</b><span>attente fournisseur</span></li>
            <li><b>{sav.regles}</b><span>réglés (30 j)</span></li>
          </ul>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('sav')}>Ouvrir le SAV</button>
        </div>
      </div>
      <div className="etats-bloc etats-equipe-tableau">
        <h3>Performance par collaborateur</h3>
        {equipe.length === 0 ? <p className="text-sm text-muted">Aucun collaborateur avec des prospects ou des dossiers.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead><tr><th>Collaborateur</th><th>Prospects</th><th>Signés</th><th>Taux de signature</th><th>Dossiers</th><th>Installés</th></tr></thead>
              <tbody>
                {equipe.map(l => (
                  <tr key={l.id}>
                    <td className="font-semibold">{l.nom}</td><td>{l.prospects}</td><td>{l.signes}</td><td>{l.tauxSignature} %</td><td>{l.dossiers}</td><td>{l.installes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
