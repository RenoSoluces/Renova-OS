import { useEffect, useState } from 'react'
import { Plus, Package, Pencil, Trash2, X, Copy, Search, FileText, ShieldCheck } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '../lib/auth/AuthContext'
import { supabase } from '../lib/supabase'
import type { Produit } from '../types'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import {
  extraireFiche, ficheDuProduit, estHorsChampBarEn104, estPrestationSansFiche, FICHE_PAR_CATEGORIE, CATEGORIES_MPR_PAR_GESTE, DATE_REGLES,
  valeursFiche, verifierFiche, estChampDeFiche, type PointFiche,
} from '../lib/devis/conformite'
import { REGLES_FICHES } from '../lib/devis/reglesFichesCEE'
import { LigneFicheFields } from '../components/devis/LigneFicheFields'
import { Drawer } from '../components/devis/Drawer'
import '../components/devis/rv.css'

const nettoyerDescriptionProduit = (value: string | null | undefined) => String(value || '')
  .replace(/Prix HT communiqué dans le catalogue fourni/gi, '')
  .replace(/Texte transmis par Reno Soluces le \d{2}\/\d{2}\/\d{4}/gi, '')
  .replace(/Classeur Reno Soluces du \d{2}\/\d{2}\/\d{4}/gi, '')
  .replace(/\b(?:prix_source|source_import|source_fiche_cee|source_tarifs|source_date)\s*[:=]\s*[^\n;|]*/gi, '')
  // Mentions réglementaires internes héritées des imports Atlantic / De Dietrich :
  // la fiche CEE est portée par le champ « fiche_cee », pas par la description client.
  .replace(/(?:^|\s)Fiche (?:CEE )?de r[ée]f[ée]rence\s*:\s*(?:BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-\d{3}[^.\n]*\.?/gi, '')
  .replace(/(?:^|\s)Fiche CEE (?:BAR|BAT|BAE|IND|RES|TRA)-[A-Z]{2}-\d{3}\s*:[^.\n]*\.?/gi, '')
  // Nettoie les métadonnées d'import obsolètes ; elles ne doivent pas contredire les valeurs structurées.
  .replace(/(?:^|\n)\s*(?:Coefficient Uw W M2k|Coefficient Uw W m2K|Facteur Solaire Sw|Notes Controle|Performances A Confirmer|Source Catalogue)\s*:\s*[^\n]*/gi, '')
  .replace(/[ \t]+([,;|])/g, '$1')
  .replace(/[ \t]{2,}/g, ' ')
  .replace(/^[ \t—–;,|]+|[ \t—–;,|]+$/gm, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const CATEGORIES = [
  { value: 'combles_perdus', label: 'Isolation des combles perdus' },
  { value: 'rampants', label: 'Isolation des rampants' },
  { value: 'ite', label: 'Isolation par l’extérieur (ITE)' },
  { value: 'plancher', label: 'Isolation plancher bas' },
  { value: 'menuiseries', label: 'Menuiseries Extérieures - Fenêtres' },
  { value: 'menuiseries_portes', label: 'Menuiseries Extérieures - Portes' },
  { value: 'pac_air_eau', label: 'Pompe à chaleur Air/Eau' },
  { value: 'pac_air_air', label: 'Pompe à chaleur Air/Air' },
  { value: 'pac_geothermie', label: 'Pompe à chaleur géothermique' },
  { value: 'ballon_thermodynamique', label: 'Ballon thermodynamique' },
  { value: 'vmc', label: 'VMC' },
  { value: 'photovoltaique', label: 'Panneaux photovoltaïques' },
  { value: 'batterie_stockage', label: 'Batterie de stockage' },
  { value: 'domotique', label: 'Domotique et pilotage énergétique' },
  { value: 'solaire_thermique', label: 'Solaire thermique — BAR-TH-168' },
  { value: 'ssc', label: 'Système solaire combiné (SSC) — BAR-TH-143' },
  { value: 'professionnel_cee', label: 'Professionnels — CEE', public_cible: 'professionnel' },
  { value: 'professionnel_hors_cee', label: 'Professionnels — hors CEE', public_cible: 'professionnel' },
  { value: 'destratificateur', label: 'Destratificateur d’air', public_cible: 'professionnel' },
  { value: 'hp_flottante', label: 'HP flottante', public_cible: 'professionnel' },
  { value: 'isolation_toiture_pro', label: 'Isolation toiture plate', public_cible: 'professionnel' },
  { value: 'isolation_combles_pro', label: 'Isolation combles / rampants — professionnels', public_cible: 'professionnel' },
  { value: 'pro_photovoltaique', label: 'Panneaux photovoltaïques', public_cible: 'professionnel' },
  { value: 'vt_complete', label: 'Visite technique complète', catalogue_groupe: 'visite_technique' },
  { value: 'vt_produit', label: 'Visite technique produit', catalogue_groupe: 'visite_technique' },
  { value: 'vt_diagnostic_3cl', label: 'Diagnostic / analyse 3CL', catalogue_groupe: 'visite_technique' },
  { value: 'autre', label: 'Autre prestation' },
]

const UNITES = [
  { value: 'unite', label: 'Unité' },
  { value: 'm2', label: 'm²' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'kw', label: 'kW' },
  { value: 'kwc', label: 'kWc (photovoltaïque)' },
  { value: 'ml', label: 'Mètre linéaire' },
]

const TVA_TAUX = [5.5, 10, 20]

const CATEGORIE_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))
type GroupeCatalogue = 'particulier' | 'professionnel' | 'visite_technique'
type CategoriePersonnalisee = { id: string; nom: string; slug: string; public_cible: 'particulier' | 'professionnel'; catalogue_groupe?: GroupeCatalogue }

type CaracLigne = { cle: string; valeur: string }

interface FormState {
  categorie: string
  catalogue_groupe: GroupeCatalogue
  public_cible: 'particulier' | 'professionnel' | 'tous'
  nom: string
  marque: string
  reference: string
  description: string
  caracteristiques: CaracLigne[]
  prix_unitaire_ht: string
  unite: string
  tva_taux: number
  eligible_mpr: boolean
  eligible_cee: boolean
  fiche_cee: string
  actif: boolean
  zones_prix: { zone: string; prix_unitaire_ht: string }[]
  forfait_pose_ht: string
  forfait_evacuation_ht: string
  forfait_consommables_ht: string
}

const carObj = (list: CaracLigne[]): Record<string, string> =>
  Object.fromEntries(list.filter(c => c.cle.trim()).map(c => [c.cle.trim(), c.valeur]))
const carList = (o: Record<string, any>): CaracLigne[] => Object.entries(o).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
const rempli = (v: unknown) => String(v ?? '').trim() !== ''

/** Un prix strictement positif prime toujours sur l'ancien drapeau d'import « prix_a_renseigner ». */
const prixARenseigner = (p: { prix_unitaire_ht?: number | null; caracteristiques?: Record<string, any> | null }) =>
  !(Number(p.prix_unitaire_ht) > 0)

/** Points à corriger pour qu'un produit soit utilisable sur un devis aidé (hors justificatifs propres au devis). */
function pointsProduit(p: { fiche: string | null; marque?: string | null; reference?: string | null; caracteristiques?: Record<string, any> | null }): PointFiche[] {
  if (!p.fiche) return []
  const pts = verifierFiche(p.fiche, valeursFiche(p.fiche, p.caracteristiques), false)
  const regle = REGLES_FICHES[p.fiche]
  if (regle?.verifiee) {
    if (!rempli(p.marque)) pts.push({ gravite: 'bloc', message: 'Marque à renseigner (obligatoire sur le devis)', champ: 'marque' })
    if (!rempli(p.reference)) pts.push({ gravite: 'bloc', message: 'Référence fabricant à renseigner (obligatoire sur le devis)', champ: 'reference' })
  }
  return pts
}

function statutProduit(p: Produit): { kind: 'aucun' | 'non_integre' | 'a_completer' | 'conforme'; blocs: number } {
  const fiche = ficheDuProduit(p)
  if (!fiche) return estHorsChampBarEn104(p) || estPrestationSansFiche(p) || !p.eligible_cee ? { kind: 'aucun', blocs: 0 } : { kind: 'a_completer', blocs: 1 }
  if (!REGLES_FICHES[fiche]?.verifiee) return { kind: 'non_integre', blocs: 0 }
  const blocs = pointsProduit({ fiche, marque: p.marque, reference: p.reference, caracteristiques: p.caracteristiques }).filter(x => x.gravite === 'bloc').length
  return { kind: blocs ? 'a_completer' : 'conforme', blocs }
}

/** Audit transversal du catalogue : n'invente jamais une exigence ou une certification absente. */
function auditerProduit(p: Produit): string[] {
  const issues: string[] = []
  const fiche = ficheDuProduit(p)
  const description = nettoyerDescriptionProduit(p.description)
  const car = p.caracteristiques || {}
  const groupe = p.catalogue_groupe || (p.public_cible === 'professionnel' ? 'professionnel' : 'particulier')
  // L’échafaudage et l’enduit ITE sont des postes de prestation/fourniture dédiés,
  // facturés séparément au m². Ils ne nécessitent ni marque/référence fabricant
  // comme un équipement, ni un forfait de pose additionnel.
  const prestation = groupe === 'visite_technique' || estPrestationSansFiche(p) || /visite|diagnostic|prestation|main.?d.?œuvre/i.test(`${p.nom} ${p.categorie}`)
  if (!description || description.length < 35) issues.push('Description technique absente ou trop courte')
  // Les produits explicitement hors CEE et hors périmètre BAR-EN-104 ne doivent pas
  // être bloqués par un contrôle réglementaire de fiche. Leurs caractéristiques
  // techniques peuvent rester à documenter, sans les classer à tort « à auditer conformité ».
  const horsCEEHorsPerimetre = !p.eligible_cee && estHorsChampBarEn104(p)
  // Ud reste une information technique utile, mais ne constitue pas ici un blocage
  // de conformité CEE puisque ces portes/volets ne relèvent pas de BAR-EN-104.
  if (!horsCEEHorsPerimetre && (p.categorie === 'menuiseries_portes' || /porte d entree|porte entree/i.test(String(car.type_menuiserie || p.nom)))) {
    const ud = car.Ud_W_m2K ?? car.ud_w_m2k ?? car.Ud ?? car.coefficient_Ud_W_m2K
    const nUd = Number(String(ud ?? '').replace(',', '.'))
    if (ud === undefined || ud === null || String(ud).trim() === '' || !Number.isFinite(nUd) || nUd <= 0) {
      issues.push('Coefficient Ud_W_m2K à renseigner (critère technique des portes d’entrée ; hors BAR-EN-104)')
    }
  }
  // La mention d’une fiche CEE dans la description n’est pas, à elle seule, une note interne : elle peut être une référence réglementaire légitime.
  if (/prix source|source tarif|pose incluse|fourniture et pose|conformit[eé] à v[eé]rifier|aides indicatives/i.test(description)) {
    issues.push('Description contaminée par des notes internes/tarifaires')
  }
  if (!prestation && !p.marque?.trim()) issues.push('Marque non renseignée')
  if (!prestation && !p.reference?.trim()) issues.push('Référence fabricant non renseignée')
  if (p.eligible_cee && !fiche && !estHorsChampBarEn104(p) && !estPrestationSansFiche(p)) issues.push('Produit déclaré CEE sans fiche de référence identifiable')
  // Fiche non intégrée au moteur (ex. BAT-*) : information affichée sur la pastille
  // « Règles non intégrées », mais pas une anomalie corrigeable depuis le catalogue.
  // Elle ne maintient donc plus le produit dans « À auditer ».
  if (fiche && REGLES_FICHES[fiche]?.verifiee) {
    const manquants = pointsProduit({ fiche, marque: p.marque, reference: p.reference, caracteristiques: car })
      .filter(x => x.gravite === 'bloc')
    if (manquants.length) issues.push(`Champs réglementaires à compléter (${manquants.length})`)
  }
  if (!horsCEEHorsPerimetre && !Object.keys(car).some(k => !['source_tarifs','source_date','prix_fourniture_ht','forfait_pose_ht','prix_a_renseigner','forfait_pose_a_renseigner','fiche_cee','aides_estimatives_a_verifier','conditions_cee','tva_indicative'].includes(k))) {
    if (!prestation) issues.push('Caractéristiques techniques détaillées absentes')
  }
  // L’audit réglementaire ne doit pas confondre conformité et tarification.
  // Les prix et forfaits peuvent être renseignés ultérieurement sans maintenir
  // un produit dans « À auditer » si ses données techniques/réglementaires sont complètes.
  return [...new Set(issues)]
}

/** Contrôle commercial distinct de l'audit réglementaire : ne modifie pas le statut de conformité. */
function auditerCommercialement(p: Produit): string[] {
  const issues: string[] = []
  const car = p.caracteristiques || {}
  const groupe = p.catalogue_groupe || (p.public_cible === 'professionnel' ? 'professionnel' : 'particulier')
  const prestation = groupe === 'visite_technique' || estPrestationSansFiche(p) || String(car.pose_separee) === 'true'
    || /visite|diagnostic|prestation|main.?d.?œuvre|consommable/i.test(`${p.nom} ${p.categorie}`)
  if (prixARenseigner(p)) issues.push('Prix de fourniture à renseigner')
  if (!(Number(p.forfait_pose_ht) > 0) && !prestation) issues.push('Forfait de pose à renseigner ou confirmer')
  return issues
}

function emptyForm(): FormState {
  return {
    categorie: 'rampants', catalogue_groupe: 'particulier', public_cible: 'particulier', nom: '', marque: '', reference: '', description: '',
    caracteristiques: [{ cle: '', valeur: '' }],
    prix_unitaire_ht: '', unite: 'unite', tva_taux: 5.5,
    eligible_mpr: false, eligible_cee: false, fiche_cee: '', actif: true,
    zones_prix: [],
    forfait_pose_ht: '', forfait_evacuation_ht: '', forfait_consommables_ht: '',
  }
}

/** Catégories rangées par marque (filtre « Marque » affiché). */
const CATEGORIES_FILTRE_MARQUE = ['pac_air_eau', 'pac_air_air', 'pac_geothermie', 'ballon_thermodynamique', 'photovoltaique', 'pro_photovoltaique']

export function CataloguePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'manager'
  const [rows, setRows] = useState<Produit[]>([])
  const [categoriesPersonnalisees, setCategoriesPersonnalisees] = useState<CategoriePersonnalisee[]>([])
  const [loading, setLoading] = useState(true)
  const [filtrePublic, setFiltrePublic] = useState<GroupeCatalogue>('particulier')
  const [filtreCategorie, setFiltreCategorie] = useState<string>('toutes')
  const [filtreMarque, setFiltreMarque] = useState<string>('toutes')
  const [filtreVtPublic, setFiltreVtPublic] = useState<'tous' | 'particulier' | 'professionnel'>('particulier')
  const [recherche, setRecherche] = useState('')
  const [groupement, setGroupement] = useState<'categorie' | 'fournisseur'>('categorie')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Produit | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [ficheDetail, setFicheDetail] = useState<Produit | null>(null)
  const [filtreAudit, setFiltreAudit] = useState<'aucun' | 'conformite' | 'commercial'>('aucun')

  async function fetchProduits() {
    setLoading(true)
    const pageSize = 1000
    const all: Produit[] = []
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from('catalogue_produits')
        .select('id,entreprise_id,categorie,nom,marque,reference,description,caracteristiques,prix_unitaire_ht,unite,tva_taux,eligible_mpr,eligible_cee,fiche_cee,actif,created_at,zones_prix,forfait_pose_ht,forfait_evacuation_ht,public_cible,catalogue_groupe,forfait_consommables_ht')
        // Le produit générique « Isolation » est remplacé par les produits détaillés.
        .neq('nom', 'Isolation')
        .order('categorie', { ascending: true })
        .order('nom', { ascending: true })
        .range(from, from + pageSize - 1)
      if (error) {
        setRows([])
        setLoading(false)
        return
      }
      const batch = (data || []) as Produit[]
      all.push(...batch)
      if (batch.length < pageSize) break
    }
    setRows(all)
    setLoading(false)
  }

  useEffect(() => { fetchProduits(); void chargerCategories() }, [])

  async function chargerCategories() {
    const { data, error } = await supabase.from('catalogue_categories').select('id,nom,slug,public_cible,catalogue_groupe').order('nom')
    if (!error && data) setCategoriesPersonnalisees(data as CategoriePersonnalisee[])
  }

  // Les catégories de produits présentes en base doivent rester accessibles même si
  // une catégorie a été ajoutée/importée sans définition statique dans le code.
  const categoriesConnues = new Set([...CATEGORIES.map(c => c.value), ...categoriesPersonnalisees.map(c => c.slug)])
  const categoriesProduitsManquantes = [...new Set(rows.map(p => String(p.categorie || '').trim()).filter(value => value && !categoriesConnues.has(value)))]
    .map(value => ({ value, label: value === 'vmc' ? 'VMC' : value === 'ssc' ? 'Système solaire combiné (SSC) — BAR-TH-143' : value.replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()) }))
  const categoriesAffichees = [...CATEGORIES, ...categoriesPersonnalisees.map(c => ({ value: c.slug, label: c.nom, public_cible: c.public_cible, catalogue_groupe: c.catalogue_groupe || c.public_cible })), ...categoriesProduitsManquantes]
  const categorieCompatibleGroupe = (c: any, groupe: GroupeCatalogue) => {
    if (c.catalogue_groupe) return c.catalogue_groupe === groupe
    if (['vt_complete','vt_produit','vt_diagnostic_3cl'].includes(c.value)) return groupe === 'visite_technique'
    if (c.public_cible === 'professionnel') return groupe === 'professionnel'
    if (c.value === 'pac_air_eau' || c.value === 'autre' || ['combles','combles_perdus','rampants'].includes(c.value)) return groupe === 'particulier' || groupe === 'professionnel'
    return groupe === 'particulier'
  }
  const categoriesPourGroupe = categoriesAffichees.filter(c => categorieCompatibleGroupe(c, filtrePublic))
  const definitionsSections: { label: string; values: string[] }[] = filtrePublic === 'particulier' ? [
    { label: 'Isolation', values: ['combles_perdus','rampants','ite','plancher'] },
    { label: 'Menuiseries Extérieures', values: ['menuiseries','menuiseries_portes'] },
    { label: 'Chauffage', values: ['pac_air_eau','pac_air_air','pac_geothermie'] },
    { label: 'Production d’eau chaude', values: ['ballon_thermodynamique','solaire_thermique','ssc'] },
    { label: 'Production d’électricité', values: ['photovoltaique','batterie_stockage','domotique'] },
    { label: 'VMC', values: ['vmc'] },
    { label: 'Autres catégories', values: ['autre'] },
  ] : filtrePublic === 'professionnel' ? [
    { label: 'HP flottante', values: ['hp_flottante'] },
    { label: 'Destratificateur d’air', values: ['destratificateur'] },
    { label: 'Chauffage', values: ['pac_air_eau'] },
    { label: 'Isolation toiture plate', values: ['isolation_toiture_pro','isolation_combles_pro','professionnel_cee','professionnel_hors_cee'] },
    { label: 'Production d’électricité', values: ['pro_photovoltaique'] },
    { label: 'Autres catégories', values: ['autre'] },
  ] : [{ label: 'Visites Techniques', values: ['vt_complete','vt_produit','vt_diagnostic_3cl'] }, { label: 'Autres catégories', values: [] }]
  const sectionsAffichees = definitionsSections.map(section => ({ label: section.label, categories: section.values.map(value => categoriesPourGroupe.find(c => c.value === value)).filter(Boolean) }))
  const valeursDejaClassees = new Set(definitionsSections.flatMap(section => section.values))
  const categoriesRestantes = categoriesPourGroupe.filter(c => !valeursDejaClassees.has(c.value))
  if (categoriesRestantes.length) sectionsAffichees.push({ label: 'Autres catégories', categories: categoriesRestantes })
  const labelsCategories = { ...CATEGORIE_LABEL, ...Object.fromEntries(categoriesPersonnalisees.map(c => [c.slug, c.nom])) }

  async function ajouterCategorie(publicCible: GroupeCatalogue) {
    if (!isAdmin) return
    const nom = window.prompt(`Nom de la nouvelle catégorie pour ${publicCible === 'particulier' ? 'les particuliers' : publicCible === 'professionnel' ? 'les professionnels' : 'les visites techniques'} :`)?.trim()
    if (!nom) return
    const base = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    const prefixe = publicCible === 'professionnel' ? 'pro' : publicCible === 'visite_technique' ? 'vt' : 'part'
    const slug = `${prefixe}_${base}`
    const publicCompat = publicCible === 'professionnel' ? 'professionnel' : 'particulier'
    const { error } = await supabase.from('catalogue_categories').insert({ nom, slug, public_cible: publicCompat, catalogue_groupe: publicCible })
    if (error) { alert(`Création impossible : ${error.message}`); return }
    await chargerCategories()
    setFiltrePublic(publicCible)
    setFiltreCategorie(slug)
  }

  function openCreate() {
    setEditing(null)
    const categorie = filtrePublic === 'professionnel' ? 'pac_air_eau' : filtrePublic === 'visite_technique' ? 'vt_complete' : 'rampants'
    setForm({ ...emptyForm(), catalogue_groupe: filtrePublic, public_cible: filtrePublic === 'professionnel' ? 'professionnel' : 'particulier', categorie })
    setModalOpen(true)
  }

  function openEdit(p: Produit) {
    setEditing(p)
    const carac = Object.entries(p.caracteristiques || {}).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
    setForm({
      categorie: p.categorie, catalogue_groupe: (p.catalogue_groupe || (p.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) as GroupeCatalogue, public_cible: p.public_cible || 'particulier', nom: p.nom, marque: p.marque, reference: p.reference,
      description: nettoyerDescriptionProduit(p.description),
      caracteristiques: carac.length ? carac : [{ cle: '', valeur: '' }],
      prix_unitaire_ht: prixARenseigner(p) ? '' : String(p.prix_unitaire_ht),
      unite: p.unite, tva_taux: p.tva_taux,
      eligible_mpr: p.eligible_mpr, eligible_cee: p.eligible_cee, fiche_cee: p.fiche_cee,
      actif: p.actif,
      zones_prix: (p.zones_prix || []).map(z => ({ zone: z.zone, prix_unitaire_ht: String(z.prix_unitaire_ht) })),
      forfait_pose_ht: String(p.forfait_pose_ht ?? ''), forfait_evacuation_ht: String(p.forfait_evacuation_ht ?? ''), forfait_consommables_ht: String(p.forfait_consommables_ht ?? ''),
    })
    setModalOpen(true)
  }

  function openDuplicate(p: Produit) {
    // Duplique un produit pour créer rapidement une variante de la même gamme
    // (même fournisseur/marque, mêmes caractéristiques de base à ajuster).
    setEditing(null)
    const carac = Object.entries(p.caracteristiques || {}).map(([cle, valeur]) => ({ cle, valeur: String(valeur) }))
    setForm({
      categorie: p.categorie, catalogue_groupe: (p.catalogue_groupe || (p.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) as GroupeCatalogue, public_cible: p.public_cible || 'particulier', nom: `${p.nom} (copie)`, marque: p.marque, reference: '',
      description: nettoyerDescriptionProduit(p.description),
      caracteristiques: carac.length ? carac : [{ cle: '', valeur: '' }],
      prix_unitaire_ht: prixARenseigner(p) ? '' : String(p.prix_unitaire_ht),
      unite: p.unite, tva_taux: p.tva_taux,
      eligible_mpr: p.eligible_mpr, eligible_cee: p.eligible_cee, fiche_cee: p.fiche_cee,
      actif: true,
      zones_prix: (p.zones_prix || []).map(z => ({ zone: z.zone, prix_unitaire_ht: String(z.prix_unitaire_ht) })),
      forfait_pose_ht: String(p.forfait_pose_ht ?? ''), forfait_evacuation_ht: String(p.forfait_evacuation_ht ?? ''), forfait_consommables_ht: String(p.forfait_consommables_ht ?? ''),
    })
    setModalOpen(true)
  }

  function setZonePrix(i: number, patch: Partial<{ zone: string; prix_unitaire_ht: string }>) {
    setForm(f => ({ ...f, zones_prix: f.zones_prix.map((z, idx) => idx === i ? { ...z, ...patch } : z) }))
  }
  function addZonePrix() {
    setForm(f => ({ ...f, zones_prix: [...f.zones_prix, { zone: '', prix_unitaire_ht: '' }] }))
  }
  function removeZonePrix(i: number) {
    setForm(f => ({ ...f, zones_prix: f.zones_prix.filter((_, idx) => idx !== i) }))
  }

  function setCarac(i: number, patch: Partial<CaracLigne>) {
    setForm(f => ({ ...f, caracteristiques: f.caracteristiques.map((c, idx) => idx === i ? { ...c, ...patch } : c) }))
  }
  function addCarac() {
    setForm(f => ({ ...f, caracteristiques: [...f.caracteristiques, { cle: '', valeur: '' }] }))
  }
  function removeCarac(i: number) {
    setForm(f => ({ ...f, caracteristiques: f.caracteristiques.filter((_, idx) => idx !== i) }))
  }

  // Fiche CEE active du formulaire (celle saisie, sinon celle de la catégorie) et contrôle en direct
  const ficheForm = form.eligible_cee ? (extraireFiche(form.fiche_cee) || FICHE_PAR_CATEGORIE[form.categorie] || null) : null
  const pointsForm = ficheForm ? pointsProduit({ fiche: ficheForm, marque: form.marque, reference: form.reference, caracteristiques: carObj(form.caracteristiques) }) : []
  const blocsForm = pointsForm.filter(x => x.gravite === 'bloc')
  const regleForm = ficheForm ? REGLES_FICHES[ficheForm] : null
  const mauvaisChamp = (c: string) => blocsForm.some(x => x.champ === c)
  const estChampFicheForm = (cle: string) => !!ficheForm && !!REGLES_FICHES[ficheForm]?.verifiee && estChampDeFiche(ficheForm, cle)
  const mprPossible = CATEGORIES_MPR_PAR_GESTE.includes(form.categorie)

  async function save() {
    if (!form.nom.trim()) return
    if (blocsForm.length > 0 && !window.confirm(`Ce produit ne respecte pas encore sa fiche ${ficheForm} (${blocsForm.length} point(s) à compléter) :\n\n${blocsForm.slice(0, 6).map(x => '• ' + x.message).join('\n')}\n\nUn devis aidé utilisant ce produit sera bloqué tant que ces données ne sont pas complétées. Enregistrer quand même ?`)) return
    setSaving(true)

    const caracteristiques = Object.fromEntries(
      form.caracteristiques.filter(c => c.cle.trim()).map(c => [c.cle.trim(), c.valeur])
    )
    if ((parseFloat(form.prix_unitaire_ht) || 0) > 0) delete caracteristiques.prix_a_renseigner
    if ((parseFloat(form.forfait_pose_ht) || 0) > 0) delete caracteristiques.forfait_pose_a_renseigner

    const payload = {
      categorie: form.categorie,
      catalogue_groupe: form.catalogue_groupe,
      public_cible: form.public_cible,
      nom: form.nom,
      marque: form.marque,
      reference: form.reference,
      description: nettoyerDescriptionProduit(form.description),
      caracteristiques,
      prix_unitaire_ht: parseFloat(form.prix_unitaire_ht) || 0,
      unite: form.unite,
      tva_taux: form.tva_taux,
      eligible_mpr: form.eligible_mpr,
      eligible_cee: form.eligible_cee,
      fiche_cee: form.fiche_cee,
      actif: form.actif,
      zones_prix: form.zones_prix
        .filter(z => z.zone.trim() && z.prix_unitaire_ht !== '')
        .map(z => ({ zone: z.zone.trim(), prix_unitaire_ht: parseFloat(z.prix_unitaire_ht) || 0 })),
      forfait_pose_ht: parseFloat(form.forfait_pose_ht) || 0,
      forfait_evacuation_ht: parseFloat(form.forfait_evacuation_ht) || 0,
      forfait_consommables_ht: parseFloat(form.forfait_consommables_ht) || 0,
    }

    const result = editing
      ? await supabase.from('catalogue_produits').update(payload).eq('id', editing.id)
      : await supabase.from('catalogue_produits').insert(payload)
    setSaving(false)
    if (result.error) { alert(`Enregistrement impossible : ${result.error.message}`); return }
    setModalOpen(false)
    fetchProduits()
  }

  async function toggleActif(p: Produit) {
    await supabase.from('catalogue_produits').update({ actif: !p.actif }).eq('id', p.id)
    fetchProduits()
  }

  async function remove(p: Produit) {
    if (!confirm(`Supprimer "${p.nom}" du catalogue ?`)) return
    await supabase.from('catalogue_produits').delete().eq('id', p.id)
    fetchProduits()
  }

  const euro = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

  const filtered = rows
    .filter(r => { const g = r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier'); return g === filtrePublic })
    .filter(r => filtrePublic !== 'visite_technique' || filtreVtPublic === 'tous' || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier') === filtreVtPublic)
    .filter(r => filtreCategorie === 'toutes' ? true : r.categorie === filtreCategorie)
    .filter(r => !CATEGORIES_FILTRE_MARQUE.includes(filtreCategorie) || filtreMarque === 'toutes' || (r.marque || '').trim() === filtreMarque)
    .filter(r => filtreAudit === 'aucun' || (filtreAudit === 'conformite' ? auditerProduit(r).length > 0 : auditerCommercialement(r).length > 0))
    .filter(r => {
      if (!recherche.trim()) return true
      const q = recherche.trim().toLowerCase()
      return [r.nom, r.marque, r.reference].some(v => (v || '').toLowerCase().includes(q))
    })

  // Regroupement par fournisseur/marque : permet de visualiser les gammes proposées
  // par chaque fabricant plutôt que par seule catégorie technique.
  const groupes = (() => {
    if (groupement === 'categorie') {
      const parCategorie = new Map<string, Produit[]>()
      for (const p of filtered) {
        const key = p.categorie
        if (!parCategorie.has(key)) parCategorie.set(key, [])
        parCategorie.get(key)!.push(p)
      }
      return Array.from(parCategorie.entries()).map(([key, produits]) => ({
        label: labelsCategories[key] || key, produits,
      }))
    }
    const parMarque = new Map<string, Produit[]>()
    for (const p of filtered) {
      const key = p.marque?.trim() || 'Sans fournisseur renseigné'
      if (!parMarque.has(key)) parMarque.set(key, [])
      parMarque.get(key)!.push(p)
    }
    return Array.from(parMarque.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, produits]) => ({ label, produits }))
  })()

  function exporterAuditCatalogue() {
    const entete = ['ID','Nom','Catégorie','Groupe','Marque','Référence','Fiche CEE','Éligible CEE','Éligible MPR','Description','Problèmes détectés']
    const lignes = rows.map(p => {
      const issues = auditerProduit(p)
      return [p.id, p.nom, labelsCategories[p.categorie] || p.categorie, p.catalogue_groupe || p.public_cible || '', p.marque || '', p.reference || '', ficheDuProduit(p) || p.fiche_cee || '', p.eligible_cee ? 'Oui' : 'Non', p.eligible_mpr ? 'Oui' : 'Non', nettoyerDescriptionProduit(p.description), issues.join(' | ')]
    }).filter((row, index) => auditerProduit(rows[index]).length > 0)
    const csv = [entete, ...lignes].map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `audit-reglementaire-catalogue-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  async function generateFicheTechnique(p: Produit) {
    const doc = new jsPDF()
    const euro = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
    try {
      const logo = await fetch('/pwa-512.png').then(r => r.blob()).then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob)
      }))
      doc.addImage(logo, 'PNG', 18, 14, 22, 22)
    } catch {}
    doc.setFontSize(20); doc.text('RENOVA OS', 46, 27)
    doc.setFontSize(10); doc.text('FICHE TECHNIQUE PRODUIT', 46, 34)
    doc.setDrawColor(210); doc.line(18, 43, 192, 43)
    doc.setFontSize(17); doc.text(p.nom || 'Produit', 18, 56)
    doc.setFontSize(10)
    let y = 66
    const meta = [['Marque', p.marque], ['Référence', p.reference], ['Catégorie', labelsCategories[p.categorie] || p.categorie], ['Unité', UNITES.find(u => u.value === p.unite)?.label || p.unite]]
    for (const [label, value] of meta) { if (value) { doc.setFont('helvetica','bold'); doc.text(`${label} :`, 18, y); doc.setFont('helvetica','normal'); doc.text(String(value), 55, y); y += 7 } }
    y += 3; doc.setFont('helvetica','bold'); doc.text('Description', 18, y); y += 7; doc.setFont('helvetica','normal')
    const desc = doc.splitTextToSize(nettoyerDescriptionProduit(p.description) || 'Aucune description renseignée.', 174); doc.text(desc, 18, y); y += desc.length * 5 + 8
    if (p.caracteristiques && Object.keys(p.caracteristiques).length) {
      doc.setFont('helvetica','bold'); doc.text('Caractéristiques techniques', 18, y); y += 7; doc.setFont('helvetica','normal')
      for (const [k,v] of Object.entries(p.caracteristiques)) { const lines=doc.splitTextToSize(`${k} : ${String(v)}`,174); doc.text(lines,18,y); y+=lines.length*5+2; if(y>270){doc.addPage();y=22} }
    }
    y += 5; doc.setFont('helvetica','bold'); doc.text('Éligibilité aux aides',18,y); y+=7; doc.setFont('helvetica','normal')
    doc.text(`MaPrimeRénov' : ${p.eligible_mpr ? 'Oui' : 'Non'}`,18,y); y+=6
    doc.text(`CEE : ${p.eligible_cee ? `Oui${p.fiche_cee ? ` — ${p.fiche_cee}` : ''}` : 'Non'}`,18,y)
    if (isAdmin) { y+=10; doc.setFont('helvetica','bold'); doc.text(`Tarif interne HT : ${prixARenseigner(p) ? 'À renseigner' : euro(Number(p.prix_unitaire_ht)||0)}`,18,y) }
    doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text(`Fiche générée le ${new Date().toLocaleDateString('fr-FR')} — Document technique RENOVA OS`,18,286)
    doc.save(`fiche-technique-${(p.nom||'produit').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()}.pdf`)
  }

  return (
    <div className="page rv">
      <div className="page-header">
        <div>
          <h1 className="page-title">Catalogue produits</h1>
          <p className="page-subtitle">Les produits et prestations que vous proposez, utilisés pour construire vos devis</p>
        </div>
        {isAdmin && <div className="page-actions">
          <Button variant="secondary" onClick={() => void ajouterCategorie(filtrePublic)}><Plus size={18} /> Ajouter une catégorie</Button>
          <Button variant="primary" onClick={openCreate}><Plus size={18} /> Ajouter un produit</Button>
        </div>}
      </div>

      <div className="toolbar" style={{ marginTop: 0 }}>
        <div className="chips">
          {([{ value: 'particulier', label: 'Particuliers' }, { value: 'professionnel', label: 'Professionnels' }, { value: 'visite_technique', label: 'Visites Techniques' }] as const).map(g => (
            <button key={g.value} className="chip" aria-pressed={filtrePublic === g.value} onClick={() => { setFiltrePublic(g.value); setFiltreCategorie('toutes'); setFiltreMarque('toutes'); if (g.value === 'visite_technique') setFiltreVtPublic('particulier') }}>
              {g.label}<small>{rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === g.value).length}</small>
            </button>
          ))}
        </div>
      </div>

      {filtrePublic === 'visite_technique' && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="fam">
            <b>Public des visites techniques</b>
            <div className="chips">
              <button className="chip" aria-pressed={filtreVtPublic === 'particulier'} onClick={() => { setFiltreVtPublic('particulier'); setFiltreCategorie('toutes') }}>Particuliers<small>{rows.filter(r => r.catalogue_groupe === 'visite_technique' && r.public_cible !== 'professionnel').length}</small></button>
              <button className="chip" aria-pressed={filtreVtPublic === 'professionnel'} onClick={() => { setFiltreVtPublic('professionnel'); setFiltreCategorie('toutes') }}>Professionnels<small>{rows.filter(r => r.catalogue_groupe === 'visite_technique' && r.public_cible === 'professionnel').length}</small></button>
              <button className="chip" aria-pressed={filtreVtPublic === 'tous'} onClick={() => { setFiltreVtPublic('tous'); setFiltreCategorie('toutes') }}>Tous les publics</button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <b>Audit conformité et données techniques du catalogue</b>
              <p className="note" style={{ margin: '5px 0 0' }}>
                {rows.length} produits chargés · {rows.filter(p => auditerProduit(p).length > 0).length} anomalies conformité/technique · {rows.filter(p => auditerCommercialement(p).length > 0).length} à compléter commercialement · {rows.filter(p => p.eligible_cee && !ficheDuProduit(p) && !estHorsChampBarEn104(p)).length} déclarés CEE sans fiche identifiable · {rows.filter(p => ficheDuProduit(p) && !REGLES_FICHES[ficheDuProduit(p)!]?.verifiee).length} avec règles non intégrées.
              </p>
            </div>
            <Button variant="secondary" onClick={exporterAuditCatalogue}><FileText size={16} /> Exporter l’audit CSV</Button>
          </div>
          <p className="note" style={{ margin: '8px 0 0' }}>
            L’audit repère les informations manquantes ou douteuses sans fabriquer de valeurs réglementaires. Les exigences non intégrées doivent être vérifiées sur la fiche officielle applicable avant de déclarer un produit conforme.
          </p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 14 }}>
        {sectionsAffichees.map(section => (
          <div key={section.label} className="fam">
            <b>{section.label}</b>
            <div className="chips">
              {section.categories.map((c: any) => {
                const count = rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === filtrePublic && r.categorie === c.value).length
                return <button key={c.value} className="chip" aria-pressed={filtreCategorie === c.value} onClick={() => { setFiltreCategorie(c.value); setFiltreMarque('toutes') }}>{c.label}<small>{count}</small></button>
              })}
            </div>
          </div>
        ))}
        <button className="chip" aria-pressed={filtreCategorie === 'toutes'} onClick={() => { setFiltreCategorie('toutes'); setFiltreMarque('toutes') }}>
          Tout afficher<small>{rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === filtrePublic).length}</small>
        </button>
      </div>

      {CATEGORIES_FILTRE_MARQUE.includes(filtreCategorie) && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <div className="fam">
            <b>Filtrer par marque</b>
            <div className="chips">
              <button className="chip" aria-pressed={filtreMarque === 'toutes'} onClick={() => setFiltreMarque('toutes')}>
                Toutes les marques<small>{rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === filtrePublic && r.categorie === filtreCategorie).length}</small>
              </button>
              {[...new Set(rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === filtrePublic && r.categorie === filtreCategorie && (r.marque || '').trim()).map(r => r.marque.trim()))].sort((a, b) => a.localeCompare(b, 'fr')).map(marque => (
                <button key={marque} className="chip" aria-pressed={filtreMarque === marque} onClick={() => setFiltreMarque(marque)}>
                  {marque}<small>{rows.filter(r => (r.catalogue_groupe || (r.public_cible === 'professionnel' ? 'professionnel' : 'particulier')) === filtrePublic && r.categorie === filtreCategorie && (r.marque || '').trim() === marque).length}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="toolbar" style={{ marginTop: 0 }}>
        <span style={{ position: 'relative', display: 'inline-flex', flex: 1, maxWidth: 400 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: 12, color: 'var(--rv-mute)' }} />
          <input className="search" style={{ paddingLeft: 32, width: '100%' }} placeholder="Rechercher un produit, une marque, une référence…" value={recherche} onChange={e => setRecherche(e.target.value)} />
        </span>
        <button className="chip" aria-pressed={filtreAudit === 'conformite'} onClick={() => setFiltreAudit(v => v === 'conformite' ? 'aucun' : 'conformite')} title="Filtrer les anomalies techniques et réglementaires, sans tenir compte des prix ni des forfaits de pose">
          <ShieldCheck size={13} style={{ verticalAlign: -2, marginRight: 5 }} />À auditer — conformité<small>{rows.filter(r => auditerProduit(r).length > 0).length}</small>
        </button>
        <button className="chip" aria-pressed={filtreAudit === 'commercial'} onClick={() => setFiltreAudit(v => v === 'commercial' ? 'aucun' : 'commercial')} title="Filtrer séparément les produits dont le prix de fourniture ou le forfait de pose reste à renseigner/confirmer">
          <FileText size={13} style={{ verticalAlign: -2, marginRight: 5 }} />À compléter — tarifs<small>{rows.filter(r => auditerCommercialement(r).length > 0).length}</small>
        </button>
        <div className="spacer" />
        <div className="chips">
          <button className="chip" aria-pressed={groupement === 'categorie'} onClick={() => setGroupement('categorie')} title="Grouper par catégorie technique">Par catégorie</button>
          <button className="chip" aria-pressed={groupement === 'fournisseur'} onClick={() => setGroupement('fournisseur')} title="Grouper par fournisseur / marque">Par fournisseur</button>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-pad text-muted">Chargement…</div></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={40} />
            <h3>{rows.length === 0 ? 'Catalogue vide' : 'Aucun résultat'}</h3>
            <p>{rows.length === 0 ? 'Ajoutez vos produits et prestations pour pouvoir construire des devis.' : 'Aucun produit ne correspond à cette recherche.'}</p>
            {rows.length === 0 && (
              <Button variant="primary" onClick={openCreate}>
                <Plus size={18} /> Ajouter un produit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groupes.map(groupe => (
            <section className="panel" key={groupe.label} style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 4px' }}>
                <h2 className="rv-h" style={{ margin: 0 }}>{groupe.label}</h2>
                <span className="pill n">{groupe.produits.length} produit{groupe.produits.length > 1 ? 's' : ''}</span>
              </div>
              <div className="scroll">
                <table className="cat">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      {groupement === 'fournisseur' && <th>Catégorie</th>}
                      <th>Fiche</th>
                      <th>Conformité à la fiche</th>
                      {isAdmin && <th>Prix HT</th>}
                      {isAdmin && <th>Pose HT</th>}
                      {isAdmin && <th>Consommables HT</th>}
                      <th>TVA</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupe.produits.map(p => {
                      const st = statutProduit(p)
                      const fiche = ficheDuProduit(p)
                      return (
                        <tr key={p.id} className={`row ${p.actif ? '' : 'off'}`}>
                          <td>
                            <div className="pn">{p.nom}
                              <small>{[p.marque, p.reference].filter(Boolean).join(' · ') || '—'}{p.zones_prix && p.zones_prix.length > 0 ? ` · ${p.zones_prix.length} zone${p.zones_prix.length > 1 ? 's' : ''} tarifaire${p.zones_prix.length > 1 ? 's' : ''}` : ''}</small>
                            </div>
                          </td>
                          {groupement === 'fournisseur' && <td>{labelsCategories[p.categorie] || p.categorie}</td>}
                          <td>
                            {fiche ? <span className="pill">{fiche}</span> : <span className="pill n">Hors CEE</span>}
                            {p.eligible_mpr && <> <span className="pill g">MaPrimeRénov’</span></>}
                          </td>
                          <td>
                            {st.kind === 'aucun' && <span className="note">Sans contrôle de fiche</span>}
                            {st.kind !== 'aucun' && (
                              <button className="iconbtn" style={{ padding: 0 }} onClick={() => setFicheDetail(p)} title="Voir le contrôle de la fiche">
                                {st.kind === 'non_integre' && <span className="pill n" title="Fiche non intégrée au moteur : contrôle manuel à réaliser sur la fiche officielle. N'est pas comptée dans « À auditer ».">Règles non intégrées — contrôle manuel</span>}
                                {st.kind === 'a_completer' && <span className="pill w">{st.blocs} à compléter</span>}
                                {st.kind === 'conforme' && <span className="pill g">Conforme</span>}
                              </button>
                            )}
                          </td>
                          {isAdmin && <td className="num">{prixARenseigner(p) ? 'À renseigner' : euro(p.prix_unitaire_ht)} <span className="note">/ {UNITES.find(u => u.value === p.unite)?.label || p.unite}</span></td>}
                          {isAdmin && <td className="num">{Number(p.forfait_pose_ht) > 0 ? euro(p.forfait_pose_ht) : 'À renseigner'}</td>}
                          {isAdmin && <td className="num">{Number(p.forfait_consommables_ht) > 0 ? euro(Number(p.forfait_consommables_ht)) : 'À renseigner'}</td>}
                          <td className="num">{p.tva_taux} %</td>
                          <td>
                            <button className={`pill ${p.actif ? 'g' : 'n'}`} onClick={() => toggleActif(p)} style={{ cursor: 'pointer', border: 'none' }}>{p.actif ? 'Actif' : 'Inactif'}</button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                              <button className="iconbtn" onClick={() => generateFicheTechnique(p)} title="Télécharger la fiche technique"><FileText size={16} /></button>
                              {isAdmin && <>
                                <button className="iconbtn" onClick={() => openDuplicate(p)} title="Dupliquer (nouvelle variante de cette gamme)"><Copy size={16} /></button>
                                <button className="iconbtn" onClick={() => openEdit(p)} title="Modifier"><Pencil size={16} /></button>
                                <button className="iconbtn" onClick={() => remove(p)} title="Supprimer"><Trash2 size={16} /></button>
                              </>}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <Drawer
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eyebrow={editing ? 'Catalogue produits' : 'Nouveau produit'}
        title={editing ? (form.nom || 'Modifier le produit') : 'Ajouter un produit'}
        badges={<>
          {ficheForm ? <span className="pill">{ficheForm}</span> : <span className="pill n">Hors CEE</span>}
          {form.eligible_mpr && <span className="pill g">MaPrimeRénov’</span>}
          <span className={`pill ${form.actif ? 'g' : 'n'}`}>{form.actif ? 'Actif' : 'Inactif'}</span>
        </>}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
          </>
        }
      >
        <section className="panel sect">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid grid-2">
            <label className="field">
              <span>Catégorie</span>
              <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
                {categoriesAffichees.filter(c => categorieCompatibleGroupe(c, form.catalogue_groupe)).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Nom du produit *</span>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="ex: PAC Daikin Altherma 3" />
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Famille du catalogue</span>
              <select value={form.catalogue_groupe} onChange={e => setForm(f => { const catalogue_groupe = e.target.value as GroupeCatalogue; const options = categoriesAffichees.filter(c => categorieCompatibleGroupe(c, catalogue_groupe)); const categorie = options.some(c => c.value === f.categorie) ? f.categorie : (options[0]?.value || 'autre'); const public_cible = catalogue_groupe === 'professionnel' ? 'professionnel' : 'particulier'; return { ...f, catalogue_groupe, public_cible, categorie } })}>
                <option value="particulier">Particuliers</option><option value="professionnel">Professionnels</option><option value="visite_technique">Visites Techniques</option>
              </select>
            </label>
            <label className="field">
              <span>Public du devis</span>
              <select value={form.public_cible} onChange={e => setForm(f => ({ ...f, public_cible: e.target.value as FormState['public_cible'] }))}>
                <option value="particulier">Particulier</option><option value="professionnel">Professionnel</option>{form.catalogue_groupe !== 'visite_technique' && <option value="tous">Tous publics</option>}
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Marque{form.eligible_cee ? ' *' : ''}</span>
              <input style={mauvaisChamp('marque') ? { borderColor: '#dc2626', background: '#fef2f2' } : undefined} value={form.marque} onChange={e => setForm(f => ({ ...f, marque: e.target.value }))} placeholder="ex: Daikin" />
            </label>
            <label className="field">
              <span>Référence fabricant{form.eligible_cee ? ' *' : ''}</span>
              <input style={mauvaisChamp('reference') ? { borderColor: '#dc2626', background: '#fef2f2' } : undefined} value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="ex: ETSX16P50D" />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description commerciale du produit" />
          </label>


          {ficheForm && (
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>
                Caractéristiques exigées par la fiche {ficheForm}
                <span className="text-sm text-muted" style={{ fontWeight: 400 }}> — reprises sur le devis, contrôlées à l'ajout au devis</span>
              </div>
              <LigneFicheFields fiche={ficheForm} surLigne={false} ouvert caracteristiques={carObj(form.caracteristiques)}
                onChange={next => setForm(f => ({ ...f, caracteristiques: [...carList(next), { cle: '', valeur: '' }] }))} />
            </div>
          )}

          {form.categorie === 'menuiseries_portes' && (
            <label className="field">
              <span>Coefficient Ud (W/m².K) — porte d’entrée</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={String(carObj(form.caracteristiques).Ud_W_m2K ?? '')}
                onChange={e => setForm(f => ({
                  ...f,
                  caracteristiques: [
                    ...f.caracteristiques.filter(c => c.cle !== 'Ud_W_m2K'),
                    { cle: 'Ud_W_m2K', valeur: e.target.value },
                  ],
                }))}
                placeholder="Ex. 1,1"
              />
              <span className="text-sm text-muted">Critère technique propre aux portes d’entrée. Il ne rend pas une porte d’entrée éligible à BAR-EN-104, qui concerne les fenêtres et portes-fenêtres.</span>
            </label>
          )}
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>
              Autres caractéristiques techniques
              <span className="text-sm text-muted" style={{ fontWeight: 400 }}> — affichées sur le devis mono-geste</span>
            </div>
            {form.caracteristiques.map((c, i) => estChampFicheForm(c.cle) ? null : (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input placeholder="ex: COP" value={c.cle} onChange={e => setCarac(i, { cle: e.target.value })} style={{ flex: 1 }} />
                <input placeholder="ex: 4,2" value={c.valeur} onChange={e => setCarac(i, { valeur: e.target.value })} style={{ flex: 1 }} />
                <button className="btn-icon" onClick={() => removeCarac(i)} title="Retirer"><X size={16} /></button>
              </div>
            ))}
            <button className="btn btn-sm btn-secondary" onClick={addCarac}>
              <Plus size={14} /> Ajouter une caractéristique
            </button>
            <div className="text-sm text-muted mt-2">
              Exemples selon la catégorie : COP, SCOP, puissance (kW), R (m².K/W), Uw (W/m².K),
              rendement (%), classe énergétique, niveau sonore (dB)...
            </div>
          </div>

          <div className="grid grid-3">
            <label className="field">
              <span>Prix unitaire HT *</span>
              <input type="number" step="0.01" value={form.prix_unitaire_ht} onChange={e => setForm(f => ({ ...f, prix_unitaire_ht: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Unité</span>
              <select value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}>
                {UNITES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>TVA</span>
              <select value={form.tva_taux} onChange={e => setForm(f => ({ ...f, tva_taux: parseFloat(e.target.value) }))}>
                {TVA_TAUX.map(t => <option key={t} value={t}>{t}%</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-2">
            <label className="field">
              <span>Forfait pose HT (par {UNITES.find(u => u.value === form.unite)?.label.toLowerCase() || 'unité'})</span>
              <input type="number" step="0.01" value={form.forfait_pose_ht} onChange={e => setForm(f => ({ ...f, forfait_pose_ht: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="field">
              <span>Forfait évacuation des déchets HT (par {UNITES.find(u => u.value === form.unite)?.label.toLowerCase() || 'unité'})</span>
              <input type="number" step="0.01" value={form.forfait_evacuation_ht} onChange={e => setForm(f => ({ ...f, forfait_evacuation_ht: e.target.value }))} placeholder="0.00" />
            </label>
          </div>
          <label className="field">
            <span>Coût des consommables HT (par {UNITES.find(u => u.value === form.unite)?.label.toLowerCase() || 'unité'})</span>
            <input type="number" min="0" step="0.01" value={form.forfait_consommables_ht} onChange={e => setForm(f => ({ ...f, forfait_consommables_ht: e.target.value }))} placeholder="0.00" />
          </label>
          <p className="text-xs text-muted mb-2" style={{ marginTop: -8 }}>
            Les forfaits de pose, d’évacuation et de consommables renseignés sont ajoutés automatiquement en lignes séparées au devis, sans modifier le prix du matériel.
          </p>

          <div className="grid grid-2">
            <label className="checkbox-field">
              <input type="checkbox" checked={form.eligible_mpr} onChange={e => setForm(f => ({ ...f, eligible_mpr: e.target.checked }))} />
              <span>Éligible MaPrimeRénov'</span>
            </label>
            <label className="checkbox-field">
              <input type="checkbox" checked={form.eligible_cee} onChange={e => setForm(f => ({ ...f, eligible_cee: e.target.checked, fiche_cee: e.target.checked && !f.fiche_cee ? (FICHE_PAR_CATEGORIE[f.categorie] || '') : f.fiche_cee }))} />
              <span>Éligible CEE</span>
            </label>
          </div>

          {form.eligible_cee && (
            <label className="field">
              <span>Fiche CEE de référence</span>
              <input list="fiches-cee" value={form.fiche_cee} onChange={e => setForm(f => ({ ...f, fiche_cee: e.target.value }))} placeholder="ex: BAR-TH-171" />
              <datalist id="fiches-cee">{Object.entries(REGLES_FICHES).map(([code, r]) => <option key={code} value={code}>{r.nom}</option>)}</datalist>
            </label>
          )}

          {form.eligible_mpr && !mprPossible && (
            <div className="status no" style={{ margin: 0 }}>
              D'après les règles Anah au 01/09/2026, MaPrimeRénov' « par geste » ne concerne plus cette catégorie (seulement PAC air/eau, PAC géothermique, réseau de chaleur, dépose de cuve fioul, audit). Votre barème interne reste appliqué dans les devis ; à confirmer auprès de l'Anah / France Rénov'. Les CEE restent possibles.
            </div>
          )}

          {ficheForm && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="grp-head"><h3>Contrôle de la fiche {ficheForm}</h3>
                {regleForm?.verifiee ? <span className={`pill ${blocsForm.length ? 'w' : 'g'}`}>{blocsForm.length ? `${blocsForm.length} à compléter` : 'Conforme'}</span> : <span className="pill">Règles non intégrées</span>}
              </div>
              {pointsForm.length === 0 && regleForm?.verifiee && <div className="status ok">Ce produit respecte les critères de la fiche.</div>}
              {pointsForm.map((x, i) => <div key={i} className="check"><span className={`dot ${x.gravite === 'bloc' ? 'no' : 'inf'}`}>{x.gravite === 'bloc' ? '!' : 'i'}</span><div>{x.message}</div></div>)}
            </div>
          )}


          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Prix par zone géographique (optionnel)</div>
            <p className="text-xs text-muted mb-2">
              Remplace le prix de base pour les prospects situés dans le département indiqué (ex: coût de
              transport différent, tarif régional). Sans dérogation, le prix de base s'applique partout.
            </p>
            {form.zones_prix.map((z, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  placeholder="Département (ex: 75)"
                  value={z.zone}
                  maxLength={3}
                  onChange={e => setZonePrix(i, { zone: e.target.value })}
                  style={{ width: 130 }}
                />
                <input
                  type="number"
                  placeholder="Prix HT (€)"
                  value={z.prix_unitaire_ht}
                  onChange={e => setZonePrix(i, { prix_unitaire_ht: e.target.value })}
                  style={{ width: 130 }}
                />
                <button type="button" className="btn-icon" onClick={() => removeZonePrix(i)} title="Supprimer cette zone">
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addZonePrix}>
              <Plus size={14} /> Ajouter une zone tarifaire
            </button>
          </div>

          <label className="checkbox-field">
            <input type="checkbox" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
            <span>Produit actif (visible dans les devis)</span>
          </label>
        </div>
        </section>
      </Drawer>

      <Drawer
        open={!!ficheDetail}
        onClose={() => setFicheDetail(null)}
        eyebrow="Contrôle de la fiche"
        title={ficheDetail ? ficheDetail.nom : ''}
        badges={ficheDetail ? <>{ficheDuProduit(ficheDetail) ? <span className="pill">{ficheDuProduit(ficheDetail)}</span> : <span className="pill n">Hors CEE</span>}</> : undefined}
        footer={<>
          {isAdmin && ficheDetail && <Button variant="secondary" onClick={() => { const p = ficheDetail; setFicheDetail(null); openEdit(p) }}><Pencil size={15} /> Compléter le produit</Button>}
          <Button variant="primary" onClick={() => setFicheDetail(null)}>Fermer</Button>
        </>}
      >
        {ficheDetail && (() => {
          const fiche = ficheDuProduit(ficheDetail)!
          const R = REGLES_FICHES[fiche]
          const pts = pointsProduit({ fiche, marque: ficheDetail.marque, reference: ficheDetail.reference, caracteristiques: ficheDetail.caracteristiques })
          const blocs = pts.filter(x => x.gravite === 'bloc')
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!R?.verifiee
                ? <div className="status" style={{ background: '#eff6ff', color: '#1e40af' }}>Les règles de {fiche} ne sont pas intégrées à l'outil. Contrôle manuel sur <a href={R?.src || '#'} target="_blank" rel="noopener noreferrer">le texte officiel</a>.</div>
                : <div className={`status ${blocs.length ? 'no' : 'ok'}`}>{blocs.length ? `${blocs.length} point(s) à compléter avant de pouvoir utiliser ce produit sur un devis aidé` : 'Ce produit respecte les critères de la fiche.'}</div>}
              {blocs.map((x, i) => <div key={i} className="check"><span className="dot no">!</span><div>{x.message}</div></div>)}
              {R && (
                <div className="text-sm" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><b>Fiche</b> {fiche} — {R.nom} · version {R.version}</div>
                  {R.preuve && <div><b>Sur le devis et la facture</b> {R.preuve}</div>}
                  {R.pieces && <div><b>Pièces à conserver</b> {R.pieces}</div>}
                  <div><b>Qualification exigée</b> {R.qualif}</div>
                  {R.cumul.length > 0 && <div><b>Non cumulable avec</b> {R.cumul.join(', ')}</div>}
                  {R.vie && <div><b>Durée de vie conventionnelle</b> {R.vie} ans</div>}
                  <div><a href={R.src} target="_blank" rel="noopener noreferrer">Ouvrir la fiche officielle</a> <span className="text-muted">· règles relevées le {DATE_REGLES}</span></div>
                </div>
              )}
            </div>
          )
        })()}
      </Drawer>
    </div>
  )
}
