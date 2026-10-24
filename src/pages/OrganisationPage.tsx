import { useEffect, useMemo, useState } from 'react'
import { Building2, Network, UserRound, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'

type Organisation = { id: string; nom: string; type: string }
type Member = { id: string; nom_complet: string; role: string; organisation_id: string | null; manager_id: string | null }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Grand Admin',
  manager: 'Manager',
  commercial_manager: 'Responsable commercial',
  partner_admin: 'Dirigeant partenaire',
  company_admin: 'Direction',
  commercial: 'Commercial',
  apporteur: "Apporteur d'affaires",
  teleconseiller: 'Téléconseiller',
}

export function OrganisationPage() {
  const { profile } = useAuth()
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    const [orgResult, memberResult] = await Promise.all([
      supabase.from('organisations').select('id, nom, type').eq('actif', true).order('nom'),
      supabase.from('profiles').select('id, nom_complet, role, organisation_id, manager_id').order('nom_complet'),
    ])
    if (orgResult.error || memberResult.error) {
      setError("Impossible de charger l'organigramme. Vérifiez les droits de votre compte.")
      setOrganisations([])
      setMembers([])
    } else {
      setOrganisations((orgResult.data || []) as Organisation[])
      setMembers((memberResult.data || []) as Member[])
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [profile?.id, profile?.role])

  const membersByOrg = useMemo(() => {
    const result: Record<string, Member[]> = {}
    members.forEach(member => {
      const key = member.organisation_id || 'unassigned'
      ;(result[key] ||= []).push(member)
    })
    return result
  }, [members])

  function renderMember(member: Member, seen = new Set<string>()): React.ReactNode {
    if (seen.has(member.id)) return null
    const nextSeen = new Set(seen)
    nextSeen.add(member.id)
    const children = (membersByOrg[member.organisation_id || 'unassigned'] || [])
      .filter(candidate => candidate.manager_id === member.id)
    return (
      <li key={member.id} style={{ listStyle: 'none', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--border, #d9e0e7)', borderRadius: 10, padding: '10px 12px', background: 'var(--surface, #fff)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--primary-50, #eef5f1)', color: 'var(--primary-700, #245b45)', flexShrink: 0 }}><UserRound size={17} /></div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{member.nom_complet || 'Utilisateur sans nom'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>{ROLE_LABELS[member.role] || member.role}</div>
          </div>
        </div>
        {children.length > 0 && (
          <ul style={{ margin: '0 0 0 18px', padding: '0 0 0 14px', borderLeft: '1px solid var(--border, #d9e0e7)' }}>
            {children.map(child => renderMember(child, nextSeen))}
          </ul>
        )}
      </li>
    )
  }

  if (!['admin', 'manager', 'partner_admin', 'company_admin'].includes(profile?.role || '')) {
    return <div className="page"><div className="card card-pad">L'organigramme est réservé à la direction et aux managers autorisés.</div></div>
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}><Network size={23} /> Organigramme</h1>
          <p className="text-muted" style={{ margin: '6px 0 0' }}>Structure dynamique des entreprises, responsables et équipes visibles selon vos droits.</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Actualiser</button>
      </div>
      {error && <div className="card card-pad" role="alert">{error}</div>}
      {loading ? <div className="card card-pad">Chargement de l'organigramme…</div> : (
        <div style={{ display: 'grid', gap: 16 }}>
          {organisations.map(org => {
            const orgMembers = membersByOrg[org.id] || []
            const roots = orgMembers.filter(member => !member.manager_id || !orgMembers.some(candidate => candidate.id === member.manager_id))
            const visibleRoots = roots.length ? roots : orgMembers
            return (
              <section key={org.id} className="card card-pad">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border, #d9e0e7)' }}>
                  <Building2 size={19} />
                  <div>
                    <h2 style={{ margin: 0, fontSize: 17 }}>{org.nom}</h2>
                    <div className="text-muted" style={{ fontSize: 12 }}>{org.type === 'interne' ? 'Entreprise interne' : 'Entreprise partenaire'} · {orgMembers.length} membre{orgMembers.length > 1 ? 's' : ''} visible{orgMembers.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {orgMembers.length === 0 ? <p className="text-muted">Aucun membre visible pour cette entreprise.</p> : (
                  <ul style={{ padding: 0, margin: '4px 0 0' }}>
                    {visibleRoots.map(member => renderMember(member))}
                  </ul>
                )}
              </section>
            )
          })}
          {organisations.length === 0 && <div className="card card-pad">Aucune entreprise visible pour ce compte.</div>}
        </div>
      )}
    </div>
  )
}
