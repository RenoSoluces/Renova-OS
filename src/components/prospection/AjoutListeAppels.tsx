import { useEffect, useMemo, useState } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { lirePages } from '../../lib/catalogue/chargerCatalogue'
import type { Prospect } from '../../types'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface Membre { id: string; nom_complet: string; role: string }

const CLE_ASSIGNE = 'renova.listeAppels.assigne'
const lireAssigne = () => { try { return localStorage.getItem(CLE_ASSIGNE) || '' } catch { return '' } }
const garderAssigne = (id: string) => { try { localStorage.setItem(CLE_ASSIGNE, id) } catch { /* stockage indisponible */ } }
const sansAccent = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const AFFICHES = 300

/**
 * Envoie des prospects déjà présents dans le CRM vers la prospection téléphonique,
 * en les confiant à la personne qui fait le phoning.
 */
export function AjoutListeAppels({ open, onClose, onAjoute, exclus }: {
  open: boolean
  onClose: () => void
  onAjoute: (n: number, nom: string) => void
  /** Prospects déjà dans la liste d'appels, à ne pas proposer. */
  exclus: Set<string>
}): JSX.Element {
  const { profile } = useAuth()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [membres, setMembres] = useState<Membre[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [assigne, setAssigne] = useState('')
  const [choix, setChoix] = useState<Set<string>>(new Set())
  const [recherche, setRecherche] = useState('')
  const [statut, setStatut] = useState('')
  const [source, setSource] = useState('')
  const [etiquette, setEtiquette] = useState('')
  const [departement, setDepartement] = useState('')

  useEffect(() => {
    if (!open || !profile) return
    let actif = true
    setChargement(true); setErreur(''); setChoix(new Set())
    // Uniquement l'entreprise de la personne connectée : les autres entreprises n'apparaissent jamais.
    const org = (profile as { organisation_id?: string | null }).organisation_id || null
    void (async () => {
      const [{ data, error }, equipe] = await Promise.all([
        lirePages<Prospect>((debut, fin) => {
          let q = supabase.from('prospects')
            .select('id,nom,prenom,raison_sociale,telephone,email,code_postal,ville,statut,source,tags,commercial,commercial_id,liste_appels_le,organisation_id,created_at')
          if (org) q = q.eq('organisation_id', org)
          return q.order('nom').order('id').range(debut, fin) as any
        }),
        (() => {
          let q = supabase.from('profiles').select('id,nom_complet,role').in('role', ['admin', 'manager', 'commercial', 'commercial_manager', 'company_admin'])
          if (org) q = q.eq('organisation_id', org)
          return q.order('nom_complet')
        })(),
      ])
      if (!actif) return
      if (error) setErreur(error.message)
      setProspects(data || [])
      const liste = (equipe.data || []) as Membre[]
      setMembres(liste)
      const memorise = lireAssigne()
      setAssigne(liste.some(m => m.id === memorise) ? memorise : (profile.id || ''))
      setChargement(false)
    })()
    return () => { actif = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, profile?.id])

  // Seuls les prospects joignables et pas encore dans la liste d'appels sont proposés.
  const candidats = useMemo(() => prospects.filter(p => p.telephone && !p.liste_appels_le && !exclus.has(p.id)), [prospects, exclus])
  const sansTelephone = useMemo(() => prospects.filter(p => !p.telephone && !p.liste_appels_le).length, [prospects])
  const options = useMemo(() => {
    const unique = (vals: (string | null | undefined)[]) => [...new Set(vals.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'fr'))
    return {
      statuts: unique(candidats.map(p => p.statut)),
      sources: unique(candidats.map(p => p.source)),
      etiquettes: unique(candidats.flatMap(p => p.tags || [])),
      departements: unique(candidats.map(p => (p.code_postal || '').slice(0, 2))),
    }
  }, [candidats])

  const filtres = useMemo(() => {
    const q = sansAccent(recherche.trim())
    return candidats.filter(p => (!statut || p.statut === statut) && (!source || p.source === source)
      && (!etiquette || (p.tags || []).includes(etiquette)) && (!departement || (p.code_postal || '').startsWith(departement))
      && (!q || sansAccent(`${p.prenom} ${p.nom} ${p.raison_sociale || ''} ${p.telephone} ${p.email || ''} ${p.ville || ''} ${p.code_postal || ''}`).includes(q)))
  }, [candidats, recherche, statut, source, etiquette, departement])

  const tousCoches = filtres.length > 0 && filtres.every(p => choix.has(p.id))
  function basculerTous() {
    setChoix(c => { const n = new Set(c); filtres.forEach(p => tousCoches ? n.delete(p.id) : n.add(p.id)); return n })
  }
  function basculer(id: string) { setChoix(c => { const n = new Set(c); n.has(id) ? n.delete(id) : n.add(id); return n }) }

  const personne = membres.find(m => m.id === assigne)
  const changentDeMain = useMemo(() => prospects.filter(p => choix.has(p.id) && p.commercial_id && p.commercial_id !== assigne), [prospects, choix, assigne])

  async function valider() {
    if (!assigne || !choix.size) return
    setEnvoi(true); setErreur('')
    const ids = [...choix]
    let total = 0
    for (let i = 0; i < ids.length; i += 500) {
      const { data, error } = await supabase.rpc('ajouter_liste_appels', { p_ids: ids.slice(i, i + 500), p_assigne: assigne })
      if (error) { setErreur(`Ajout interrompu : ${error.message}`); setEnvoi(false); if (total) onAjoute(total, personne?.nom_complet || ''); return }
      total += Number(data) || 0
    }
    garderAssigne(assigne)
    setEnvoi(false)
    onAjoute(total, personne?.nom_complet || '')
  }

  const nomProspect = (p: Prospect) => p.raison_sociale || `${p.prenom || ''} ${p.nom}`.trim()

  return <Modal open={open} onClose={onClose} title="Ajouter des prospects du CRM" width={860}
    footer={<>
      <Button variant="secondary" onClick={onClose}>Annuler</Button>
      <Button variant="primary" onClick={() => void valider()} disabled={envoi || !choix.size || !assigne}>
        {envoi ? 'Ajout…' : `Ajouter ${choix.size || ''} prospect${choix.size > 1 ? 's' : ''}${personne ? ` chez ${personne.nom_complet}` : ''}`}
      </Button>
    </>}>
    <div className="la">
      <label className="field"><span>Qui appelle ces prospects ?</span>
        <select className="input" value={assigne} onChange={e => setAssigne(e.target.value)}>
          {membres.map(m => <option key={m.id} value={m.id}>{m.nom_complet}</option>)}
        </select>
      </label>

      <div className="la-filtres">
        <div className="pt-recherche"><Search size={16} /><input className="input" value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Nom, téléphone, ville…" /></div>
        <select className="input" value={statut} onChange={e => setStatut(e.target.value)} aria-label="Statut"><option value="">Statut : tous</option>{options.statuts.map(v => <option key={v}>{v}</option>)}</select>
        <select className="input" value={source} onChange={e => setSource(e.target.value)} aria-label="Source"><option value="">Source : toutes</option>{options.sources.map(v => <option key={v}>{v}</option>)}</select>
        <select className="input" value={etiquette} onChange={e => setEtiquette(e.target.value)} aria-label="Étiquette"><option value="">Étiquette : toutes</option>{options.etiquettes.map(v => <option key={v}>{v}</option>)}</select>
        <select className="input" value={departement} onChange={e => setDepartement(e.target.value)} aria-label="Département"><option value="">Département : tous</option>{options.departements.map(v => <option key={v}>{v}</option>)}</select>
      </div>

      {erreur && <div className="pt-message erreur" role="alert">{erreur}</div>}

      <div className="la-entete">
        <label className="la-tous"><input type="checkbox" checked={tousCoches} onChange={basculerTous} disabled={!filtres.length} />
          {tousCoches ? 'Tout décocher' : `Tout cocher (${filtres.length})`}</label>
        <span>{choix.size} sélectionné{choix.size > 1 ? 's' : ''}</span>
      </div>

      <div className="la-liste">
        {chargement ? <p className="la-vide">Chargement des prospects…</p>
          : !filtres.length ? <p className="la-vide">{candidats.length ? 'Aucun prospect ne correspond à ces filtres.' : 'Tous vos prospects joignables sont déjà dans la liste d’appels.'}</p>
          : filtres.slice(0, AFFICHES).map(p => (
            <label key={p.id} className={`la-ligne ${choix.has(p.id) ? 'on' : ''}`}>
              <input type="checkbox" checked={choix.has(p.id)} onChange={() => basculer(p.id)} />
              <span className="la-nom"><strong>{nomProspect(p)}</strong><small>{[p.code_postal, p.ville].filter(Boolean).join(' ') || '—'}</small></span>
              <span className="la-tel">{p.telephone}</span>
              <span className="la-meta"><span className="la-statut">{p.statut}</span><small>{p.commercial || 'Sans commercial'}</small></span>
            </label>))}
        {filtres.length > AFFICHES && <p className="la-vide">{filtres.length - AFFICHES} autres prospects correspondent : « Tout cocher » les inclut, ou affinez avec les filtres.</p>}
      </div>

      {changentDeMain.length > 0 && personne && <p className="la-alerte"><AlertTriangle size={15} />
        {changentDeMain.length} prospect{changentDeMain.length > 1 ? 's' : ''} sélectionné{changentDeMain.length > 1 ? 's sont suivis' : ' est suivi'} par quelqu’un d’autre : {changentDeMain.length > 1 ? 'ils seront attribués' : 'il sera attribué'} à {personne.nom_complet}.</p>}
      <p className="pt-aide">Les prospects ajoutés sont attribués à la personne choisie et apparaissent dans sa liste « À appeler ». Leur fiche et leur historique restent inchangés.{sansTelephone ? ` ${sansTelephone} prospect${sansTelephone > 1 ? 's' : ''} sans numéro de téléphone ne ${sansTelephone > 1 ? 'sont' : 'est'} pas proposé${sansTelephone > 1 ? 's' : ''}.` : ''}</p>
    </div>
  </Modal>
}
