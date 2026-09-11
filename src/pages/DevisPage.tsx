import { useEffect, useMemo, useState } from 'react'
import {
  Plus, FileSignature, ArrowLeft, Trash2, Send, Save, Download, PenTool, CheckCircle2, Lock, FilePlus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Devis, DevisLigne, DevisAide, Prospect, Produit, Entreprise } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { FloatSelect, FloatInput, FloatTextarea } from '../components/ui/FloatInput'
import { SignaturePad } from '../components/shared/SignaturePad'
import {
  calculMontantLigneHT, calculTotauxDevis, calculResteACharge,
  CATEGORIE_VERS_GESTE_MPR, CATEGORIE_VERS_GESTE_CEE,
} from '../lib/devis/calculDevis'
import { calculAideMPR, determinerProfilMPR, ProfilMPR, LABEL_PROFIL } from '../lib/aides/baremeMaPrimeRenov'
import { prixProduitPourZone } from '../lib/catalogue/prixParZone'
import { estimerPrimeCEE } from '../lib/aides/calculAidesCEE'
import { telechargerDevisPDF } from '../lib/pdf/genererDevisPDF'
import { useAuth } from '../lib/auth/AuthContext'
import { numeroDevis } from '../lib/devis/numeroDevis'

const STATUT_BADGE: Record<string, string> = {
  brouillon: 'badge-neutral', envoye: 'badge-warning',
  signe: 'badge-success', refuse: 'badge-error', expire: 'badge-error',
}

const CATEGORIES = [
  { value: 'combles', label: 'Isolation combles / rampants' },
  { value: 'murs', label: 'Isolation murs' },
  { value: 'plancher', label: 'Isolation plancher bas' },
  { value: 'menuiseries', label: 'Menuiseries' },
  { value: 'pac_air_eau', label: 'PAC Air/Eau' },
  { value: 'pac_air_air', label: 'PAC Air/Air' },
  { value: 'pac_geothermie', label: 'PAC géothermique' },
  { value: 'ballon_thermodynamique', label: 'Ballon thermodynamique' },
  { value: 'vmc', label: 'VMC' },
  { value: 'autre', label: 'Autre prestation' },
]

const euro = (n: number | null | undefined) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n || 0)

interface DevisPageProps {
  /** Devis à ouvrir automatiquement (ex: venant d'être créé depuis une visite technique) */
  openDevisId?: string | null
  /** Appelé une fois le devis demandé ouvert, pour que le parent nettoie son état */
  onOpenedDevis?: () => void
  /** Prospect à préremplir en arrivant (depuis la fiche prospect, action "Continuer"). */
  initialProspectId?: string | null
  /** Appelé une fois le prospect initial pris en compte, pour que le parent nettoie son état. */
  onInitialProspectHandled?: () => void
}

export function DevisPage({ openDevisId, onOpenedDevis, initialProspectId, onInitialProspectHandled }: DevisPageProps = {}) {
  const { profile } = useAuth()
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [rows, setRows] = useState<(Devis & { prospect?: Prospect })[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newProspectId, setNewProspectId] = useState('')

  const [current, setCurrent] = useState<(Devis & { prospect?: Prospect }) | null>(null)
  const [lignes, setLignes] = useState<DevisLigne[]>([])
  const [aides, setAides] = useState<DevisAide[]>([])
  const [produits, setProduits] = useState<Produit[]>([])
  const [filtreCategorie, setFiltreCategorie] = useState<string>('combles')
  const [saving, setSaving] = useState(false)
  const [tauxCEE, setTauxCEE] = useState(6)
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [nomSignataire, setNomSignataire] = useState('')
  const [signing, setSigning] = useState(false)
  const [devisParent, setDevisParent] = useState<Devis | null>(null)
  const [avenants, setAvenants] = useState<Devis[]>([])
  const [creatingAvenant, setCreatingAvenant] = useState(false)

  function fetchListe() {
    setLoading(true)
    supabase.from('devis').select('*, prospect:prospects(*)').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setRows([]); setLoading(false); return }
        setRows((data || []) as any)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchListe()
    supabase.from('prospects').select('*').order('nom').then(({ data }) => setProspects((data || []) as Prospect[]))
    supabase.from('catalogue_produits').select('*').eq('actif', true).then(({ data }) => setProduits((data || []) as Produit[]))
    supabase.from('entreprises').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (data) {
        setEntreprise(data as Entreprise)
        if (data.taux_cee_eur_par_mwh_cumac) setTauxCEE(data.taux_cee_eur_par_mwh_cumac)
      }
    })
  }, [])

  // Devis créé depuis une visite technique (recommandations de travaux) : on l'ouvre directement
  useEffect(() => {
    if (!openDevisId) return
    supabase.from('devis').select('*, prospect:prospects(*)').eq('id', openDevisId).maybeSingle()
      .then(({ data }) => {
        if (data) ouvrirDevis(data as any)
        onOpenedDevis?.()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDevisId])

  // Arrivée depuis la fiche d'un prospect ("Continuer" -> générer une proposition commerciale) :
  // on ouvre directement le formulaire de nouveau devis avec le prospect préselectionné.
  useEffect(() => {
    if (!initialProspectId) return
    setNewProspectId(initialProspectId)
    setShowNewModal(true)
    onInitialProspectHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProspectId])

  async function creerDevis() {
    if (!newProspectId) return
    const { data: entreprise } = await supabase.from('entreprises').select('id, devis_duree_validite_jours, devis_conditions_paiement_defaut').limit(1).maybeSingle()
    const dureeValidite = entreprise?.devis_duree_validite_jours ?? 30
    const dateValidite = new Date(Date.now() + dureeValidite * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data, error } = await supabase.from('devis').insert({
      entreprise_id: entreprise?.id || null,
      prospect_id: newProspectId,
      numero: numeroDevis(),
      statut: 'brouillon',
      type_operation: 'mono_geste',
      date_validite: dateValidite,
      conditions_paiement: entreprise?.devis_conditions_paiement_defaut || '',
    }).select('*, prospect:prospects(*)').single()
    if (error || !data) return
    setShowNewModal(false)
    setNewProspectId('')
    ouvrirDevis(data as any)
    fetchListe()
  }

  async function ouvrirDevis(devis: Devis & { prospect?: Prospect }) {
    setCurrent(devis)
    setNomSignataire(devis.signature_nom_signataire || (devis.prospect ? `${devis.prospect.civilite || ''} ${devis.prospect.prenom} ${devis.prospect.nom}`.trim() : ''))
    setSignatureData(devis.signature_image_data || null)
    setDevisParent(null)
    setAvenants([])
    const [{ data: l }, { data: a }] = await Promise.all([
      supabase.from('devis_lignes').select('*').eq('devis_id', devis.id).order('ordre'),
      supabase.from('devis_aides').select('*').eq('devis_id', devis.id),
    ])
    setLignes((l || []) as DevisLigne[])
    setAides((a || []) as DevisAide[])
    if (devis.devis_parent_id) {
      supabase.from('devis').select('*').eq('id', devis.devis_parent_id).maybeSingle()
        .then(({ data }) => setDevisParent(data as Devis | null))
    }
    supabase.from('devis').select('*').eq('devis_parent_id', devis.id).order('numero_avenant')
      .then(({ data }) => setAvenants((data || []) as Devis[]))
    setView('editor')
  }

  async function creerAvenant() {
    if (!current) return
    setCreatingAvenant(true)
    const numeroAvenant = (avenants.length || 0) + 1
    const { data: entreprise } = await supabase.from('entreprises').select('devis_duree_validite_jours, devis_conditions_paiement_defaut').limit(1).maybeSingle()
    const dureeValidite = entreprise?.devis_duree_validite_jours ?? 30
    const dateValidite = new Date(Date.now() + dureeValidite * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const { data: nouveau, error } = await supabase.from('devis').insert({
      entreprise_id: current.entreprise_id,
      prospect_id: current.prospect_id,
      visite_id: current.visite_id,
      numero: `${current.numero}-AV${numeroAvenant}`,
      statut: 'brouillon',
      type_operation: current.type_operation,
      devis_parent_id: current.id,
      numero_avenant: numeroAvenant,
      date_validite: dateValidite,
      conditions_paiement: current.conditions_paiement || entreprise?.devis_conditions_paiement_defaut || '',
      notes: `Avenant n°${numeroAvenant} au devis ${current.numero} (signé le ${current.signature_date ? new Date(current.signature_date).toLocaleDateString('fr-FR') : '—'}).`,
    }).select('*, prospect:prospects(*)').single()

    if (!error && nouveau) {
      // On repart des lignes/aides du devis signé, modifiables dans l'avenant
      if (lignes.length > 0) {
        await supabase.from('devis_lignes').insert(lignes.map((l, i) => ({
          devis_id: nouveau.id, produit_id: l.produit_id, designation: l.designation,
          description: l.description, caracteristiques: l.caracteristiques,
          quantite: l.quantite, prix_unitaire_ht: l.prix_unitaire_ht, tva_taux: l.tva_taux,
          montant_ht: l.montant_ht, ordre: i,
        })))
      }
      if (aides.length > 0) {
        await supabase.from('devis_aides').insert(aides.map(a => ({
          devis_id: nouveau.id, type: a.type, libelle: a.libelle, montant: a.montant, details: a.details,
        })))
      }
      fetchListe()
      ouvrirDevis(nouveau as any)
    }
    setCreatingAvenant(false)
  }

  const profilMPR: ProfilMPR | null = useMemo(() => {
    const p = current?.prospect
    if (!p?.rfr || !p.nombre_personnes_foyer) return null
    return determinerProfilMPR(p.rfr, p.nombre_personnes_foyer, !!p.zone_ile_de_france)
  }, [current])

  function ajouterProduit(produit: Produit) {
    const prixApplicable = prixProduitPourZone(produit, p?.code_postal)
    const ligne: DevisLigne = {
      id: `tmp_${Date.now()}_${Math.random()}`,
      devis_id: current!.id,
      produit_id: produit.id,
      designation: produit.nom,
      description: produit.description,
      caracteristiques: produit.caracteristiques,
      quantite: 1,
      prix_unitaire_ht: prixApplicable,
      tva_taux: produit.tva_taux,
      montant_ht: prixApplicable,
      ordre: lignes.length,
      created_at: new Date().toISOString(),
    }
    setLignes(ls => [...ls, ligne])

    if (produit.eligible_mpr && profilMPR) {
      const gesteId = CATEGORIE_VERS_GESTE_MPR[produit.categorie]
      if (gesteId) {
        const resultat = calculAideMPR(gesteId as any, profilMPR, prixApplicable)
        if (resultat.montant > 0 && !aides.some(a => a.type === 'maprimerenov' && (a.details as any)?.gesteId === gesteId)) {
          setAides(as => [...as, {
            id: `tmp_${Date.now()}_mpr`,
            devis_id: current!.id,
            type: 'maprimerenov',
            libelle: `MaPrimeRénov' — ${resultat.geste.nom} (profil ${LABEL_PROFIL[profilMPR]})`,
            montant: resultat.montant,
            details: { gesteId, profil: profilMPR },
            created_at: new Date().toISOString(),
          }])
        }
      }
    }
    if (produit.eligible_cee) {
      const gesteId = CATEGORIE_VERS_GESTE_CEE[produit.categorie]
      if (gesteId) {
        const estimation = estimerPrimeCEE(gesteId, 1, tauxCEE)
        if (estimation.montantEstime > 0 && !aides.some(a => a.type === 'cee' && (a.details as any)?.gesteId === gesteId)) {
          setAides(as => [...as, {
            id: `tmp_${Date.now()}_cee`,
            devis_id: current!.id,
            type: 'cee',
            libelle: `CEE — ${estimation.coefficient?.nom || gesteId} (estimation)`,
            montant: estimation.montantEstime,
            details: { gesteId, estimation: true },
            created_at: new Date().toISOString(),
          }])
        }
      }
    }
  }

  function updateLigne(id: string, patch: Partial<DevisLigne>) {
    setLignes(ls => ls.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, ...patch }
      updated.montant_ht = calculMontantLigneHT(updated)
      return updated
    }))
  }

  function removeLigne(id: string) {
    setLignes(ls => ls.filter(l => l.id !== id))
  }

  function removeAide(id: string) {
    setAides(as => as.filter(a => a.id !== id))
  }

  function ajouterAideManuelle(type: DevisAide['type']) {
    const libelles: Record<string, string> = {
      anah_ampleur: "Aide Anah — rénovation d'ampleur",
      eco_ptz: 'Éco-PTZ',
      tva_reduite: 'TVA réduite 5,5% (déjà appliquée sur les lignes)',
    }
    setAides(as => [...as, {
      id: `tmp_${Date.now()}_manuel`,
      devis_id: current!.id,
      type,
      libelle: libelles[type] || type,
      montant: 0,
      details: {},
      created_at: new Date().toISOString(),
    }])
  }

  const totaux = useMemo(() => calculTotauxDevis(lignes), [lignes])
  const totalAides = useMemo(() => aides.reduce((s, a) => s + (a.montant || 0), 0), [aides])
  const resteACharge = useMemo(() => calculResteACharge(totaux.montantTTC, aides), [totaux, aides])

  async function enregistrer() {
    if (!current) return
    setSaving(true)

    await supabase.from('devis').update({
      montant_ht: totaux.montantHT,
      montant_tva: totaux.montantTVA,
      montant_ttc: totaux.montantTTC,
      montant_aides: totalAides,
      reste_a_charge: resteACharge,
      date_validite: current.date_validite,
      conditions_paiement: current.conditions_paiement,
    }).eq('id', current.id)

    await supabase.from('devis_lignes').delete().eq('devis_id', current.id)
    if (lignes.length > 0) {
      await supabase.from('devis_lignes').insert(lignes.map((l, i) => ({
        devis_id: current.id,
        produit_id: l.produit_id,
        designation: l.designation,
        description: l.description,
        caracteristiques: l.caracteristiques,
        quantite: l.quantite,
        prix_unitaire_ht: l.prix_unitaire_ht,
        tva_taux: l.tva_taux,
        montant_ht: l.montant_ht,
        ordre: i,
      })))
    }

    await supabase.from('devis_aides').delete().eq('devis_id', current.id)
    if (aides.length > 0) {
      await supabase.from('devis_aides').insert(aides.map(a => ({
        devis_id: current.id,
        type: a.type,
        libelle: a.libelle,
        montant: a.montant,
        details: a.details,
      })))
    }

    setSaving(false)
    fetchListe()
  }

  async function envoyerSignature() {
    if (!current) return
    await enregistrer()
    await supabase.from('devis').update({ statut: 'envoye', signature_statut: 'envoye' }).eq('id', current.id)
    setCurrent(c => c ? { ...c, statut: 'envoye', signature_statut: 'envoye' } : c)
    fetchListe()
  }

  function telechargerPDF() {
    if (!current) return
    telechargerDevisPDF(
      { ...current, montant_ht: totaux.montantHT, montant_tva: totaux.montantTVA, montant_ttc: totaux.montantTTC, montant_aides: totalAides, reste_a_charge: resteACharge },
      lignes,
      aides,
      current.prospect || null,
      entreprise
    )
  }

  async function validerSignature() {
    if (!current || !signatureData || !nomSignataire.trim()) return
    setSigning(true)

    // On enregistre d'abord les lignes/aides en l'état, un devis signé ne doit plus être
    // modifiable ensuite (valeur juridique du "bon pour accord")
    await enregistrer()

    const dateSignature = new Date().toISOString()

    // Empreinte du contenu signé (montants + signataire + horodatage) pour renforcer la
    // valeur probante : toute modification ultérieure du devis serait détectable.
    const contenuAHacher = JSON.stringify({
      devisId: current.id, numero: current.numero,
      montantTTC: totaux.montantTTC, resteACharge, nomSignataire: nomSignataire.trim(), dateSignature,
    })
    let hash = ''
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contenuAHacher))
      hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
    } catch { /* SubtleCrypto indisponible (contexte non sécurisé) — audit dégradé sans hash */ }

    const signatureAudit = {
      hash_document: hash,
      user_agent: navigator.userAgent,
      langue: navigator.language,
      signe_par_compte: profile?.nom_complet || null,
      note_juridique: 'Signature manuscrite capturée en présence du client (tablette). Horodatage et empreinte du document fournis à titre de preuve renforcée ; ceci ne constitue pas une signature électronique qualifiée au sens eIDAS.',
    }

    const { data, error } = await supabase.from('devis').update({
      statut: 'signe',
      signature_statut: 'signe',
      signature_provider: 'tablette',
      signature_date: dateSignature,
      signature_image_data: signatureData,
      signature_nom_signataire: nomSignataire.trim(),
      signature_audit: signatureAudit,
    }).eq('id', current.id).select('*, prospect:prospects(*)').single()

    if (!error && current.prospect_id) {
      await supabase.from('interactions').insert({
        prospect_id: current.prospect_id, type: 'devis', auteur: profile?.nom_complet || 'Vous',
        contenu: `Devis ${current.numero} signé — ${euro(totaux.montantTTC)} TTC`,
      })
      await supabase.from('prospects').update({ statut: 'Signé', derniere_interaction_at: dateSignature }).eq('id', current.prospect_id)
    }

    // Un devis signé ouvre (ou complète) le dossier de suivi du client : c'est le pivot
    // entre "vente" et "suivi CRM/administratif" du dossier de rénovation.
    if (!error && current.prospect_id && !current.dossier_id) {
      const { data: dossier } = await supabase.from('dossiers').insert({
        prospect_id: current.prospect_id,
        visite_id: current.visite_id || null,
        devis_id: current.id,
        reference: `DOS-${current.numero.replace('DEV-', '')}`,
        statut: 'signe',
        montant_total: totaux.montantTTC,
        aides_montant: totalAides,
        reste_a_charge: resteACharge,
      }).select('id').single()

      if (dossier) {
        await supabase.from('devis').update({ dossier_id: dossier.id }).eq('id', current.id)
        // Checklist des pièces administratives usuelles à recueillir pour instruire le dossier
        await supabase.from('documents').insert([
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Devis signé', type: 'devis_signe', categorie: 'Contractuel', recu: true },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: "Avis d'imposition N-2", type: 'avis_imposition', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'RIB', type: 'rib', categorie: 'Administratif', recu: false },
          { dossier_id: dossier.id, prospect_id: current.prospect_id, nom: 'Photos avant travaux', type: 'photos', categorie: 'Technique', recu: false },
        ])
      }
    }

    setSigning(false)
    setShowSignatureModal(false)

    if (!error && data) {
      setCurrent(data as any)
      fetchListe()
    }
  }

  const produitsFiltres = produits.filter(p => p.categorie === filtreCategorie)

  if (view === 'list') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Devis</h1>
            <p className="page-subtitle">Devis clients avec calcul automatique des aides mobilisables</p>
          </div>
          <div className="page-actions">
            <Button variant="primary" onClick={() => setShowNewModal(true)}>
              <Plus size={18} /> Nouveau devis
            </Button>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="card-pad text-muted">Chargement…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <FileSignature size={40} />
              <h3>Aucun devis</h3>
              <p>Créez votre premier devis à partir de votre catalogue produits.</p>
              <Button variant="primary" onClick={() => setShowNewModal(true)}>
                <Plus size={18} /> Nouveau devis
              </Button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Numéro</th><th>Client</th><th>Statut</th>
                  <th>Montant TTC</th><th>Aides</th><th>Reste à charge</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => (
                  <tr key={d.id} onClick={() => ouvrirDevis(d)} style={{ cursor: 'pointer' }}>
                    <td className="font-semibold">
                      {d.numero}
                      {d.devis_parent_id && <span className="badge badge-neutral" style={{ marginLeft: 8, fontSize: 10 }}>Avenant</span>}
                    </td>
                    <td>{d.prospect ? `${d.prospect.prenom} ${d.prospect.nom}` : '—'}</td>
                    <td><span className={`badge ${STATUT_BADGE[d.statut] || 'badge-neutral'}`}>{d.statut}</span></td>
                    <td>{euro(d.montant_ttc)}</td>
                    <td>{euro(d.montant_aides)}</td>
                    <td className="font-semibold">{euro(d.reste_a_charge)}</td>
                    <td className="text-muted">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal
          open={showNewModal}
          onClose={() => setShowNewModal(false)}
          title="Nouveau devis"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowNewModal(false)}>Annuler</Button>
              <Button variant="primary" onClick={creerDevis} disabled={!newProspectId}>Créer le devis</Button>
            </>
          }
        >
          <FloatSelect
            label="Client"
            value={newProspectId}
            onChange={setNewProspectId}
            options={prospects.map(p => ({ value: p.id, label: `${p.prenom} ${p.nom} — ${p.ville || ''}` }))}
          />
        </Modal>
      </div>
    )
  }

  const p = current?.prospect
  const estSigne = current?.signature_statut === 'signe'

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={() => setView('list')}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{current?.numero}</h1>
            <p className="page-subtitle">
              {p ? `${p.prenom} ${p.nom} · ${p.adresse_rue || p.adresse || ''} ${p.code_postal || ''} ${p.ville || ''}` : ''}
            </p>
          </div>
        </div>
        <div className="page-actions">
          {!estSigne && (
            <Button variant="secondary" onClick={enregistrer} disabled={saving}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )}
          <Button variant="secondary" onClick={telechargerPDF} disabled={lignes.length === 0}>
            <Download size={16} /> PDF
          </Button>
          {estSigne && (
            <Button variant="secondary" onClick={creerAvenant} disabled={creatingAvenant}>
              <FilePlus size={16} /> {creatingAvenant ? 'Création…' : 'Créer un avenant'}
            </Button>
          )}
          {!estSigne && (
            <>
              <Button variant="primary" onClick={() => setShowSignatureModal(true)} disabled={saving || lignes.length === 0}>
                <PenTool size={16} /> Signer sur tablette
              </Button>
              <Button variant="secondary" onClick={envoyerSignature} disabled={saving || lignes.length === 0}>
                <Send size={16} /> Envoyer pour signature électronique
              </Button>
            </>
          )}
        </div>
      </div>

      {estSigne && (
        <div className="card card-pad mb-4" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--c-primary-50, #eafaf1)' }}>
          <CheckCircle2 size={20} color="#16a34a" />
          <div>
            <div className="font-semibold">Devis signé</div>
            <div className="text-sm text-muted">
              Par {current?.signature_nom_signataire} le {current?.signature_date ? new Date(current.signature_date).toLocaleString('fr-FR') : ''} — signature manuscrite sur tablette
            </div>
          </div>
          <span title="Devis verrouillé, non modifiable" style={{ marginLeft: 'auto' }}>
            <Lock size={16} className="text-muted" />
          </span>
        </div>
      )}

      {devisParent && (
        <div className="card card-pad mb-4 text-sm" style={{ background: 'var(--neutral-50)' }}>
          Avenant n°{current?.numero_avenant} du devis{' '}
          <a onClick={() => ouvrirDevis(devisParent)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>{devisParent.numero}</a>
        </div>
      )}

      {avenants.length > 0 && (
        <div className="card card-pad mb-4">
          <div className="section-label">Avenants de ce devis</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {avenants.map(av => (
              <div key={av.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => ouvrirDevis(av as any)}>
                <span className="font-semibold">{av.numero}</span>
                <span className={`badge ${STATUT_BADGE[av.statut] || 'badge-neutral'}`}>{av.statut}</span>
                <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{euro(av.montant_ttc)} TTC</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {profilMPR ? (
        <div className="card card-pad mb-4" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span className="badge badge-info">Profil MaPrimeRénov' : {LABEL_PROFIL[profilMPR]}</span>
          <span className="text-sm text-muted">RFR {euro(p?.rfr)} · {p?.nombre_personnes_foyer} personne(s) · {p?.zone_ile_de_france ? 'Île-de-France' : 'Hors Île-de-France'}</span>
        </div>
      ) : (
        <div className="card card-pad mb-4 text-sm text-muted">
          Renseignez le revenu fiscal de référence et la composition du foyer sur la fiche prospect pour calculer automatiquement l'éligibilité MaPrimeRénov'.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
        <div className="card card-pad">
          <div className="section-label">Ajouter depuis le catalogue</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                className={`btn btn-sm ${filtreCategorie === c.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start' }}
                onClick={() => setFiltreCategorie(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {produitsFiltres.length === 0 && (
              <div className="text-sm text-muted">Aucun produit actif dans cette catégorie. Ajoutez-en depuis le Catalogue.</div>
            )}
            {produitsFiltres.map(prod => (
              <div key={prod.id} className="recap-card" style={{ padding: 10 }}>
                <div className="font-semibold text-sm">{prod.nom}</div>
                <div className="text-sm text-muted">{euro(prod.prix_unitaire_ht)} / {prod.unite}</div>
                <button className="btn btn-sm btn-secondary mt-2" onClick={() => ajouterProduit(prod)} disabled={estSigne}>
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card card-pad">
            <div className="section-label">Lignes du devis</div>
            {lignes.length === 0 ? (
              <div className="text-sm text-muted">Ajoutez des produits depuis le catalogue à gauche.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lignes.map(l => (
                  <div key={l.id} className="recap-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="font-semibold">{l.designation}</div>
                        {l.description && <div className="text-sm text-muted">{l.description}</div>}
                        {Object.keys(l.caracteristiques || {}).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                            {Object.entries(l.caracteristiques).map(([k, v]) => (
                              <span key={k} className="badge badge-neutral" style={{ fontSize: 11 }}>{k} : {v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {!estSigne && <button className="btn-icon" onClick={() => removeLigne(l.id)}><Trash2 size={16} /></button>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center' }}>
                      <label className="text-sm text-muted">Qté
                        <input
                          type="number" min={0} step="0.01" value={l.quantite}
                          onChange={e => updateLigne(l.id, { quantite: parseFloat(e.target.value) || 0 })}
                          style={{ width: 70, marginLeft: 6, height: 32 }}
                          disabled={estSigne}
                        />
                      </label>
                      <label className="text-sm text-muted">PU HT
                        <input
                          type="number" min={0} step="0.01" value={l.prix_unitaire_ht}
                          onChange={e => updateLigne(l.id, { prix_unitaire_ht: parseFloat(e.target.value) || 0 })}
                          style={{ width: 90, marginLeft: 6, height: 32 }}
                          disabled={estSigne}
                        />
                      </label>
                      <span className="text-sm text-muted">TVA {l.tva_taux}%</span>
                      <span className="font-semibold" style={{ marginLeft: 'auto' }}>{euro(l.montant_ht)} HT</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="section-label" style={{ marginBottom: 0 }}>Aides mobilisables</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!estSigne && <>
                <button className="btn btn-sm btn-secondary" onClick={() => ajouterAideManuelle('anah_ampleur')}>+ Anah</button>
                <button className="btn btn-sm btn-secondary" onClick={() => ajouterAideManuelle('eco_ptz')}>+ Éco-PTZ</button>
                </>}
              </div>
            </div>
            {aides.length === 0 ? (
              <div className="text-sm text-muted mt-2">Aucune aide ajoutée. Les aides éligibles sont proposées automatiquement à l'ajout d'un produit du catalogue.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {aides.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="text-sm" style={{ flex: 1 }}>{a.libelle}</span>
                    <input
                      type="number" value={a.montant}
                      onChange={e => setAides(as => as.map(x => x.id === a.id ? { ...x, montant: parseFloat(e.target.value) || 0 } : x))}
                      style={{ width: 100, height: 32 }}
                      disabled={estSigne}
                    />
                    <span className="text-sm text-muted">€</span>
                    {!estSigne && <button className="btn-icon" onClick={() => removeAide(a.id)}><Trash2 size={14} /></button>}
                  </div>
                ))}
              </div>
            )}
            <p className="text-sm text-muted mt-3">
              Montants MaPrimeRénov' basés sur le barème 2026 (voir avertissement dans le code source — à vérifier sur
              france-renov.gouv.fr avant engagement contractuel). Montants CEE estimés selon le taux €/MWh cumac renseigné
              dans les paramètres de l'entreprise ({tauxCEE} €/MWh) — à confirmer avec votre délégataire.
            </p>
          </div>

          <div className="card card-pad">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Total HT</span><span>{euro(totaux.montantHT)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">TVA</span><span>{euro(totaux.montantTVA)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Total TTC</span><span>{euro(totaux.montantTTC)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success-600, #16a34a)' }}><span>Aides mobilisées</span><span>-{euro(totalAides)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid var(--c-border)', paddingTop: 8, marginTop: 4 }}>
                <span>Reste à charge</span><span>{euro(resteACharge)}</span>
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <div className="section-label">Conditions de vente</div>
            <div className="mt-3">
              <FloatInput
                label="Date de validité du devis"
                type="date"
                value={current?.date_validite ? current.date_validite.slice(0, 10) : ''}
                onChange={v => setCurrent(c => c ? { ...c, date_validite: v || null } : c)}
                disabled={estSigne}
              />
            </div>
            <div className="mt-4">
              <FloatTextarea
                label="Conditions de paiement"
                value={current?.conditions_paiement || ''}
                onChange={v => setCurrent(c => c ? { ...c, conditions_paiement: v } : c)}
                rows={2}
                disabled={estSigne}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Signature du devis"
        width={620}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowSignatureModal(false)}>Annuler</Button>
            <Button
              variant="primary"
              onClick={validerSignature}
              disabled={!signatureData || !nomSignataire.trim() || signing}
            >
              {signing ? 'Validation…' : 'Valider la signature'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card card-pad" style={{ background: 'var(--c-bg-alt)' }}>
            <div className="font-semibold">{current?.numero}</div>
            <div className="text-sm text-muted">Montant TTC : {euro(totaux.montantTTC)} · Reste à charge : {euro(resteACharge)}</div>
          </div>

          <label className="field">
            <span>Nom du signataire</span>
            <input value={nomSignataire} onChange={e => setNomSignataire(e.target.value)} placeholder="Nom et prénom" />
          </label>

          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Signature</div>
            <SignaturePad onChange={setSignatureData} height={200} />
          </div>

          <p className="text-sm text-muted">
            En signant, le client reconnaît avoir pris connaissance des conditions générales et donne son accord
            ("bon pour accord") sur le présent devis. Le devis sera verrouillé après signature.
          </p>
        </div>
      </Modal>
    </div>
  )
}
