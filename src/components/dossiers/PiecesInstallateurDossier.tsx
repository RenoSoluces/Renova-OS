import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Circle, Download, FileUp, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { uploadDocument } from '../../lib/storage/uploadDocument'
import { resolveDocumentUrl } from '../../lib/storage/documentUrl'
import { genererModelePDF } from '../../lib/pdf/genererModelePDF'
import { chargerLogoRenoSoluces, genererFicheProduit, RENO_SOLUCES } from '../../lib/pdf/ficheTechniquePDF'
import { useTypeOrganisation } from '../../lib/organisation/useTypeOrganisation'
import { MODELES, piecesAttendues, remplirModele, type CodePiece, type ContexteTravaux, type VariablesModele } from '../../lib/documents/modelesAdministratifs'

interface Props {
  dossier: { id: string; reference?: string | null; devis_id?: string | null; prospect?: any }
  lecture?: boolean
}

const CATEGORIE_PIECE = (code: CodePiece) => `Pièce installateur — ${code}`
const dateFr = (d = new Date()) => d.toLocaleDateString('fr-FR')
const euro = (n: unknown) => `${(Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

interface LigneDevis { designation: string; produit_id: string | null; produit?: { id: string; nom: string; marque: string | null; reference: string | null; description: string | null; caracteristiques: Record<string, string | number> | null; categorie: string | null; eligible_mpr: boolean | null; eligible_cee: boolean | null; fiche_cee: string | null } | null }

/** Dossier de pièces attendu pour un chantier : devis, mandats, cadre CEE, TVA, fiches techniques. */
export function PiecesInstallateurDossier({ dossier, lecture }: Props) {
  const typeOrg = useTypeOrganisation()
  const [devis, setDevis] = useState<any>(null)
  const [lignes, setLignes] = useState<LigneDevis[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [fiches, setFiches] = useState<Record<string, boolean>>({})
  const [occupe, setOccupe] = useState('')
  const [message, setMessage] = useState('')
  const fichierRef = useRef<HTMLInputElement>(null)
  const [codeImport, setCodeImport] = useState<CodePiece | null>(null)

  const charger = useCallback(async () => {
    const [{ data: d }, { data: l }, { data: documents }] = await Promise.all([
      dossier.devis_id ? supabase.from('devis').select('*').eq('id', dossier.devis_id).maybeSingle() : Promise.resolve({ data: null }),
      dossier.devis_id ? supabase.from('devis_lignes').select('designation,produit_id,produit:catalogue_produits(id,nom,marque,reference,description,caracteristiques,categorie,eligible_mpr,eligible_cee,fiche_cee)').eq('devis_id', dossier.devis_id).order('ordre') : Promise.resolve({ data: [] }),
      supabase.from('documents').select('id,nom,categorie,url,produit_id,created_at').eq('dossier_id', dossier.id).like('categorie', 'Pièce installateur%').order('created_at', { ascending: false }),
    ])
    setDevis(d); setLignes(((l || []) as any[]).map(x => ({ ...x, produit: Array.isArray(x.produit) ? x.produit[0] : x.produit })))
    setDocs(documents || [])
    const ids = [...new Set(((l || []) as any[]).map(x => x.produit_id).filter(Boolean))] as string[]
    if (ids.length) {
      const { data: f } = await supabase.from('documents').select('produit_id').in('produit_id', ids).like('categorie', 'Fiche technique%')
      const ok: Record<string, boolean> = {}
      for (const x of f || []) if (x.produit_id) ok[x.produit_id] = true
      setFiches(ok)
    } else setFiches({})
  }, [dossier.id, dossier.devis_id])
  useEffect(() => { void charger() }, [charger])

  const contexte: ContexteTravaux = useMemo(() => ({
    lignes: lignes.map(x => ({ designation: x.designation, categorie: x.produit?.categorie, eligible_mpr: x.produit?.eligible_mpr, eligible_cee: x.produit?.eligible_cee, fiche_cee: x.produit?.fiche_cee })),
    categorieMpr: dossier.prospect?.categorie_mpr, fichesCee: dossier.prospect?.fiches_cee,
  }), [lignes, dossier.prospect])
  const attendues = useMemo(() => piecesAttendues(contexte), [contexte])

  const p = dossier.prospect || {}
  const variables: Partial<VariablesModele> = {
    client_civilite: p.civilite, client_nom: p.nom, client_prenom: p.prenom, client_adresse: p.adresse_rue || p.adresse, client_cp: p.code_postal, client_ville: p.ville,
    client_email: p.email, client_tel: p.telephone,
    installateur_nom: devis?.emetteur_raison_sociale || devis?.emetteur_nom_affichage, installateur_siret: devis?.emetteur_siret,
    installateur_adresse: [devis?.emetteur_adresse, devis?.emetteur_code_postal, devis?.emetteur_ville].filter(Boolean).join(' '),
    installateur_email: devis?.emetteur_email, installateur_tel: devis?.emetteur_telephone,
    dossier_reference: dossier.reference || '', devis_numero: devis?.numero, montant_ht: euro(devis?.montant_ht), montant_ttc: euro(devis?.montant_ttc),
    travaux: lignes.map(x => x.designation).filter(Boolean).slice(0, 6).join(', '),
    fiches_cee: [...new Set([...(p.fiches_cee || []), ...lignes.map(x => x.produit?.fiche_cee).filter(Boolean) as string[]])].join(', '),
    categorie_mpr: p.categorie_mpr || '', date: dateFr(), ville: devis?.emetteur_ville || p.ville,
  }

  const doc = (code: CodePiece) => docs.find(d => d.categorie === CATEGORIE_PIECE(code))
  async function ouvrir(d: any) { const u = await resolveDocumentUrl(d.url); if (u) window.open(u, '_blank', 'noopener') }

  async function generer(code: Exclude<CodePiece, 'devis' | 'fiches_techniques'>) {
    setOccupe(code); setMessage('')
    const m = MODELES[code]
    const blob = genererModelePDF({ titre: m.titre, corps: remplirModele(m.corps, variables), reference: `Dossier ${dossier.reference || ''} - devis ${devis?.numero || ''}`.trim(), emetteur: variables.installateur_nom })
    const fichier = new File([blob], `${m.titre.replace(/[^\w]+/g, '_')}.pdf`, { type: 'application/pdf' })
    const { error } = await uploadDocument(fichier, { dossierId: dossier.id, categorie: CATEGORIE_PIECE(code), type: 'pdf' })
    setOccupe(''); setMessage(error ? `Génération impossible : ${error}` : `${m.titre} généré — à faire signer.`)
    void charger()
  }

  async function importer(file?: File) {
    if (!file || !codeImport) return
    setOccupe(codeImport); setMessage('')
    const { error } = await uploadDocument(file, { dossierId: dossier.id, categorie: CATEGORIE_PIECE(codeImport), type: file.name.split('.').pop() || 'pdf' })
    setOccupe(''); setMessage(error ? `Import impossible : ${error}` : 'Document importé.')
    setCodeImport(null); if (fichierRef.current) fichierRef.current.value = ''
    void charger()
  }

  async function genererFiche(l: LigneDevis) {
    if (!l.produit) return
    setOccupe(l.produit.id); setMessage('')
    const fichier = new File([genererFicheProduit(l.produit as any, typeOrg === 'partenaire' ? { nom: 'Fiche produit' } : { ...RENO_SOLUCES, logo: await chargerLogoRenoSoluces() })], `Fiche_${l.produit.nom.replace(/[^\w]+/g, '_')}.pdf`, { type: 'application/pdf' })
    const { error } = await uploadDocument(fichier, { categorie: 'Fiche technique — Particuliers', produitId: l.produit.id, type: 'pdf' })
    setOccupe(''); setMessage(error ? `Génération impossible : ${error}` : 'Fiche générée depuis le catalogue (à remplacer par celle du fabricant dès que possible).')
    void charger()
  }

  const produitsDevis = [...new Map(lignes.filter(x => x.produit).map(x => [x.produit!.id, x])).values()]
  const fichesManquantes = produitsDevis.filter(x => !fiches[x.produit!.id])
  const fait = (code: CodePiece) => code === 'devis' ? devis?.signature_statut === 'signe' : code === 'fiches_techniques' ? produitsDevis.length > 0 && fichesManquantes.length === 0 : !!doc(code)
  const manquantes = attendues.filter(a => a.obligatoire && !fait(a.code)).length

  if (!dossier.devis_id) return null
  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div className="font-semibold" style={{ marginBottom: 2 }}>Pièces du dossier</div>
      <div className="text-sm text-muted" style={{ marginBottom: 12 }}>
        {manquantes > 0 ? `${manquantes} pièce${manquantes > 1 ? 's' : ''} obligatoire${manquantes > 1 ? 's' : ''} à compléter.` : 'Toutes les pièces obligatoires sont réunies.'} La liste dépend des travaux du devis.
      </div>
      <input ref={fichierRef} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={e => void importer(e.target.files?.[0])} />
      <ul className="pieces-liste">
        {attendues.map(a => {
          const d = a.code === 'devis' || a.code === 'fiches_techniques' ? null : doc(a.code)
          const m = a.generable ? MODELES[a.code as keyof typeof MODELES] : null
          return (
            <li key={a.code}>
              <span className={fait(a.code) ? 'ok' : 'ko'}>{fait(a.code) ? <CheckCircle2 size={18} /> : <Circle size={18} />}</span>
              <div>
                <b>{a.libelle}</b>{!a.obligatoire && <small> · si nécessaire</small>}
                <small>{a.raison}{a.officiel ? ` Formulaire à privilégier : ${a.officiel}.` : ''}</small>
                {m?.avertissement && !d && <small className="pieces-avert"><AlertTriangle size={12} /> {m.avertissement}</small>}
                {a.code === 'devis' && !fait(a.code) && <small className="pieces-avert">Le devis n'est pas encore signé.</small>}
                {a.code === 'fiches_techniques' && produitsDevis.length > 0 && (
                  <small>{produitsDevis.length - fichesManquantes.length}/{produitsDevis.length} produits ont une fiche.
                    {fichesManquantes.map(x => (
                      <span key={x.produit!.id} className="pieces-fiche">
                        {' '}· {x.produit!.nom}{!lecture && <button type="button" className="lien" disabled={!!occupe} onClick={() => void genererFiche(x)}>générer depuis le catalogue</button>}
                      </span>
                    ))}
                  </small>
                )}
              </div>
              {a.generable && !lecture && (
                <div className="pieces-actions">
                  {d && <Button variant="ghost" size="sm" onClick={() => void ouvrir(d)}><Download size={14} /> Ouvrir</Button>}
                  <Button variant={d ? 'ghost' : 'primary'} size="sm" disabled={!!occupe} onClick={() => void generer(a.code as any)}><FileText size={14} /> {d ? 'Régénérer' : 'Générer'}</Button>
                  <Button variant="ghost" size="sm" disabled={!!occupe} onClick={() => { setCodeImport(a.code); fichierRef.current?.click() }}><FileUp size={14} /> Importer le signé</Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {message && <p className="text-sm text-muted" role="status" style={{ marginBottom: 0 }}>{message}</p>}
    </div>
  )
}
