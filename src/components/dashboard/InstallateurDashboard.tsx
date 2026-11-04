import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { lireTout } from '../../lib/lireTout'
import { euro } from '../../lib/crm/constants'
import { indicateursInstallateur } from '../../lib/dashboard/indicateursInstallateur'
import { PilotageEtats } from './PilotageEtats'
import type { PageKey } from '../../types'

/** Tableau de bord d'une entreprise installatrice (licence) : ventes, dossiers, aides, équipe. Aucune notion de réseau d'installateurs. */
export function InstallateurDashboard({ onNavigate }: { onNavigate: (p: PageKey) => void }) {
  const [prospects, setProspects] = useState<any[]>([])
  const [devis, setDevis] = useState<any[]>([])
  const [dossiers, setDossiers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let annule = false
    void (async () => {
      const [p, d, ds, pr] = await Promise.all([
        lireTout(() => supabase.from('prospects').select('id,statut,commercial_id').order('created_at', { ascending: false })),
        supabase.from('devis').select('id,statut,signature_statut,signature_date,montant_ttc').order('created_at', { ascending: false }),
        supabase.from('dossiers').select('id,prospect_id,statut,parcours_etape,mpr_statut').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id,nom_complet,role'),
      ])
      if (annule) return
      setProspects((p as any).data || []); setDevis(d.data || []); setDossiers(ds.data || []); setProfiles(pr.data || [])
      setLoading(false)
    })()
    return () => { annule = true }
  }, [])

  const k = useMemo(() => indicateursInstallateur(prospects, devis, dossiers), [prospects, devis, dossiers])
  const tuiles: { label: string; valeur: string; note: string; page: PageKey; alerte?: boolean }[] = [
    { label: 'Nouveaux prospects', valeur: String(k.prospectsANouveau), note: 'à qualifier', page: 'prospects' },
    { label: 'Devis en attente', valeur: String(k.devisEnAttente), note: 'envoyés, pas encore signés', page: 'devis' },
    { label: 'Signés ce mois', valeur: String(k.devisSignesMois), note: euro(k.caSigneMois) + ' TTC', page: 'devis' },
    { label: 'Dossiers en cours', valeur: String(k.dossiersActifs), note: k.dossiersSansEtape ? `${k.dossiersSansEtape} sans étape de parcours` : 'parcours suivi', page: 'dossiers' },
    { label: 'Actions Anah', valeur: String(k.dossiersActionAnah), note: 'compléments attendus', page: 'dossiers', alerte: k.dossiersActionAnah > 0 },
  ]

  return (
    <div className="page">
      <section className="dashboard-kpis page-kpi-strip" aria-label="Chiffres clés">
        {tuiles.map(t => (
          <button key={t.label} type="button" className="dashboard-kpi" style={{ textAlign: 'left', cursor: 'pointer', outline: t.alerte ? '2px solid #e8a317' : undefined }} onClick={() => onNavigate(t.page)}>
            <span className="dashboard-kpi-main"><strong>{loading ? '…' : t.valeur}</strong><span>{t.label}</span></span>
            <span className="dashboard-kpi-note">{t.note}</span>
          </button>
        ))}
      </section>
      <PilotageEtats prospects={prospects} dossiers={dossiers} profiles={profiles} onNavigate={onNavigate} />
    </div>
  )
}
