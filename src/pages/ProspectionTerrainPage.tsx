import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapPinned, Plus, LocateFixed, Search, X, Navigation, CheckCircle2, CalendarCheck, DoorClosed, ThumbsDown, ThumbsUp,
  Map as CarteIcone, List, RotateCcw, Trash2, Flag, CloudOff, Cloud, Loader2, Lightbulb, Thermometer, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { QUESTIONNAIRES, questionnaireDe, qualifier, libelleTemperature, type Temperature } from '../lib/terrain/questionnaires'
import { useAuth } from '../lib/auth/AuthContext'
import { CarteTournee } from '../components/terrain/CarteTournee'
import {
  RESULTATS_PORTE, adresseDepuisPosition, chercherAdresses, couleurResultat, creerPorte, ecrireTournees, libelleResultat, lireTournees,
  nouvelleTournee, statsTournee, synchroniserPorte, chargerTourneesServeur, fusionnerTournees, envoyerTournee, signatureTournee,
  classementTerrain, debutSemaine, type LigneClassement,
  type AdresseBan, type Porte, type ResultatPorte, type StockageTournees,
} from '../lib/terrain/tournees'

const ICONES_RESULTAT: Record<ResultatPorte, typeof DoorClosed> = { absent: DoorClosed, refus: ThumbsDown, interesse: ThumbsUp, rdv: CalendarCheck }
const COULEUR_TEMPERATURE: Record<Temperature, string> = { chaud: '#D62828', tiede: '#E8A317', froid: '#3A86C8' }
const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function ProspectionTerrainPage(): JSX.Element {
  const { profile } = useAuth()
  const [stock, setStock] = useState<StockageTournees>(() => lireTournees(profile?.id))
  const [selection, setSelection] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<Porte | null>(null)
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [recentrage, setRecentrage] = useState(0)
  const [vue, setVue] = useState<'carte' | 'liste'>('carte')
  const [onglet, setOnglet] = useState<'portes' | 'repasser' | 'classement'>('portes')
  const [classement, setClassement] = useState<LigneClassement[] | null>(null)
  const [sauvegarde, setSauvegarde] = useState<'attente' | 'ok' | 'hors_ligne' | 'erreur'>('attente')
  const envoyees = useRef<Map<string, string>>(new Map())
  const serveurCharge = useRef(false)
  const [message, setMessage] = useState('')
  const [localisation, setLocalisation] = useState(false)
  const [sync, setSync] = useState(false)

  const tournee = stock.tournees.find(t => t.id === stock.courante) ?? stock.tournees[0]
  const stats = useMemo(() => statsTournee(tournee), [tournee])
  const absents = tournee.portes.filter(p => p.resultat === 'absent')
  const enAttente = stock.tournees.flatMap(t => t.portes).filter(p => p.aSynchroniser).length

  // Le profil arrive après le premier rendu : on relit alors les tournées de ce commercial.
  useEffect(() => { if (profile?.id) setStock(lireTournees(profile.id)) }, [profile?.id])
  useEffect(() => { if (profile?.id) ecrireTournees(profile.id, stock) }, [stock, profile?.id])

  // Récupère les tournées enregistrées en base (autre appareil, réinstallation…) et les fusionne.
  useEffect(() => {
    if (!profile?.id) return
    let annule = false
    serveurCharge.current = false
    void chargerTourneesServeur(profile.id).then(serveur => {
      if (annule) return
      if (serveur === null) { setSauvegarde(navigator.onLine ? 'erreur' : 'hors_ligne'); serveurCharge.current = true; return }
      envoyees.current = new Map(serveur.map(t => [t.id, signatureTournee(t)]))
      setStock(s => {
        const fusion = fusionnerTournees(s.tournees.filter(t => t.portes.length || t.id === s.courante), serveur)
        return { tournees: fusion.length ? fusion : s.tournees, courante: fusion.some(t => t.id === s.courante) ? s.courante : (fusion[0]?.id ?? s.courante) }
      })
      serveurCharge.current = true
    })
    return () => { annule = true }
  }, [profile?.id])

  // Envoie en base les tournées modifiées, 1,5 s après la dernière saisie (et au retour du réseau).
  const envoyer = useCallback(async () => {
    if (!profile?.id || !serveurCharge.current) return
    if (!navigator.onLine) { setSauvegarde('hors_ligne'); return }
    const aEnvoyer = stock.tournees.filter(t => (t.portes.length || envoyees.current.has(t.id)) && envoyees.current.get(t.id) !== signatureTournee(t))
    if (!aEnvoyer.length) { setSauvegarde('ok'); return }
    for (const t of aEnvoyer) {
      const erreur = await envoyerTournee(t, profile.id)
      if (erreur) { setSauvegarde('erreur'); return }
      envoyees.current.set(t.id, signatureTournee(t))
    }
    setSauvegarde('ok')
  }, [stock.tournees, profile?.id])

  useEffect(() => {
    const minuteur = window.setTimeout(() => { void envoyer() }, 1500)
    return () => window.clearTimeout(minuteur)
  }, [envoyer])

  useEffect(() => {
    if (onglet !== 'classement') return
    void classementTerrain(debutSemaine()).then(setClassement)
  }, [onglet, stock.tournees])

  const majTournee = useCallback((fn: (t: typeof tournee) => typeof tournee) => {
    setStock(s => ({ ...s, tournees: s.tournees.map(t => t.id === s.courante ? fn(t) : t) }))
  }, [])

  const synchroniser = useCallback(async () => {
    const aFaire = stock.tournees.flatMap(t => t.portes.filter(p => p.aSynchroniser))
    if (!aFaire.length || !navigator.onLine) return
    setSync(true)
    let ok = 0
    for (const porte of aFaire) {
      const { prospectId, erreur } = await synchroniserPorte(porte, profile)
      if (!erreur) {
        ok++
        setStock(s => ({ ...s, tournees: s.tournees.map(t => ({ ...t, portes: t.portes.map(p => p.id === porte.id ? { ...p, prospectId, aSynchroniser: false } : p) })) }))
      }
    }
    setSync(false)
    if (ok) setMessage(`${ok} contact(s) envoyé(s) dans le CRM.`)
  }, [stock.tournees, profile])

  useEffect(() => {
    const retour = () => { void synchroniser(); void envoyer() }
    window.addEventListener('online', retour)
    return () => window.removeEventListener('online', retour)
  }, [synchroniser, envoyer])

  /* ----- Ajout d'une porte ----- */
  function ouvrirNouvelle(lat: number, lng: number, adresse?: AdresseBan | null) {
    setBrouillon(creerPorte({ lat, lng, adresse: adresse?.adresse || '', codePostal: adresse?.codePostal || '', ville: adresse?.ville || '', produit: tournee.produit ?? null }))
    setSelection(null)
  }

  async function ajouterIci() {
    if (!navigator.geolocation) { setMessage('La géolocalisation n’est pas disponible sur cet appareil : touchez la carte pour placer la porte.'); return }
    setLocalisation(true); setMessage('')
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude: lat, longitude: lng } = pos.coords
      setPosition({ lat, lng }); setRecentrage(n => n + 1)
      ouvrirNouvelle(lat, lng, await adresseDepuisPosition(lat, lng))
      setLocalisation(false)
    }, () => { setLocalisation(false); setMessage('Position introuvable : autorisez la localisation ou touchez la carte pour placer la porte.') },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 })
  }

  async function clicCarte(lat: number, lng: number) {
    if (brouillon) return
    ouvrirNouvelle(lat, lng, await adresseDepuisPosition(lat, lng))
  }

  function modifier(porte: Porte) { setBrouillon({ ...porte, produit: porte.produit ?? tournee.produit ?? null, reponses: porte.reponses || {} }); setSelection(porte.id); setVue('carte') }

  async function enregistrer(porte: Porte) {
    const existe = tournee.portes.some(p => p.id === porte.id)
    const maintenant = new Date().toISOString()
    let finale: Porte = { ...porte, majLe: maintenant, passages: existe && tournee.portes.find(p => p.id === porte.id)?.resultat !== porte.resultat ? porte.passages + 1 : porte.passages }
    // Passage au CRM pour les contacts chauds ; en cas d'échec (hors-ligne) la porte est conservée et renvoyée plus tard.
    if (finale.resultat === 'interesse' || finale.resultat === 'rdv') {
      const { prospectId, erreur } = navigator.onLine ? await synchroniserPorte(finale, profile) : { prospectId: finale.prospectId, erreur: 'hors-ligne' }
      finale = { ...finale, prospectId, aSynchroniser: !!erreur }
      setMessage(erreur ? 'Enregistré sur l’appareil : le contact sera envoyé au CRM dès le retour du réseau.' : 'Contact créé dans le CRM.')
    }
    majTournee(t => ({ ...t, portes: existe ? t.portes.map(p => p.id === finale.id ? finale : p) : [...t.portes, finale] }))
    setBrouillon(null); setSelection(finale.id)
  }

  function supprimer(id: string) {
    if (!confirm('Retirer cette porte de la tournée ? La fiche prospect éventuelle reste dans le CRM.')) return
    majTournee(t => ({ ...t, portes: t.portes.filter(p => p.id !== id) }))
    setBrouillon(null); setSelection(null)
  }

  function nouvelle() {
    if (tournee.portes.length && !confirm('Démarrer une nouvelle tournée ? La tournée actuelle reste consultable dans l’historique.')) return
    const t = nouvelleTournee()
    setStock(s => ({ tournees: [t, ...s.tournees], courante: t.id }))
    setSelection(null)
  }

  const objectifAtteint = tournee.objectif > 0 && stats.portes >= tournee.objectif
  const progression = tournee.objectif > 0 ? Math.min(100, Math.round((stats.portes / tournee.objectif) * 100)) : 0

  return <div className="page tr">
    <header className="tr-hero">
      <div className="tr-hero-texte">
        <div className="tr-hero-titre"><MapPinned size={22} /><h1>Prospection Terrain</h1></div>
        <p>Cartographiez votre porte-à-porte : une porte, un résultat, deux touches.</p>
      </div>
      <div className="tr-hero-actions">
        <select className="tr-select" value={tournee.id} onChange={e => setStock(s => ({ ...s, courante: e.target.value }))} aria-label="Choisir une tournée">
          {stock.tournees.map(t => <option key={t.id} value={t.id}>{t.nom} ({t.portes.length})</option>)}
        </select>
        <button type="button" className="tr-bouton-clair" onClick={nouvelle}><RotateCcw size={15} /> Nouvelle tournée</button>
      </div>
    </header>

    <section className="tr-produit" aria-label="Produit travaillé">
      <div className="tr-produit-tete"><span>Je propose aujourd’hui</span>{questionnaireDe(tournee.produit) && <small>Questionnaire de {questionnaireDe(tournee.produit)!.questions.length} questions à chaque contact</small>}</div>
      <div className="tr-produit-choix" role="radiogroup">
        {QUESTIONNAIRES.map(q => (
          <button key={q.produit} type="button" role="radio" aria-checked={tournee.produit === q.produit} className={tournee.produit === q.produit ? 'on' : ''}
            onClick={() => majTournee(t => ({ ...t, produit: t.produit === q.produit ? null : q.produit }))}>{q.court}</button>
        ))}
      </div>
      {questionnaireDe(tournee.produit) && <p className="tr-accroche"><Lightbulb size={15} /> {questionnaireDe(tournee.produit)!.accroche}</p>}
    </section>

    <section className="tr-stats" aria-label="Bilan de la tournée">
      <div className="tr-stat gros">
        <div className="tr-objectif"><strong>{stats.portes}</strong><span>/ {tournee.objectif} portes</span>
          <label className="tr-obj-edit" title="Objectif de la tournée">Objectif <input type="number" min={1} value={tournee.objectif} onChange={e => majTournee(t => ({ ...t, objectif: Math.max(1, Number(e.target.value) || 1) }))} /></label></div>
        <div className="tr-progress" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${progression}%` }} /></div>
        {objectifAtteint && <small className="tr-bravo"><Flag size={13} /> Objectif atteint, bravo !</small>}
      </div>
      <div className="tr-stat"><strong>{stats.contacts}</strong><small>Contacts{stats.tauxContact != null ? ` · ${stats.tauxContact} %` : ''}</small></div>
      <div className="tr-stat interesse"><strong>{stats.interesses}</strong><small>Intéressés</small></div>
      <div className="tr-stat rdv"><strong>{stats.rdv}</strong><small>RDV pris</small></div>
      <div className="tr-stat absent"><strong>{stats.absents}</strong><small>Absents à repasser</small></div>
    </section>

    {message && <div className="tr-message" role="status">{message}<button type="button" onClick={() => setMessage('')} aria-label="Fermer"><X size={14} /></button></div>}
    {enAttente > 0 && (
      <div className="tr-attente"><CloudOff size={16} /> {enAttente} contact(s) en attente d’envoi au CRM
        <button type="button" onClick={() => void synchroniser()} disabled={sync || !navigator.onLine}>{sync ? <Loader2 size={14} className="spin" /> : null} Envoyer maintenant</button></div>
    )}

    <div className="tr-bascule" role="tablist" aria-label="Affichage">
      <button type="button" role="tab" aria-selected={vue === 'carte'} className={vue === 'carte' ? 'on' : ''} onClick={() => setVue('carte')}><CarteIcone size={16} /> Carte</button>
      <button type="button" role="tab" aria-selected={vue === 'liste'} className={vue === 'liste' ? 'on' : ''} onClick={() => setVue('liste')}><List size={16} /> Portes ({tournee.portes.length})</button>
    </div>

    <div className={`tr-corps vue-${vue}`}>
      <div className="tr-zone-carte">
        <CarteTournee portes={tournee.portes} selectionId={selection} position={position} recentrage={recentrage} visible={vue === 'carte'}
          onSelect={id => { setSelection(id); setOnglet('portes') }} onClicCarte={(la, lo) => void clicCarte(la, lo)} />
        <div className="tr-carte-actions">
          <button type="button" className="tr-fab" onClick={() => void ajouterIci()} disabled={localisation}>{localisation ? <Loader2 size={20} className="spin" /> : <Plus size={20} />} Ajouter ici</button>
          <button type="button" className="tr-rond" onClick={() => { if (position) setRecentrage(n => n + 1); else void ajouterIci() }} aria-label="Centrer sur ma position" title="Ma position"><LocateFixed size={20} /></button>
        </div>
        {!tournee.portes.length && !brouillon && (
          <div className="tr-vide"><Navigation size={22} /><strong>Démarrez votre tournée</strong><span>Touchez « Ajouter ici » devant une porte, ou touchez la carte pour placer une adresse.</span></div>)}
      </div>

      <aside className="tr-panneau">
        <div className="tr-onglets" role="tablist">
          <button type="button" role="tab" aria-selected={onglet === 'portes'} className={onglet === 'portes' ? 'on' : ''} onClick={() => setOnglet('portes')}>Portes <b>{tournee.portes.length}</b></button>
          <button type="button" role="tab" aria-selected={onglet === 'repasser'} className={onglet === 'repasser' ? 'on' : ''} onClick={() => setOnglet('repasser')}>À repasser <b>{absents.length}</b></button>
          <button type="button" role="tab" aria-selected={onglet === 'classement'} className={onglet === 'classement' ? 'on' : ''} onClick={() => setOnglet('classement')}>Classement</button>
        </div>
        <div className={`tr-sauvegarde ${sauvegarde}`}>
          {sauvegarde === 'ok' && <><Cloud size={13} /> Tournée sauvegardée</>}
          {sauvegarde === 'attente' && <><Cloud size={13} /> Sauvegarde…</>}
          {sauvegarde === 'hors_ligne' && <><CloudOff size={13} /> Hors ligne : enregistré sur l’appareil</>}
          {sauvegarde === 'erreur' && <><CloudOff size={13} /> Sauvegarde en ligne impossible, nouvel essai automatique</>}
        </div>
        {onglet === 'classement' ? (
          <div className="tr-classement">
            <p className="tr-classement-titre">Cette semaine (depuis lundi)</p>
            {classement === null ? <p className="tr-liste-vide">Classement indisponible hors ligne.</p>
              : classement.length === 0 ? <p className="tr-liste-vide">Aucune porte frappée cette semaine pour l’instant.</p>
              : <ol>{classement.map((l, i) => (
                <li key={l.commercial_id} className={l.commercial_id === profile?.id ? 'moi' : ''}>
                  <span className="tr-rang">{i + 1}</span>
                  <span className="tr-classement-nom">{l.nom_complet || 'Commercial'}{l.commercial_id === profile?.id ? ' (vous)' : ''}</span>
                  <span className="tr-classement-chiffres"><b>{l.rdv}</b> RDV · {l.interesses} int. · {l.portes} portes</span>
                </li>))}</ol>}
          </div>
        ) : (
        <div className="tr-liste">
          {(onglet === 'portes' ? tournee.portes.slice().reverse() : absents).map(p => {
            const Icone = ICONES_RESULTAT[p.resultat]
            const numero = tournee.portes.findIndex(x => x.id === p.id) + 1
            return (
              <button key={p.id} type="button" className={`tr-porte ${selection === p.id ? 'on' : ''}`} onClick={() => modifier(p)}>
                <span className="tr-porte-pastille" style={{ background: couleurResultat(p.resultat) }}>{numero}</span>
                <span className="tr-porte-texte">
                  <strong>{p.adresse || 'Adresse non renseignée'}</strong>
                  <small>{[p.codePostal, p.ville].filter(Boolean).join(' ')} · {heure(p.majLe)}{p.passages > 1 ? ` · passage ${p.passages}` : ''}</small>
                  {(p.nom || p.prenom) && <small>{`${p.prenom} ${p.nom}`.trim()}{(() => { const q = qualifier(p.produit, p.reponses); return q && q.repondues ? <span className="tr-temp" style={{ color: COULEUR_TEMPERATURE[q.temperature] }}> · <Thermometer size={11} /> {libelleTemperature(q.temperature)}{questionnaireDe(p.produit) ? ` ${questionnaireDe(p.produit)!.court}` : ''}</span> : null })()}</small>}
                </span>
                <span className="tr-porte-etat" style={{ color: couleurResultat(p.resultat) }}>{p.aSynchroniser && <CloudOff size={13} />}<Icone size={15} />{p.resultat === 'absent' && onglet === 'repasser' ? 'Repasser' : libelleResultat(p.resultat)}</span>
              </button>)
          })}
          {(onglet === 'portes' ? tournee.portes.length === 0 : absents.length === 0) && (
            <p className="tr-liste-vide">{onglet === 'portes' ? 'Aucune porte pour le moment.' : 'Aucun absent à repasser. Bravo !'}</p>)}
        </div>
        )}
      </aside>
    </div>

    {brouillon && <FeuillePorte porte={brouillon} existe={tournee.portes.some(p => p.id === brouillon.id)} proche={position ?? { lat: brouillon.lat, lng: brouillon.lng }}
      onFermer={() => { setBrouillon(null) }} onEnregistrer={p => void enregistrer(p)} onSupprimer={() => supprimer(brouillon.id)} />}
  </div>
}

/* ------------------------------------------------------------------ Feuille de saisie d'une porte */

interface FeuilleProps {
  porte: Porte
  existe: boolean
  proche: { lat: number; lng: number }
  onFermer: () => void
  onEnregistrer: (p: Porte) => void
  onSupprimer: () => void
}

function FeuillePorte({ porte, existe, proche, onFermer, onEnregistrer, onSupprimer }: FeuilleProps) {
  const [p, setP] = useState<Porte>(porte)
  const [requete, setRequete] = useState('')
  const [suggestions, setSuggestions] = useState<AdresseBan[]>([])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const maj = (patch: Partial<Porte>) => setP(x => ({ ...x, ...patch }))
  const contactChaud = p.resultat === 'interesse' || p.resultat === 'rdv'

  useEffect(() => {
    const t = setTimeout(async () => setSuggestions(await chercherAdresses(requete, proche)), 280)
    return () => clearTimeout(t)
  }, [requete, proche])

  async function valider() {
    if (contactChaud && !p.nom.trim() && !p.telephone.trim()) { setErreur('Notez au moins le nom ou le téléphone du contact.'); return }
    if (p.resultat === 'rdv' && !p.dateRdv) { setErreur('Indiquez la date et l’heure du rendez-vous.'); return }
    setErreur(''); setEnvoi(true)
    await onEnregistrer(p)
    setEnvoi(false)
  }

  return (
    <div className="tr-voile" role="dialog" aria-modal="true" aria-label="Résultat de la porte" onClick={e => { if (e.target === e.currentTarget) onFermer() }}>
      <div className="tr-feuille">
        <div className="tr-feuille-tete">
          <h2>{existe ? 'Modifier la porte' : 'Nouvelle porte'}</h2>
          <button type="button" className="tr-fermer" onClick={onFermer} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="tr-adresse">
          <div className="tr-adresse-ligne"><MapPinned size={18} /><div><strong>{p.adresse || 'Adresse inconnue'}</strong><small>{[p.codePostal, p.ville].filter(Boolean).join(' ') || 'Recherchez ou corrigez l’adresse ci-dessous'}</small></div></div>
          <div className="tr-recherche"><Search size={15} /><input value={requete} onChange={e => setRequete(e.target.value)} placeholder="Corriger l’adresse…" aria-label="Rechercher une adresse" /></div>
          {suggestions.length > 0 && (
            <ul className="tr-suggestions">{suggestions.map(s => <li key={s.label}><button type="button" onClick={() => { maj({ adresse: s.adresse, codePostal: s.codePostal, ville: s.ville, lat: s.lat, lng: s.lng }); setRequete(''); setSuggestions([]) }}>{s.label}</button></li>)}</ul>)}
        </div>

        <div className="tr-groupe">Résultat</div>
        <div className="tr-resultats">
          {RESULTATS_PORTE.map(r => { const Icone = ICONES_RESULTAT[r.valeur]; return (
            <button key={r.valeur} type="button" className={`tr-resultat ${p.resultat === r.valeur ? 'on' : ''}`} style={{ '--c': r.couleur } as React.CSSProperties} onClick={() => maj({ resultat: r.valeur })} aria-pressed={p.resultat === r.valeur}>
              <Icone size={22} /><span>{r.label}</span>
            </button>) })}
        </div>

        {contactChaud && (
          <div className="tr-contact">
            <div className="tr-grille">
              <label><span>Prénom</span><input value={p.prenom} onChange={e => maj({ prenom: e.target.value })} autoComplete="given-name" /></label>
              <label><span>Nom</span><input value={p.nom} onChange={e => maj({ nom: e.target.value })} autoComplete="family-name" /></label>
              <label><span>Téléphone</span><input value={p.telephone} inputMode="tel" onChange={e => maj({ telephone: e.target.value })} autoComplete="tel" /></label>
              <label><span>E-mail</span><input value={p.email} type="email" onChange={e => maj({ email: e.target.value })} autoComplete="email" /></label>
            </div>
            {p.resultat === 'rdv' && <label className="tr-pleine"><span>Date et heure du rendez-vous</span><input type="datetime-local" value={p.dateRdv} onChange={e => maj({ dateRdv: e.target.value })} /></label>}
            <Qualification porte={p} onChange={maj} />
            <p className="tr-aide"><CheckCircle2 size={14} /> Ce contact sera créé dans le CRM avec l’historique de cette visite et ses réponses.</p>
          </div>)}

        <label className="tr-pleine"><span>{p.resultat === 'absent' ? 'Note (créneau pour repasser…)' : 'Note'}</span>
          <textarea rows={2} value={p.note} onChange={e => maj({ note: e.target.value })} placeholder={p.resultat === 'refus' ? 'Motif du refus, déjà équipé…' : 'Habitation, chauffage, remarques…'} /></label>

        {erreur && <div className="tr-erreur" role="alert">{erreur}</div>}
        <div className="tr-feuille-pied">
          {existe && <button type="button" className="tr-suppr" onClick={onSupprimer} aria-label="Retirer la porte"><Trash2 size={17} /></button>}
          <button type="button" className="tr-valider" onClick={() => void valider()} disabled={envoi}>{envoi ? <Loader2 size={18} className="spin" /> : <CheckCircle2 size={18} />} Enregistrer</button>
        </div>
      </div>
    </div>
  )
}

/** Questionnaire de qualification du produit travaillé : une touche par réponse, température en direct. */
function Qualification({ porte, onChange }: { porte: Porte; onChange: (patch: Partial<Porte>) => void }) {
  const [ouvert, setOuvert] = useState(true)
  const q = questionnaireDe(porte.produit)
  const reponses = porte.reponses || {}
  const qualif = qualifier(porte.produit, reponses)
  return (
    <div className="tr-quest">
      <div className="tr-quest-tete">
        <label className="tr-quest-produit"><span>Produit</span>
          <select value={porte.produit || ''} onChange={e => onChange({ produit: e.target.value || null })}>
            <option value="">Aucun questionnaire</option>
            {QUESTIONNAIRES.map(x => <option key={x.produit} value={x.produit}>{x.label}</option>)}
          </select>
        </label>
        {qualif && qualif.repondues > 0 && (
          <span className={`tr-quest-temp t-${qualif.temperature}`}><Thermometer size={14} /> {libelleTemperature(qualif.temperature)} · {qualif.repondues}/{qualif.total}</span>)}
        {q && <button type="button" className="tr-quest-plier" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} aria-label={ouvert ? 'Replier le questionnaire' : 'Déplier le questionnaire'}><ChevronDown size={18} style={{ transform: ouvert ? 'rotate(180deg)' : undefined }} /></button>}
      </div>
      {qualif && qualif.bloquants.length > 0 && <div className="tr-quest-bloquant"><AlertTriangle size={14} /> {qualif.bloquants.join(' · ')}</div>}
      {q && ouvert && (
        <div className="tr-quest-liste">
          {q.questions.map(question => (
            <div key={question.id} className="tr-question">
              <div className="tr-question-label">{question.label}{question.aide && <small>{question.aide}</small>}</div>
              <div className="tr-options">
                {question.options.map(o => {
                  const actif = reponses[question.id] === o.valeur
                  return <button key={o.valeur} type="button" className={`tr-option${actif ? ' on' : ''}${o.bloquant ? ' bloque' : ''}`} aria-pressed={actif}
                    onClick={() => onChange({ reponses: { ...reponses, [question.id]: actif ? '' : o.valeur } })}>{o.label}</button>
                })}
              </div>
            </div>
          ))}
          <div className="tr-quest-verif"><b>À vérifier au rendez-vous :</b> {q.aVerifier.join(' · ')}</div>
        </div>
      )}
    </div>
  )
}
