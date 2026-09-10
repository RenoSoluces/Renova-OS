import { useEffect, useMemo, useState } from 'react'
import { Phone, Mail, MessageSquare, Calendar, StickyNote, RefreshCw, ClipboardCheck, FileSignature, FolderOpen, Search, History } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { Interaction, Prospect } from '../types'
import { INTERACTION_TYPES, timeAgo } from '../lib/crm/constants'
import { FloatSelect } from '../components/ui/FloatInput'

const ICONS: Record<string, any> = {
  appel: Phone, email: Mail, sms: MessageSquare, rdv: Calendar,
  note: StickyNote, statut: RefreshCw, visite: ClipboardCheck,
  devis: FileSignature, dossier: FolderOpen,
}

type InteractionRow = Interaction & { prospect?: Prospect | null }

const PERIODES = [
  { value: '7', label: '7 derniers jours' },
  { value: '30', label: '30 derniers jours' },
  { value: '90', label: '3 derniers mois' },
  { value: 'tous', label: 'Toute la periode' },
]

export function ActivitePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'

  const [items, setItems] = useState<InteractionRow[]>([])
  const [commerciaux, setCommerciaux] = useState<{ id: string; nom_complet: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreTypes, setFiltreTypes] = useState<Set<string>>(new Set())
  const [filtrePeriode, setFiltrePeriode] = useState('30')
  const [filtreCommercial, setFiltreCommercial] = useState('tous')

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('id, nom_complet').order('nom_complet').then(({ data }) => setCommerciaux((data || []) as any))
    }
  }, [isAdmin])

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('interactions')
      .select('*, prospect:prospects(*)')
      .order('created_at', { ascending: false })
      .limit(300)

    if (filtrePeriode !== 'tous') {
      const depuis = new Date()
      depuis.setDate(depuis.getDate() - parseInt(filtrePeriode))
      query = query.gte('created_at', depuis.toISOString())
    }

    query.then(({ data, error }) => {
      if (error) { setItems([]); setLoading(false); return }
      setItems((data || []) as any)
      setLoading(false)
    })
  }, [filtrePeriode])

  function toggleType(type: string) {
    setFiltreTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type); else next.add(type)
      return next
    })
  }

  const itemsFiltres = useMemo(() => {
    return items.filter(it => {
      if (filtreTypes.size > 0 && !filtreTypes.has(it.type)) return false
      if (isAdmin && filtreCommercial !== 'tous' && it.prospect?.commercial_id !== filtreCommercial) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const nomProspect = it.prospect ? `${it.prospect.prenom} ${it.prospect.nom}`.toLowerCase() : ''
        if (!it.contenu.toLowerCase().includes(q) && !nomProspect.includes(q)) return false
      }
      return true
    })
  }, [items, filtreTypes, filtreCommercial, search, isAdmin])

  const groupesParJour = useMemo(() => {
    const groupes = new Map<string, InteractionRow[]>()
    for (const it of itemsFiltres) {
      const jour = new Date(it.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      if (!groupes.has(jour)) groupes.set(jour, [])
      groupes.get(jour)!.push(it)
    }
    return Array.from(groupes.entries())
  }, [itemsFiltres])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Historique & activite</h1>
          <p className="page-subtitle">
            {isAdmin ? "Flux centralise de tous les echanges de l'equipe (appels, emails, RDV, statuts...)" : 'Flux centralise de vos echanges avec vos prospects'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="pro-search-wrap" style={{ maxWidth: 260 }}>
          <Search />
          <input placeholder="Rechercher un echange ou un client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 180 }}>
          <FloatSelect label="Periode" value={filtrePeriode} onChange={setFiltrePeriode} options={PERIODES} />
        </div>
        {isAdmin && (
          <div style={{ minWidth: 200 }}>
            <FloatSelect
              label="Commercial"
              value={filtreCommercial}
              onChange={setFiltreCommercial}
              options={[{ value: 'tous', label: "Toute l'equipe" }, ...commerciaux.map(c => ({ value: c.id, label: c.nom_complet }))]}
            />
          </div>
        )}
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          {INTERACTION_TYPES.map(t => (
            <button
              key={t.value}
              className={`btn ${filtreTypes.has(t.value) ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 32, padding: '0 12px', fontSize: 13 }}
              onClick={() => toggleType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-pad text-muted">Chargement...</div></div>
      ) : itemsFiltres.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <History size={40} />
            <h3>Aucune activite</h3>
            <p>Aucun echange ne correspond a ces filtres sur la periode selectionnee.</p>
          </div>
        </div>
      ) : (
        <div className="timeline-card">
          <div className="timeline-list">
            {groupesParJour.map(([jour, its]) => (
              <div key={jour}>
                <div className="text-xs text-muted font-semibold" style={{ textTransform: 'capitalize', margin: '16px 0 8px' }}>{jour}</div>
                {its.map(it => {
                  const meta = INTERACTION_TYPES.find(t => t.value === it.type)
                  const Icon = ICONS[it.type] || StickyNote
                  return (
                    <div key={it.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: meta?.color || '#7A7A7A' }}>
                        <Icon size={13} />
                      </div>
                      <div className="timeline-body">
                        <div className="timeline-text">
                          {it.prospect && <span className="font-semibold">{it.prospect.prenom} {it.prospect.nom} - </span>}
                          {it.contenu}
                        </div>
                        <div className="timeline-meta">
                          <span>{meta?.label || it.type}</span>
                          {it.auteur && <><span className="timeline-sep">.</span><span>{it.auteur}</span></>}
                          <span className="timeline-sep">.</span>
                          <span>{timeAgo(it.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
