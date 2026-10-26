import { CLE_PUBLIQUE_VAPID } from '../lib/push'
import { genererCGV, mentionsManquantes } from '../lib/devis/cgvModele'
import { useState, useEffect } from 'react'
import { User, Building2, Plug, Bell, Save, ScrollText, RefreshCw, Plus, Image as ImageIcon, Sun, Users, Trash2 } from 'lucide-react'
import { FloatInput, FloatSelect } from '../components/ui/FloatInput'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth/AuthContext'
import type { DispositifAide, Entreprise } from '../types'

const TABS = [
  { key: 'profil', label: 'Profil', icon: <User size={16} /> },
  { key: 'entreprise', label: 'Entreprise', icon: <Building2 size={16} /> },
  { key: 'dispositifs', label: 'Dispositifs d\'aides', icon: <ScrollText size={16} /> },
  { key: 'integrations', label: 'Intégrations', icon: <Plug size={16} /> },
  { key: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { key: 'commerciaux', label: 'Commerciaux historiques', icon: <Users size={16} /> },
]

const ENTREPRISE_VIDE: Partial<Entreprise> = {
  raison_sociale: '', forme_juridique: '', capital_social: '', siret: '', numero_tva: '', numero_rge: '', adresse: '', code_postal: '', ville: '',
  telephone: '', email: '', logo_url: '', iban: '', bic: '', banque: '', conditions_paiement_defaut: 'Paiement à 30 jours date de facture', taux_penalite_retard: '3 fois le taux d’intérêt légal', escompte_defaut: 'Néant', conditions_generales_devis: '',
  taux_cee_eur_par_mwh_cumac: 6,
  devis_duree_validite_jours: 30,
  devis_conditions_paiement_defaut: 'Acompte de 30 % versé après expiration d’un délai de 7 jours suivant la signature (aucun paiement avant ce délai pour une vente à domicile), solde à la réception des travaux.',
  pv_prix_achat_evite_eur_kwh: 0.25,
  pv_prix_revente_surplus_eur_kwh: 0.011,
  pv_cout_installation_eur_par_kwc: 2200,
  pv_prime_moins_3kwc_eur_par_kwc: 0,
  pv_prime_3_9kwc_eur_par_kwc: 0,
  pv_prime_9_36kwc_eur_par_kwc: 0,
  pv_prime_plus_36kwc_eur_par_kwc: 0,
}

const CATEGORIES_DISPOSITIF = [
  { value: 'combles', label: 'Combles / toitures' },
  { value: 'murs', label: 'Murs' },
  { value: 'plancher', label: 'Plancher bas' },
  { value: 'menuiseries', label: 'Menuiseries Extérieures - Fenêtres' },
  { value: 'menuiseries_portes', label: 'Menuiseries Extérieures - Portes' },
  { value: 'pac', label: 'PAC / chauffage' },
  { value: 'pac_air_air', label: 'PAC air/air' },
  { value: 'ballon_thermodynamique', label: 'ECS' },
  { value: 'vmc', label: 'Ventilation' },
]

export function ParametresPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('profil')
  const [profil, setProfil] = useState({ nom: '', prenom: '', email: '', telephone: '' })
  const [profilLoading, setProfilLoading] = useState(true)
  const [profilSaving, setProfilSaving] = useState(false)
  const [profilSaved, setProfilSaved] = useState(false)
  const [entreprise, setEntreprise] = useState<Partial<Entreprise>>(ENTREPRISE_VIDE)
  const [entrepriseLoading, setEntrepriseLoading] = useState(true)
  const [savingEntreprise, setSavingEntreprise] = useState(false)
  const [entrepriseSaved, setEntrepriseSaved] = useState(false)
  const [integrations, setIntegrations] = useState({ mpr: '', apiAdresse: '' })
  const [notif, setNotif] = useState({ email: true, sms: false })
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState('')
  const vapidPublicKey = CLE_PUBLIQUE_VAPID
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [anciensCommerciaux, setAnciensCommerciaux] = useState<any[]>([])
  const [ancienCommercialForm, setAncienCommercialForm] = useState({ nom_complet: '', email: '', telephone: '', notes: '' })
  const [savingAncienCommercial, setSavingAncienCommercial] = useState(false)

  function decodeVapidKey(value: string): ArrayBuffer {
    const padding = '='.repeat((4 - value.length % 4) % 4)
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = window.atob(base64)
    return Uint8Array.from([...raw].map(char => char.charCodeAt(0))).buffer as ArrayBuffer
  }

  async function actualiserEtatPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setPushEnabled(Boolean(subscription))
    } catch {
      setPushEnabled(false)
    }
  }

  useEffect(() => {
    if (tab === 'notifications') void actualiserEtatPush()
  }, [tab])

  async function activerPush() {
    setPushBusy(true)
    setPushMessage('')
    try {
      if (!profile?.id) throw new Error('Votre profil Renova OS est introuvable.')
      if (!vapidPublicKey) throw new Error('La clé publique VAPID n’est pas encore configurée sur le déploiement. L’administrateur doit définir VITE_VAPID_PUBLIC_KEY.')
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Ce navigateur ne prend pas en charge les notifications push.')
      if (!window.isSecureContext) throw new Error('Les notifications push nécessitent une connexion HTTPS.')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Autorisation de notifications refusée dans le navigateur.')
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(vapidPublicKey),
        })
      }
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: profile.id,
        endpoint: subscription.endpoint,
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' })
      if (error) throw error
      setPushEnabled(true)
      setPushMessage('Ce navigateur recevra désormais les notifications Renova OS : récap du matin, relances de devis, nouveaux prospects et messages.')
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : 'Impossible d’activer les notifications push.')
    } finally {
      setPushBusy(false)
    }
  }

  async function desactiverPush() {
    setPushBusy(true)
    setPushMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        if (error) throw error
        await subscription.unsubscribe()
      }
      setPushEnabled(false)
      setPushMessage('Les notifications push sont désactivées sur ce navigateur.')
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : 'Impossible de désactiver les notifications push.')
    } finally {
      setPushBusy(false)
    }
  }

  async function fetchAnciensCommerciaux() {
    const { data } = await supabase.from('commerciaux_historique').select('*').order('nom_complet')
    setAnciensCommerciaux(data || [])
  }

  useEffect(() => {
    if (tab === 'commerciaux' && isAdmin) fetchAnciensCommerciaux()
  }, [tab, isAdmin])

  async function ajouterAncienCommercial() {
    if (!ancienCommercialForm.nom_complet.trim()) return
    setSavingAncienCommercial(true)
    const { error } = await supabase.from('commerciaux_historique').insert({
      nom_complet: ancienCommercialForm.nom_complet.trim(),
      email: ancienCommercialForm.email.trim() || null,
      telephone: ancienCommercialForm.telephone.trim() || null,
      notes: ancienCommercialForm.notes.trim() || null,
    })
    setSavingAncienCommercial(false)
    if (error) { alert(error.message); return }
    setAncienCommercialForm({ nom_complet: '', email: '', telephone: '', notes: '' })
    fetchAnciensCommerciaux()
  }

  async function supprimerAncienCommercial(id: string) {
    if (!confirm('Supprimer cet ancien commercial ? Les prospects qui lui sont attribués conserveront leur historique, mais ne seront plus liés à cette fiche.')) return
    await supabase.from('commerciaux_historique').delete().eq('id', id)
    fetchAnciensCommerciaux()
  }

  useEffect(() => {
    if (!profile) return
    const parts = (profile.nom_complet || '').trim().split(/\s+/).filter(Boolean)
    setProfil({ nom: parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || '', prenom: parts.length > 1 ? parts[0] : '', email: profile.email || '', telephone: profile.telephone || '' })
    setProfilLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  useEffect(() => {
    let cancelled = false
    async function loadEntreprise() {
      if (!profile?.organisation_id) {
        setEntreprise(ENTREPRISE_VIDE)
        setEntrepriseLoading(false)
        return
      }
      setEntrepriseLoading(true)
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('organisation_id', profile.organisation_id)
        .maybeSingle()
      if (cancelled) return
      if (error) console.error('[RENOVA OS] Chargement des informations entreprise:', error)
      setEntreprise(data ? (data as Partial<Entreprise>) : ({ ...ENTREPRISE_VIDE, organisation_id: profile.organisation_id } as Partial<Entreprise>))
      setEntrepriseLoading(false)
    }
    void loadEntreprise()
    return () => { cancelled = true }
  }, [profile?.organisation_id])

  function onLogoChange(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setEntreprise(e => ({ ...e, logo_url: reader.result as string }))
    reader.readAsDataURL(file)
  }

  async function saveEntreprise() {
    if (!profile?.organisation_id) {
      alert("Impossible d'enregistrer l'entreprise : organisation du compte manquante.")
      return
    }
    setSavingEntreprise(true)
    const payload = { ...entreprise, organisation_id: profile.organisation_id }
    const result = entreprise.id
      ? await supabase.from('entreprises').update(payload).eq('id', entreprise.id).eq('organisation_id', profile.organisation_id).select('*').single()
      : await supabase.from('entreprises').insert(payload).select('*').single()
    if (result.error) {
      alert(`Enregistrement impossible : ${result.error.message}`)
      setSavingEntreprise(false)
      return
    }
    if (result.data) setEntreprise(result.data as Entreprise)
    setSavingEntreprise(false)
    setEntrepriseSaved(true)
    setTimeout(() => setEntrepriseSaved(false), 2500)
  }

  const [dispositifs, setDispositifs] = useState<DispositifAide[]>([])
  const [loadingDispositifs, setLoadingDispositifs] = useState(false)
  const [filtreSecteur, setFiltreSecteur] = useState('')
  const [filtreCategorieDisp, setFiltreCategorieDisp] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [dernierSync, setDernierSync] = useState<{ created_at: string; ajoutes: number; source: string } | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [nouveauDispositif, setNouveauDispositif] = useState({
    code: '', dispositif: 'cee', libelle: '', description: '',
    secteur: 'residentiel', public_cible: 'particulier', categorie: 'combles', source_url: '',
  })
  const [savingDispositif, setSavingDispositif] = useState(false)

  function fetchDispositifs() {
    setLoadingDispositifs(true)
    let query = supabase.from('dispositifs_aides').select('*').order('categorie').order('code')
    if (filtreSecteur) query = query.eq('secteur', filtreSecteur)
    if (filtreCategorieDisp) query = query.eq('categorie', filtreCategorieDisp)
    query.then(({ data }) => {
      setDispositifs((data || []) as DispositifAide[])
      setLoadingDispositifs(false)
    })
  }

  useEffect(() => {
    if (tab !== 'dispositifs') return
    fetchDispositifs()
    supabase.from('dispositifs_sync_log').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setDernierSync(data as any))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filtreSecteur, filtreCategorieDisp])

  async function verifierMisesAJour() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const { data, error } = await supabase.functions.invoke('sync-dispositifs-cee')
      if (error) throw error
      setSyncMessage(`Vérification terminée : ${data?.ajoutes ?? 0} dispositif(s) ajouté(s), ${data?.mis_a_jour ?? 0} mis à jour.`)
      fetchDispositifs()
    } catch {
      setSyncMessage(
        "La fonction de mise à jour automatique n'est pas encore déployée sur ce projet Supabase. " +
        "Voir supabase/functions/sync-dispositifs-cee — une fois déployée, ce bouton (et une tâche planifiée) " +
        "maintiendront le catalogue à jour automatiquement. En attendant, ajoutez les nouvelles fiches manuellement ci-dessous."
      )
    }
    setSyncing(false)
  }

  async function ajouterDispositif() {
    if (!nouveauDispositif.code || !nouveauDispositif.libelle) return
    setSavingDispositif(true)
    const { error } = await supabase.from('dispositifs_aides').insert(nouveauDispositif)
    setSavingDispositif(false)
    if (!error) {
      await supabase.from('dispositifs_sync_log').insert({ source: 'manuel', ajoutes: 1, mis_a_jour: 0, erreurs: 0, details: { code: nouveauDispositif.code } })
      setAddModalOpen(false)
      setNouveauDispositif({ code: '', dispositif: 'cee', libelle: '', description: '', secteur: 'residentiel', public_cible: 'particulier', categorie: 'combles', source_url: '' })
      fetchDispositifs()
    }
  }

  async function save() {
    if (!profile?.id) return
    setProfilSaving(true)
    const nom_complet = `${profil.prenom} ${profil.nom}`.trim()
    const { error } = await supabase.from('profiles').update({ nom_complet, email: profil.email, telephone: profil.telephone }).eq('id', profile.id)
    setProfilSaving(false)
    if (error) { alert(error.message); return }
    setProfilSaved(true)
    setTimeout(() => setProfilSaved(false), 2500)
    window.location.reload()
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-subtitle">Gérez votre compte, votre entreprise et vos intégrations</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={tab === 'entreprise' ? saveEntreprise : save} disabled={(tab === 'entreprise' && savingEntreprise) || (tab === 'profil' && profilSaving)}>
            <Save size={18} /> {tab === 'entreprise' ? (savingEntreprise ? 'Enregistrement…' : entrepriseSaved ? 'Enregistré ✓' : 'Enregistrer') : tab === 'profil' ? (profilSaving ? 'Enregistrement…' : profilSaved ? 'Enregistré ✓' : 'Enregistrer') : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="tabs mb-4">
        {TABS.filter(t => t.key !== 'commerciaux' || isAdmin).map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <span className="flex items-center gap-2">{t.icon} {t.label}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {tab === 'profil' && (
            <div className="grid grid-2 gap-3">
              {profilLoading && <div className="text-sm text-muted" style={{gridColumn:'1 / -1'}}>Chargement de votre profil…</div>}
              <FloatInput label="Nom" value={profil.nom} onChange={v => setProfil({ ...profil, nom: v })} />
              <FloatInput label="Prénom" value={profil.prenom} onChange={v => setProfil({ ...profil, prenom: v })} />
              <FloatInput label="Email" type="email" value={profil.email} onChange={v => setProfil({ ...profil, email: v })} />
              <FloatInput label="Téléphone" value={profil.telephone} onChange={v => setProfil({ ...profil, telephone: v })} />
            </div>
          )}

          {tab === 'entreprise' && (
            entrepriseLoading ? (
              <div className="text-muted">Chargement…</div>
            ) : (
              <div className="flex flex-col gap-5">
                <div>
                  <div className="section-label" style={{ marginBottom: 8 }}>Logo (utilisé sur les devis PDF)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 8, border: '1px dashed var(--c-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: 'var(--neutral-50)',
                    }}>
                      {entreprise.logo_url
                        ? <img src={entreprise.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        : <ImageIcon size={24} className="text-muted" />}
                    </div>
                    <div>
                      <input type="file" accept="image/png,image/jpeg" id="logo-upload" style={{ display: 'none' }}
                        onChange={e => onLogoChange(e.target.files?.[0] || null)} />
                      <label htmlFor="logo-upload" className="btn btn-secondary" style={{ cursor: 'pointer' }}>Choisir un fichier</label>
                      {entreprise.logo_url && (
                        <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={() => setEntreprise(e => ({ ...e, logo_url: '' }))}>Retirer</button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-2 gap-3">
                  <FloatInput label="Raison sociale" value={entreprise.raison_sociale || ''} onChange={v => setEntreprise({ ...entreprise, raison_sociale: v })} />
                  <FloatInput label="Forme juridique" value={(entreprise as any).forme_juridique || ''} onChange={v => setEntreprise({ ...entreprise, forme_juridique: v } as any)} />
                  <FloatInput label="Capital social" value={(entreprise as any).capital_social || ''} onChange={v => setEntreprise({ ...entreprise, capital_social: v } as any)} />
                  <FloatInput label="SIRET" value={entreprise.siret || ''} onChange={v => setEntreprise({ ...entreprise, siret: v })} />
                  <FloatInput label="TVA intracommunautaire" value={(entreprise as any).numero_tva || ''} onChange={v => setEntreprise({ ...entreprise, numero_tva: v } as any)} />
                  <FloatInput label="Numéro RGE" value={entreprise.numero_rge || ''} onChange={v => setEntreprise({ ...entreprise, numero_rge: v })} />
                  <FloatInput label="Taux CEE (€/MWh cumac)" type="number" value={String(entreprise.taux_cee_eur_par_mwh_cumac ?? '')} onChange={v => setEntreprise({ ...entreprise, taux_cee_eur_par_mwh_cumac: parseFloat(v) || 0 })} />
                  <FloatInput label="Adresse" value={entreprise.adresse || ''} onChange={v => setEntreprise({ ...entreprise, adresse: v })} />
                  <FloatInput label="Code postal" value={entreprise.code_postal || ''} onChange={v => setEntreprise({ ...entreprise, code_postal: v })} />
                  <FloatInput label="Ville" value={entreprise.ville || ''} onChange={v => setEntreprise({ ...entreprise, ville: v })} />
                  <FloatInput label="Téléphone" value={entreprise.telephone || ''} onChange={v => setEntreprise({ ...entreprise, telephone: v })} />
                  <FloatInput label="Email" type="email" value={entreprise.email || ''} onChange={v => setEntreprise({ ...entreprise, email: v })} />
                </div>

                <div className="mt-4">
                  <div className="field-label" style={{ marginBottom: 6 }}>Coordonnées de facturation</div>
                  <div className="grid grid-2 gap-3">
                    <FloatInput label="Banque" value={(entreprise as any).banque || ''} onChange={v => setEntreprise({ ...entreprise, banque: v } as any)} />
                    <FloatInput label="IBAN" value={(entreprise as any).iban || ''} onChange={v => setEntreprise({ ...entreprise, iban: v } as any)} />
                    <FloatInput label="BIC" value={(entreprise as any).bic || ''} onChange={v => setEntreprise({ ...entreprise, bic: v } as any)} />
                    <FloatInput label="Conditions de paiement facture" value={(entreprise as any).conditions_paiement_defaut || ''} onChange={v => setEntreprise({ ...entreprise, conditions_paiement_defaut: v } as any)} />
                    <FloatInput label="Pénalités de retard" value={(entreprise as any).taux_penalite_retard || ''} onChange={v => setEntreprise({ ...entreprise, taux_penalite_retard: v } as any)} />
                    <FloatInput label="Escompte paiement anticipé" value={(entreprise as any).escompte_defaut || ''} onChange={v => setEntreprise({ ...entreprise, escompte_defaut: v } as any)} />
                  </div>
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 6 }}>Conditions de vente par défaut (devis)</div>
                  <div className="grid grid-2 gap-3 mb-3">
                    <FloatInput
                      label="Durée de validité par défaut (jours)"
                      type="number"
                      value={String(entreprise.devis_duree_validite_jours ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, devis_duree_validite_jours: parseInt(v) || 0 })}
                    />
                  </div>
                  <textarea
                    value={entreprise.devis_conditions_paiement_defaut || ''}
                    onChange={e => setEntreprise({ ...entreprise, devis_conditions_paiement_defaut: e.target.value })}
                    rows={2}
                    style={{ width: '100%', padding: 10, border: '1px solid var(--c-border)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
                    placeholder="Ex : Acompte de 30% à la signature, solde à la réception des travaux."
                  />
                  <p className="text-xs text-muted mt-2">
                    Ces valeurs sont reprises automatiquement sur chaque nouveau devis (date de validité calculée,
                    conditions de paiement pré-remplies) — modifiables ensuite au cas par cas sur chaque devis.
                  </p>
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 6 }}>Mentions obligatoires des CGV</div>
                  <div className="grid grid-2 gap-3 mb-3">
                    <FloatInput label="Médiateur de la consommation (nom)" value={entreprise.mediateur_nom || ''} onChange={v => setEntreprise({ ...entreprise, mediateur_nom: v })} />
                    <FloatInput label="Site du médiateur" value={entreprise.mediateur_site || ''} onChange={v => setEntreprise({ ...entreprise, mediateur_site: v })} />
                    <FloatInput label="Assureur décennale" value={entreprise.assureur_decennale || ''} onChange={v => setEntreprise({ ...entreprise, assureur_decennale: v })} />
                    <FloatInput label="N° de contrat décennale" value={entreprise.police_decennale || ''} onChange={v => setEntreprise({ ...entreprise, police_decennale: v })} />
                    <FloatInput label="Zone / activités couvertes" value={entreprise.couverture_decennale || ''} onChange={v => setEntreprise({ ...entreprise, couverture_decennale: v })} />
                  </div>
                  {mentionsManquantes(entreprise).length > 0 && (
                    <p className="text-xs" style={{ color: '#8A5A00', background: '#FFF6E0', padding: '8px 10px', borderRadius: 8, margin: '0 0 10px' }}>
                      À compléter avant d’envoyer des devis : {mentionsManquantes(entreprise).join(', ')}. Ces mentions sont obligatoires pour une vente à un particulier.
                    </p>
                  )}
                </div>

                <div>
                  <div className="field-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                    <span>Conditions générales de vente (annexées à chaque devis, avec le bordereau de rétractation)</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                      if (entreprise.conditions_generales_devis?.trim() && !confirm('Remplacer le texte actuel par le modèle Renova OS, complété avec les informations de l’entreprise ?')) return
                      setEntreprise({ ...entreprise, conditions_generales_devis: genererCGV(entreprise) })
                    }}>Générer le modèle de CGV</button>
                  </div>
                  <p className="text-xs text-muted" style={{ margin: '0 0 8px' }}>
                    Modèle rédigé pour la rénovation énergétique chez les particuliers (démarchage, rétractation, aides, garanties). Faites-le valider par votre conseil juridique ; vous pouvez le modifier librement. Pensez à enregistrer.
                  </p>
                  <textarea
                    value={entreprise.conditions_generales_devis || ''}
                    onChange={e => setEntreprise({ ...entreprise, conditions_generales_devis: e.target.value })}
                    rows={12}
                    style={{ width: '100%', padding: 10, border: '1px solid var(--c-border)', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
                    placeholder="Conditions de paiement, garanties, mentions légales obligatoires (rétractation, TVA, RGE)…"
                  />
                </div>

                <div style={{ marginTop: 24 }}>
                  <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sun size={16} /> Tarifs photovoltaïque
                  </div>
                  <p className="text-sm text-muted mb-4">
                    Ces tarifs servent au calcul des simulations photovoltaïques en visite technique.
                    Ils évoluent régulièrement (tarif de rachat EDF OA, barème de la prime) — pensez à les
                    tenir à jour périodiquement.
                  </p>
                  <div className="grid grid-2 gap-3">
                    <FloatInput
                      label="Prix du kWh évité en autoconsommation (€)"
                      type="number"
                      value={String(entreprise.pv_prix_achat_evite_eur_kwh ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prix_achat_evite_eur_kwh: parseFloat(v) || 0 })}
                    />
                    <FloatInput
                      label="Tarif de rachat du surplus (€/kWh)"
                      type="number"
                      value={String(entreprise.pv_prix_revente_surplus_eur_kwh ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prix_revente_surplus_eur_kwh: parseFloat(v) || 0 })}
                    />
                    <FloatInput
                      label="Coût d'installation moyen (€/kWc posé, hors aides)"
                      type="number"
                      value={String(entreprise.pv_cout_installation_eur_par_kwc ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_cout_installation_eur_par_kwc: parseFloat(v) || 0 })}
                    />
                  </div>
                  <div className="text-sm text-muted mt-4 mb-2">
                    Barème de la prime à l'autoconsommation (€/kWc, total versé sur 5 ans, par tranche de puissance) :
                  </div>
                  <div className="grid grid-2 gap-3">
                    <FloatInput
                      label="≤ 3 kWc"
                      type="number"
                      value={String(entreprise.pv_prime_moins_3kwc_eur_par_kwc ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prime_moins_3kwc_eur_par_kwc: parseFloat(v) || 0 })}
                    />
                    <FloatInput
                      label="3 à 9 kWc"
                      type="number"
                      value={String(entreprise.pv_prime_3_9kwc_eur_par_kwc ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prime_3_9kwc_eur_par_kwc: parseFloat(v) || 0 })}
                    />
                    <FloatInput
                      label="9 à 36 kWc"
                      type="number"
                      value={String(entreprise.pv_prime_9_36kwc_eur_par_kwc ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prime_9_36kwc_eur_par_kwc: parseFloat(v) || 0 })}
                    />
                    <FloatInput
                      label="> 36 kWc"
                      type="number"
                      value={String(entreprise.pv_prime_plus_36kwc_eur_par_kwc ?? '')}
                      onChange={v => setEntreprise({ ...entreprise, pv_prime_plus_36kwc_eur_par_kwc: parseFloat(v) || 0 })}
                    />
                  </div>
                </div>
              </div>
            )
          )}

          {tab === 'dispositifs' && (
            <div className="flex-col gap-4">
              <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div className="section-label">Catalogue des dispositifs (CEE & MaPrimeRénov')</div>
                  <p className="text-sm text-muted">
                    Référentiel utilisé pour afficher les aides mobilisables lors d'une visite technique ciblée sur un produit.
                    {dernierSync && (
                      <> Dernière mise à jour : {new Date(dernierSync.created_at).toLocaleDateString('fr-FR')} ({dernierSync.source}).</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={verifierMisesAJour} disabled={syncing}>
                    <RefreshCw size={16} /> {syncing ? 'Vérification…' : 'Vérifier les mises à jour'}
                  </Button>
                  <Button variant="primary" onClick={() => setAddModalOpen(true)}>
                    <Plus size={16} /> Ajouter un dispositif
                  </Button>
                </div>
              </div>

              {syncMessage && (
                <div className="card card-pad text-sm" style={{ background: 'var(--neutral-50)' }}>{syncMessage}</div>
              )}

              <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200 }}>
                  <FloatSelect
                    label="Secteur"
                    value={filtreSecteur}
                    onChange={setFiltreSecteur}
                    options={[{ value: '', label: 'Tous les secteurs' }, { value: 'residentiel', label: 'Résidentiel' }, { value: 'tertiaire', label: 'Tertiaire / professionnel' }]}
                  />
                </div>
                <div style={{ minWidth: 220 }}>
                  <FloatSelect
                    label="Catégorie de travaux"
                    value={filtreCategorieDisp}
                    onChange={setFiltreCategorieDisp}
                    options={[{ value: '', label: 'Toutes les catégories' }, ...CATEGORIES_DISPOSITIF]}
                  />
                </div>
              </div>

              {loadingDispositifs ? (
                <div className="text-muted">Chargement…</div>
              ) : dispositifs.length === 0 ? (
                <p className="text-sm text-muted">Aucun dispositif ne correspond à ce filtre.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Code</th><th>Dispositif</th><th>Libellé</th><th>Secteur</th><th>Public</th><th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispositifs.map(d => (
                        <tr key={d.id}>
                          <td className="font-semibold">{d.code}</td>
                          <td><span className={`badge ${d.dispositif === 'cee' ? 'badge-info' : 'badge-success'}`}>{d.dispositif === 'cee' ? 'CEE' : "MaPrimeRénov'"}</span></td>
                          <td>{d.libelle}</td>
                          <td>{d.secteur === 'tertiaire' ? 'Tertiaire' : 'Résidentiel'}</td>
                          <td>{d.public_cible === 'professionnel' ? 'Professionnel' : d.public_cible === 'tous' ? 'Tous' : 'Particulier'}</td>
                          <td><span className={`badge ${d.statut === 'active' ? 'badge-success' : 'badge-error'}`}>{d.statut === 'active' ? 'Active' : 'Abrogée'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'commerciaux' && isAdmin && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 style={{ margin: 0 }}>Anciens commerciaux</h2>
                <p className="text-muted" style={{ marginTop: 6 }}>Ajoutez les commerciaux qui ne sont plus connectés à Renova OS. Vous pourrez ensuite attribuer leurs anciens prospects à leur historique sans créer de compte de connexion.</p>
              </div>
              <div className="grid grid-2 gap-3">
                <FloatInput label="Nom complet *" value={ancienCommercialForm.nom_complet} onChange={v => setAncienCommercialForm(f => ({ ...f, nom_complet: v }))} />
                <FloatInput label="Email" type="email" value={ancienCommercialForm.email} onChange={v => setAncienCommercialForm(f => ({ ...f, email: v }))} />
                <FloatInput label="Téléphone" value={ancienCommercialForm.telephone} onChange={v => setAncienCommercialForm(f => ({ ...f, telephone: v }))} />
                <FloatInput label="Note" value={ancienCommercialForm.notes} onChange={v => setAncienCommercialForm(f => ({ ...f, notes: v }))} />
              </div>
              <Button variant="primary" onClick={ajouterAncienCommercial} disabled={savingAncienCommercial || !ancienCommercialForm.nom_complet.trim()}>
                <Plus size={17} /> {savingAncienCommercial ? 'Ajout…' : 'Ajouter l’ancien commercial'}
              </Button>
              <div className="card" style={{ marginTop: 4 }}>
                <div className="card-body">
                  {anciensCommerciaux.length === 0 ? <div className="text-muted">Aucun ancien commercial enregistré.</div> : anciensCommerciaux.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div><strong>{c.nom_complet}</strong><div className="text-xs text-muted">{c.email || 'Sans email'}{c.telephone ? ` · ${c.telephone}` : ''}</div></div>
                      <button className="btn btn-ghost btn-sm" onClick={() => supprimerAncienCommercial(c.id)} title="Supprimer"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="flex-col gap-4">
              <div className="section-label">Clés API</div>
              <FloatInput label="Clé API MaPrimeRénov'" type="password" value={integrations.mpr} onChange={v => setIntegrations({ ...integrations, mpr: v })} />
              <div className="mt-4">
                <FloatInput label="Clé API api-adresse (BAN)" type="password" value={integrations.apiAdresse} onChange={v => setIntegrations({ ...integrations, apiAdresse: v })} />
              </div>
              <p className="text-xs text-muted mt-4">Les clés sont stockées localement pour cette démonstration.</p>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="flex-col gap-4">
              {[
                { key: 'email', label: 'Notifications par email', desc: 'Recevoir les alertes par email' },
                { key: 'sms', label: 'Notifications SMS', desc: 'Rappels de rendez-vous par SMS' },
              ].map(n => (
                <label key={n.key} className="flex items-center justify-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--c-border)' }}>
                  <div className="flex-col">
                    <div className="font-semibold">{n.label}</div>
                    <div className="text-sm text-muted">{n.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotif({ ...notif, [n.key]: !notif[n.key as keyof typeof notif] })}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: notif[n.key as keyof typeof notif] ? 'var(--c-primary)' : 'var(--c-border)',
                      position: 'relative', transition: 'background 0.2s',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2, left: notif[n.key as keyof typeof notif] ? 22 : 2,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
                    }} />
                  </button>
                </label>
              ))}
              <div style={{ paddingTop: 18, borderTop: '1px solid var(--c-border)', marginTop: 8 }}>
                <div className="font-semibold">Notifications push sur ce navigateur</div>
                <p className="text-sm text-muted" style={{ marginTop: 6 }}>
                  Autorisez Renova OS à afficher des alertes même lorsque l’onglet n’est pas ouvert. L’autorisation du navigateur et la clé publique VAPID sont nécessaires.
                </p>
                <div className="flex items-center gap-3" style={{ flexWrap: 'wrap', marginTop: 12 }}>
                  <span className="badge">{pushEnabled ? 'Navigateur enregistré' : 'Non activées'}</span>
                  {pushEnabled
                    ? <Button variant="secondary" onClick={() => void desactiverPush()} disabled={pushBusy}>{pushBusy ? 'Mise à jour…' : 'Désactiver sur ce navigateur'}</Button>
                    : <Button variant="primary" onClick={() => void activerPush()} disabled={pushBusy}>{pushBusy ? 'Activation…' : 'Activer les notifications push'}</Button>}
                </div>
                {pushMessage && <p className="text-sm" role="status" style={{ marginTop: 10 }}>{pushMessage}</p>}
                {!vapidPublicKey && <p className="text-xs text-muted" style={{ marginTop: 8 }}>Configuration administrateur requise : VITE_VAPID_PUBLIC_KEY dans les variables d’environnement du déploiement.</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Ajouter un dispositif"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={ajouterDispositif} disabled={savingDispositif || !nouveauDispositif.code || !nouveauDispositif.libelle}>
              {savingDispositif ? 'Ajout…' : 'Ajouter'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            À utiliser dès qu'une nouvelle fiche CEE ou un nouveau geste MaPrimeRénov' est publié
            et doit apparaître immédiatement dans les visites techniques ciblées.
          </p>
          <FloatInput label="Code (ex: BAR-TH-171)" value={nouveauDispositif.code} onChange={v => setNouveauDispositif({ ...nouveauDispositif, code: v.toUpperCase() })} />
          <FloatSelect
            label="Dispositif"
            value={nouveauDispositif.dispositif}
            onChange={v => setNouveauDispositif({ ...nouveauDispositif, dispositif: v })}
            options={[{ value: 'cee', label: 'CEE (fiche d\'opération standardisée)' }, { value: 'mpr', label: "MaPrimeRénov'" }]}
          />
          <FloatInput label="Libellé" value={nouveauDispositif.libelle} onChange={v => setNouveauDispositif({ ...nouveauDispositif, libelle: v })} />
          <FloatInput label="Description" value={nouveauDispositif.description} onChange={v => setNouveauDispositif({ ...nouveauDispositif, description: v })} />
          <FloatSelect
            label="Catégorie de travaux"
            value={nouveauDispositif.categorie}
            onChange={v => setNouveauDispositif({ ...nouveauDispositif, categorie: v })}
            options={CATEGORIES_DISPOSITIF}
          />
          <FloatSelect
            label="Secteur"
            value={nouveauDispositif.secteur}
            onChange={v => setNouveauDispositif({ ...nouveauDispositif, secteur: v })}
            options={[{ value: 'residentiel', label: 'Résidentiel' }, { value: 'tertiaire', label: 'Tertiaire / professionnel' }]}
          />
          <FloatSelect
            label="Public cible"
            value={nouveauDispositif.public_cible}
            onChange={v => setNouveauDispositif({ ...nouveauDispositif, public_cible: v })}
            options={[{ value: 'particulier', label: 'Particulier' }, { value: 'professionnel', label: 'Professionnel' }, { value: 'tous', label: 'Les deux' }]}
          />
          <FloatInput label="Lien source (arrêté / ecologie.gouv.fr)" value={nouveauDispositif.source_url} onChange={v => setNouveauDispositif({ ...nouveauDispositif, source_url: v })} />
        </div>
      </Modal>
    </div>
  )
}
