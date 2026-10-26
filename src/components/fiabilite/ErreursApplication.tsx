import { useEffect, useMemo, useState } from 'react'
import { Bug, CheckCircle2, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { regrouperErreurs, type EntreeErreur } from '../../lib/fiabilite/regrouperErreurs'
import './fiabilite.css'

const PERIODES = [{ j: 1, l: '24 h' }, { j: 7, l: '7 jours' }, { j: 30, l: '30 jours' }]

/** Erreurs rencontrées par les utilisateurs, regroupées par cause, pour corriger avant qu'on ne les signale. */
export function ErreursApplication({ actualisation }: { actualisation: number }) {
  const [jours, setJours] = useState(7)
  const [entrees, setEntrees] = useState<EntreeErreur[]>([])
  const [noms, setNoms] = useState<Map<string, string>>(new Map())
  const [chargement, setChargement] = useState(true)
  const [ouvert, setOuvert] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    ;(async () => {
      setChargement(true)
      const depuis = new Date(Date.now() - jours * 864e5).toISOString()
      const { data } = await supabase.from('system_activity_log').select('id,description,actor_id,meta,created_at')
        .eq('action', 'erreur_client').gte('created_at', depuis).order('created_at', { ascending: false }).limit(500)
      const liste = (data || []) as EntreeErreur[]
      const ids = [...new Set(liste.map(e => e.actor_id).filter(Boolean))] as string[]
      const { data: p } = ids.length ? await supabase.from('profiles').select('id,nom_complet').in('id', ids) : { data: [] }
      if (annule) return
      setEntrees(liste)
      setNoms(new Map(((p || []) as { id: string; nom_complet: string }[]).map(x => [x.id, x.nom_complet])))
      setChargement(false)
    })()
    return () => { annule = true }
  }, [jours, actualisation])

  const groupes = useMemo(() => regrouperErreurs(entrees), [entrees])
  const quand = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <section className="card card-pad fe">
      <div className="fe-tete">
        <div><h2><Bug size={18} /> Erreurs de l’application</h2><p className="text-muted">Remontées automatiquement depuis les appareils de l’équipe, regroupées par cause.</p></div>
        <div className="fe-periodes" role="group" aria-label="Période">
          {PERIODES.map(p => <button key={p.j} type="button" className={jours === p.j ? 'on' : ''} aria-pressed={jours === p.j} onClick={() => setJours(p.j)}>{p.l}</button>)}
        </div>
      </div>
      {chargement ? <p className="text-muted">Chargement…</p> : groupes.length === 0 ? (
        <p className="fe-vide"><CheckCircle2 size={18} /> Aucune erreur sur la période.</p>
      ) : (
        <ul className="fe-liste">
          {groupes.map(g => (
            <li key={g.cle} className={ouvert === g.cle ? 'ouvert' : ''}>
              <button type="button" className="fe-ligne" aria-expanded={ouvert === g.cle} onClick={() => setOuvert(o => (o === g.cle ? null : g.cle))}>
                <span className="fe-nb">{g.occurrences}</span>
                <span className="fe-msg"><b>{g.message}</b><small>{g.utilisateurs.length} utilisateur{g.utilisateurs.length > 1 ? 's' : ''} · {g.pages.slice(0, 2).join(', ') || 'page inconnue'} · dernière le {quand(g.derniere)}</small></span>
                <ChevronDown size={16} className="fe-chevron" />
              </button>
              {ouvert === g.cle && (
                <div className="fe-detail">
                  <p><b>Concernés :</b> {g.utilisateurs.map(u => noms.get(u) || 'Utilisateur supprimé').join(', ')}</p>
                  {g.exemple.meta?.source && <p><b>Origine :</b> {g.exemple.meta.source}</p>}
                  {g.exemple.meta?.navigateur && <p><b>Appareil :</b> {g.exemple.meta.navigateur}</p>}
                  {(g.exemple.meta?.pile || g.exemple.meta?.composants) && <pre>{g.exemple.meta?.pile || g.exemple.meta?.composants}</pre>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
