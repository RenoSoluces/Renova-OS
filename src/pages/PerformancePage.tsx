import { useEffect, useMemo, useState } from 'react'
import { Building2, Users, TrendingUp, Euro, HardHat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { euro } from '../lib/crm/constants'

interface Partner { id: string; nom: string; actif: boolean }
interface Commercial { id: string; nom_complet: string; role: string }
interface Dossier { id: string; prospect_id: string; installateur_id: string | null; montant_total: number | null; statut: string }
interface ProspectRef { id: string; commercial_id: string | null }

export function PerformancePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [commercials, setCommercials] = useState<Commercial[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [prospects, setProspects] = useState<ProspectRef[]>([])
  const [tab, setTab] = useState<'partenaires' | 'commerciaux'>('partenaires')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('installateurs').select('id,nom,actif').order('nom'),
      supabase.from('profiles').select('id,nom_complet,role').in('role', ['commercial','manager','admin']).order('nom_complet'),
      supabase.from('dossiers').select('id,prospect_id,installateur_id,montant_total,statut'),
      supabase.from('prospects').select('id,commercial_id'),
    ]).then(([p, c, d, pr]) => {
      setPartners((p.data || []) as Partner[])
      setCommercials((c.data || []).filter((x: Commercial) => x.role === 'commercial') as Commercial[])
      setDossiers((d.data || []) as Dossier[])
      setProspects((pr.data || []) as ProspectRef[])
      setLoading(false)
    })
  }, [])

  const prospectCommercial = useMemo(() => new Map(prospects.map(p => [p.id, p.commercial_id])), [prospects])

  const partnerRows = useMemo(() => partners.map(p => {
    const ds = dossiers.filter(d => d.installateur_id === p.id)
    const ca = ds.reduce((sum, d) => sum + Number(d.montant_total || 0), 0)
    const installed = ds.filter(d => d.statut === 'installe').reduce((sum, d) => sum + Number(d.montant_total || 0), 0)
    return { ...p, dossiers: ds.length, installed, ca }
  }).sort((a, b) => b.ca - a.ca), [partners, dossiers])

  const commercialRows = useMemo(() => commercials.map(c => {
    const ds = dossiers.filter(d => prospectCommercial.get(d.prospect_id) === c.id)
    const ca = ds.reduce((sum, d) => sum + Number(d.montant_total || 0), 0)
    const installed = ds.filter(d => d.statut === 'installe').reduce((sum, d) => sum + Number(d.montant_total || 0), 0)
    return { ...c, dossiers: ds.length, installed, ca }
  }).sort((a, b) => b.ca - a.ca), [commercials, dossiers, prospectCommercial])

  const totalCa = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.ca, 0)
    : commercialRows.reduce((s, x) => s + x.ca, 0)
  const totalInstalled = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.installed, 0)
    : commercialRows.reduce((s, x) => s + x.installed, 0)
  const totalDossiers = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.dossiers, 0)
    : commercialRows.reduce((s, x) => s + x.dossiers, 0)

  return <div className="page">
    <div className="page-header">
      <div><div className="dashboard-kicker">PERFORMANCE ADMIN</div><h1 className="page-title">Performance & CA</h1><p className="page-subtitle">Mesurez le chiffre d'affaires généré par les partenaires et les commerciaux.</p></div>
    </div>

    <div className="view-toggle" style={{ marginBottom: 16 }}>
      <button className={`view-toggle-btn ${tab === 'partenaires' ? 'active' : ''}`} onClick={() => setTab('partenaires')}><Building2 size={15}/> Partenaires</button>
      <button className={`view-toggle-btn ${tab === 'commerciaux' ? 'active' : ''}`} onClick={() => setTab('commerciaux')}><Users size={15}/> Commerciaux</button>
    </div>

    <section className="dashboard-kpis page-kpi-strip">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Euro size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(totalCa)}</strong><span>CA des dossiers</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><HardHat size={19}/></span><span className="dashboard-kpi-main"><strong>{totalDossiers}</strong><span>Dossiers générés</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><TrendingUp size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(totalInstalled)}</strong><span>CA installé</span></span></div>
    </section>

    <div className="card">
      <div className="card-pad">
        {loading ? <div className="text-muted">Chargement…</div> : tab === 'partenaires' ? (
          <div className="performance-table">
            <div className="performance-row performance-head"><span>Partenaire</span><span>Dossiers</span><span>CA dossiers</span><span>CA installé</span></div>
            {partnerRows.map(x => <div className="performance-row" key={x.id}><strong><Building2 size={15}/> {x.nom}</strong><span>{x.dossiers}</span><strong>{euro(x.ca)}</strong><span>{euro(x.installed)}</span></div>)}
            {partnerRows.length === 0 && <div className="empty-state">Aucun partenaire.</div>}
          </div>
        ) : (
          <div className="performance-table">
            <div className="performance-row performance-head"><span>Commercial</span><span>Dossiers</span><span>CA dossiers</span><span>CA installé</span></div>
            {commercialRows.map(x => <div className="performance-row" key={x.id}><strong><Users size={15}/> {x.nom_complet}</strong><span>{x.dossiers}</span><strong>{euro(x.ca)}</strong><span>{euro(x.installed)}</span></div>)}
            {commercialRows.length === 0 && <div className="empty-state">Aucun commercial.</div>}
          </div>
        )}
      </div>
    </div>
  </div>
}
