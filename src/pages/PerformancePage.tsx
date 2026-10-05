import { useEffect, useMemo, useState } from 'react'
import { Building2, Users, TrendingUp, Euro, HardHat } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { euro } from '../lib/crm/constants'

interface Partner { id: string; nom: string; actif: boolean; dossiersValides?: number; installationsValides?: number; installed?: number; ca?: number; vtCount?: number; vtValides?: number; vtCa?: number; activiteScore?: number }
interface Commercial { id: string; nom_complet: string; role: string }
interface Dossier { id: string; prospect_id: string; devis_id?: string | null; installateur_id: string | null; montant_total: number | null; statut: string }
interface DevisRef { id: string; prospect_id: string | null; montant_ttc: number | null }
interface ProspectRef { id: string; commercial_id: string | null; installateur_id?: string | null }
interface VTRef { id: string; prospect_id: string | null; statut: string; date_visite?: string | null; commission_montant_societe?: number | null }

export function PerformancePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [commercials, setCommercials] = useState<Commercial[]>([])
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [prospects, setProspects] = useState<ProspectRef[]>([])
  const [devis, setDevis] = useState<DevisRef[]>([])
  const [commissions, setCommissions] = useState<any[]>([])
  const [vts, setVts] = useState<VTRef[]>([])
  const [tab, setTab] = useState<'partenaires' | 'commerciaux'>('partenaires')
  const [loading, setLoading] = useState(true)
  const [facturations, setFacturations] = useState<any[]>([])
  const [vtCommissions, setVtCommissions] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('installateurs').select('id,nom,actif').order('nom'),
      supabase.from('profiles').select('id,nom_complet,role').in('role', ['commercial','manager','admin']).order('nom_complet'),
      supabase.from('dossiers').select('id,prospect_id,devis_id,installateur_id,montant_total,statut'),
      supabase.from('prospects').select('id,commercial_id,installateur_id'),
      supabase.from('devis').select('id,prospect_id,montant_ttc'),
      supabase.from('commissions').select('id,commercial_id,montant_commercial,montant_societe,statut,date_paiement_commercial,date_paiement_societe').neq('statut','annulee'),
      supabase.from('visites').select('id,prospect_id,statut,date_visite'),
      supabase.from('dossier_facturation').select('id,dossier_id,statut'),
      supabase.from('commissions').select('id,reference_type,reference_id,statut,date_paiement_societe').in('reference_type',['visites','planning_events']).neq('statut','annulee'),
    ]).then(([p, c, d, pr, dv, co, vt, df, vtCom]) => {
      setPartners((p.data || []) as Partner[])
      setCommercials((c.data || []).filter((x: Commercial) => x.role === 'commercial') as Commercial[])
      setDossiers((d.data || []) as Dossier[])
      setProspects((pr.data || []) as ProspectRef[])
      setDevis((dv.data || []) as DevisRef[])
      setCommissions(co.data || [])
      setVts((vt.data || []) as VTRef[])
      setFacturations(df.data || [])
      setVtCommissions(vtCom.data || [])
      setLoading(false)
    })
  }, [])

  const prospectCommercial = useMemo(() => new Map(prospects.map(p => [p.id, p.commercial_id])), [prospects])
  const prospectPartner = useMemo(() => new Map(prospects.map(p => [p.id, (p as any).installateur_id || null])), [prospects])
  const devisAmount = useMemo(() => new Map(devis.map(d => [d.id, Number(d.montant_ttc) || 0])), [devis])
  const dossierCa = (d: Dossier) => Number(d.montant_total) || (d.devis_id ? (devisAmount.get(d.devis_id) || 0) : 0)
  const vtByPartner = useMemo(() => {
    const m = new Map<string, { count: number; ca: number }>()
    for (const v of vts) {
      if (v.statut !== 'terminee') continue
      const partner = prospectPartner.get(v.prospect_id || '')
      if (!partner) continue
      const row = m.get(partner) || { count: 0, ca: 0 }
      row.count += 1
      m.set(partner, row)
    }
    return m
  }, [vts, prospectPartner])

  const partnerRows = useMemo(() => partners.map(p => {
    const ds = dossiers.filter(d => (prospectPartner.get(d.prospect_id) || d.installateur_id) === p.id)
    const ca = ds.reduce((sum, d) => sum + dossierCa(d), 0)
    const installed = ds.filter(d => d.statut === 'installe').reduce((sum, d) => sum + dossierCa(d), 0)
    const paidDossierIds = new Set(facturations.filter(f => f.statut === 'payee').map(f => f.dossier_id))
    const validDossiers = ds.filter(d => paidDossierIds.has(d.id)).length
    const vt=vtByPartner.get(p.id)||{count:0,ca:0}
    const paidVtIds = new Set(vtCommissions.filter((c:any) => c.statut === 'payee' || c.date_paiement_societe).map((c:any)=>c.reference_id))
    const paidVtCount = vts.filter(v => (prospectPartner.get(v.prospect_id||'')===p.id) && paidVtIds.has(v.id)).length
    return { ...p, dossiers: ds.length, dossiersValides: validDossiers + paidVtCount, installed, ca: ca + vt.ca, vtCount: vt.count, vtValides: paidVtCount, vtCa: vt.ca }
  }).sort((a, b) => b.dossiersValides - a.dossiersValides || b.ca - a.ca), [partners, dossiers, prospectPartner, devisAmount, vtByPartner, facturations, vtCommissions, vts])

  const commercialRows = useMemo(() => commercials.map(c => {
    const ds = dossiers.filter(d => prospectCommercial.get(d.prospect_id) === c.id)
    const ca = ds.reduce((sum, d) => sum + dossierCa(d), 0)
    const installed = ds.filter(d => d.statut === 'installe').reduce((sum, d) => sum + dossierCa(d), 0)
    const myCommissions = commissions.filter(x => x.commercial_id === c.id)
    const commissionsEnCours = myCommissions.filter(x => x.statut !== 'payee' && !x.date_paiement_commercial).reduce((s, x) => s + Number(x.montant_commercial || 0), 0)
    const totalCommissions = myCommissions.reduce((s, x) => s + Number(x.montant_commercial || 0), 0)
    const totalSociete = myCommissions.reduce((s, x) => s + Number(x.montant_societe || 0), 0)
    return { ...c, dossiers: ds.length, installed, ca, commissionsEnCours, totalCommissions, totalSociete }
  }).sort((a, b) => b.dossiers - a.dossiers || b.totalCommissions - a.totalCommissions), [commercials, dossiers, prospectCommercial, commissions, devisAmount])

  const totalCa = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.ca, 0)
    : commercialRows.reduce((s, x) => s + x.ca, 0)
  const totalInstalled = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.installed, 0)
    : commercialRows.reduce((s, x) => s + x.installed, 0)
  const totalDossiers = tab === 'partenaires'
    ? partnerRows.reduce((s, x) => s + x.dossiersValides, 0)
    : commercialRows.reduce((s, x) => s + x.dossiers, 0)

  return <div className="page">
    <div className="page-header">
      <div><div className="dashboard-kicker">PERFORMANCE ADMIN</div><h1 className="page-title">Performance & CA</h1><p className="page-subtitle">Classement partenaires basé sur l'activité réelle : VT réalisées et dossiers payés.</p></div>
    </div>

    <div className="view-toggle" style={{ marginBottom: 16 }}>
      <button className={`view-toggle-btn ${tab === 'partenaires' ? 'active' : ''}`} onClick={() => setTab('partenaires')}><Building2 size={15}/> Partenaires</button>
      <button className={`view-toggle-btn ${tab === 'commerciaux' ? 'active' : ''}`} onClick={() => setTab('commerciaux')}><Users size={15}/> Commerciaux</button>
    </div>

    {tab === 'partenaires' ? <section className="dashboard-kpis page-kpi-strip">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Euro size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(totalCa)}</strong><span>CA total dossiers + VT</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><HardHat size={19}/></span><span className="dashboard-kpi-main"><strong>{totalDossiers}</strong><span>Dossiers validés (payés) + VT payées</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><TrendingUp size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(totalInstalled)}</strong><span>CA installé</span></span></div>
    </section> : <section className="dashboard-kpis page-kpi-strip">
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon blue"><HardHat size={19}/></span><span className="dashboard-kpi-main"><strong>{totalDossiers}</strong><span>Nombre de dossiers</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon amber"><Euro size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(commercialRows.reduce((s,x)=>s+x.commissionsEnCours,0))}</strong><span>Commissions en cours</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon green"><Euro size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(commercialRows.reduce((s,x)=>s+x.totalCommissions,0))}</strong><span>Total commissions</span></span></div>
      <div className="dashboard-kpi"><span className="dashboard-kpi-icon purple"><Euro size={19}/></span><span className="dashboard-kpi-main"><strong>{euro(commercialRows.reduce((s,x)=>s+x.totalSociete,0))}</strong><span>Total commissions société</span></span></div>
    </section>}

    <div className="card">
      <div className="card-pad">
        {loading ? <div className="text-muted">Chargement…</div> : tab === 'partenaires' ? (
          <div className="performance-table">
            <div className="performance-row performance-head"><span>Partenaire</span><span>Activité</span><span>VT réalisées</span><span>Dossiers payés</span><span>CA total</span><span>CA installé</span></div>
            {partnerRows.map(x => <div className="performance-row" key={x.id}><strong><Building2 size={15}/> {x.nom}</strong><strong>{x.activiteScore || 0}</strong><span>{x.vtCount || 0}</span><span>{x.installationsValides || 0}</span><strong>{euro(x.ca || 0)}</strong><span>{euro(x.installed || 0)}</span></div>)}
            {partnerRows.length === 0 && <div className="empty-state">Aucun partenaire.</div>}
          </div>
        ) : (
          <div className="performance-table">
            <div className="performance-row performance-head"><span>Commercial</span><span>Nombre de dossiers</span><span>Commissions en cours</span><span>Total commissions</span><span>Total commissions société</span></div>
            {commercialRows.map(x => <div className="performance-row" key={x.id}><strong><Users size={15}/> {x.nom_complet}</strong><span>{x.dossiers}</span><strong>{euro(x.commissionsEnCours)}</strong><strong>{euro(x.totalCommissions)}</strong><strong>{euro(x.totalSociete)}</strong></div>)}
            {commercialRows.length === 0 && <div className="empty-state">Aucun commercial.</div>}
          </div>
        )}
      </div>
    </div>
  </div>
}
