import { supabase } from '../supabase'
import { numeroDevis } from './numeroDevis'
import { produitVisiteById } from '../3cl/produitsVisite'
import { prixProduitPourZone } from '../catalogue/prixParZone'
import { estimerQuantiteTravaux } from '../3cl/analyse/estimerQuantiteTravaux'
import type { Batiment3CL } from '../3cl/batiment3CL'
import type { PropositionTravaux } from '../3cl/analyse/proposerTravaux'
import { entrepriseCourante } from '../organisation/entrepriseCourante'


export interface CreerDevisDepuisTravauxParams {
  prospectId: string
  visiteId?: string | null
  batiment: Batiment3CL
  travaux: PropositionTravaux[]
  /** Petit mot de contexte inséré dans les notes du devis (ex: "visite technique", "simulation 3CL") */
  origine: string
}

export interface CreerDevisResultat {
  devisId: string | null
  error: string | null
}

/**
 * Crée un devis pré-rempli à partir d'une liste de travaux recommandés (moteur 3CL).
 * Pour chaque geste, cherche le produit le moins cher de la bonne catégorie dans le
 * catalogue commercial afin d'utiliser un vrai prix ; si aucun produit n'existe encore
 * dans cette catégorie, la ligne est créée à 0€, à compléter manuellement.
 */
export async function creerDevisDepuisTravaux(params: CreerDevisDepuisTravauxParams): Promise<CreerDevisResultat> {
  const { prospectId, visiteId, batiment, travaux, origine } = params
  if (!prospectId || travaux.length === 0) return { devisId: null, error: 'Aucun travaux sélectionné.' }

  const { data: entreprise } = await entrepriseCourante('id, devis_duree_validite_jours, devis_conditions_paiement_defaut')
  const { data: prospect } = await supabase.from('prospects').select('code_postal').eq('id', prospectId).maybeSingle()

  const categoriesRecherchees = [...new Set(
    travaux.map(t => produitVisiteById(t.id)?.categorieDevis).filter(Boolean) as string[]
  )]
  const { data: produitsCatalogue } = await supabase
    .from('catalogue_produits')
    .select('*')
    .eq('actif', true)
    .in('categorie', categoriesRecherchees)
    .order('prix_unitaire_ht')

  const produitParCategorie = new Map<string, any>()
  for (const p of produitsCatalogue || []) {
    if (!produitParCategorie.has(p.categorie)) produitParCategorie.set(p.categorie, p)
  }

  const { data: devis, error } = await supabase.from('devis').insert({
    entreprise_id: entreprise?.id || null,
    prospect_id: prospectId,
    visite_id: visiteId || null,
    numero: numeroDevis(),
    statut: 'brouillon',
    type_operation: travaux.length > 1 ? 'renovation_ampleur' : 'mono_geste',
    date_validite: new Date(Date.now() + (entreprise?.devis_duree_validite_jours ?? 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    conditions_paiement: entreprise?.devis_conditions_paiement_defaut || '',
    notes: `Devis pré-rempli à partir d'une ${origine}.`,
  }).select('id').single()

  if (error || !devis) return { devisId: null, error: error?.message || 'Erreur lors de la création du devis.' }

  const { error: lignesError } = await supabase.from('devis_lignes').insert(travaux.map((t, i) => {
    const categorie = produitVisiteById(t.id)?.categorieDevis || 'autre'
    const produit = produitParCategorie.get(categorie)
    const quantite = produit && produit.unite === 'm2' ? estimerQuantiteTravaux(t.id, batiment) : 1
    const prixApplicable = produit ? prixProduitPourZone(produit, prospect?.code_postal) : 0
    return {
      devis_id: devis.id,
      produit_id: produit?.id || null,
      designation: produit?.nom || t.titre,
      description: produit?.description || `${t.description} — gain estimé : -${t.gainPourcentage}% (${t.etiquetteAvant} → ${t.etiquetteApres})`,
      caracteristiques: produit?.caracteristiques || { categorie, issu_visite: true },
      quantite,
      prix_unitaire_ht: prixApplicable,
      tva_taux: produit?.tva_taux ?? 5.5,
      ordre: i,
    }
  }))

  if (lignesError) return { devisId: devis.id, error: lignesError.message }

  await supabase.from('interactions').insert({
    prospect_id: prospectId, type: 'devis',
    contenu: `Devis créé depuis une ${origine} (${travaux.length} poste${travaux.length > 1 ? 's' : ''} de travaux)`,
  })

  return { devisId: devis.id, error: null }
}
