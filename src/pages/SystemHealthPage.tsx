import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { fetchSystemHealth, type SystemHealth } from '../lib/systemHealth'
import { Button } from '../components/ui/Button'
import { useAuth } from '../lib/auth/AuthContext'
import { ErreursApplication } from '../components/fiabilite/ErreursApplication'

const LABELS: Record<keyof SystemHealth, string> = {
  vt_a_qualifier: 'VT terminées sans qualification',
  commissions_zero: 'Commissions à 0 €',
  dossiers_sans_commission: 'Dossiers installés sans commission',
  devis_a_relancer: 'Devis à relancer',
  taches_en_retard: 'Tâches en retard',
  documents_sans_fichier: 'Documents sans fichier',
  prospects_sans_attribution: 'Prospects sans attribution',
}

export function SystemHealthPage() {
  const { profile } = useAuth()
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actualisation, setActualisation] = useState(0)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  async function load() {
    setLoading(true); setError(''); setActualisation(n => n + 1)
    const result = await fetchSystemHealth()
    if (result.error) setError(result.error.message)
    setHealth(result.data)
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) load() }, [isAdmin])
  if (!isAdmin) return <div className="page"><div className="card card-pad">Accès réservé à l'administration.</div></div>
  const total = health ? Object.values(health).reduce((s, n) => s + Number(n || 0), 0) : 0

  return <div className="page">
    <div className="page-header">
      <div><h1 className="page-title">Santé du système</h1><p className="page-subtitle">Contrôles automatiques métier et données à vérifier.</p></div>
      <Button variant="secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> Actualiser</Button>
    </div>
    {error && <div className="alert alert-error"><AlertTriangle size={16}/>{error}</div>}
    <div className="card card-pad" style={{marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
      {total === 0 ? <CheckCircle2 size={22} style={{color:'var(--c-success,#2d8659)'}}/> : <AlertTriangle size={22} style={{color:'var(--c-warning,#e8a317)'}}/>}
      <div><strong>{total === 0 ? 'Système cohérent' : `${total} point${total > 1 ? 's' : ''} à contrôler`}</strong><div className="text-muted">Les contrôles sont indicatifs et ne bloquent pas l'activité.</div></div>
      <ShieldCheck size={20} style={{marginLeft:'auto',opacity:.55}}/>
    </div>
    <div className="admin-mini-stat-grid">
      {(Object.keys(LABELS) as (keyof SystemHealth)[]).map(key => {
        const value = Number(health?.[key] || 0)
        return <div className={value ? 'system-health-item warning' : 'system-health-item'} key={key}>
          <span>{LABELS[key]}</span><strong>{loading ? '…' : value}</strong><small>{value ? 'À vérifier' : 'OK'}</small>
        </div>
      })}
    </div>
    <ErreursApplication actualisation={actualisation} />
  </div>
}
