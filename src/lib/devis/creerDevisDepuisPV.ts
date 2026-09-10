import { supabase } from '../supabase'
import { numeroDevis } from './numeroDevis'
import { prixProduitPourZone } from '../catalogue/prixParZone'
import type { ResultatSimulationPV } from '../photovoltaique/calculProduction'

export interface CreerDevisDepuisPVParams {
  prospectId: string
  visiteId?: string | null
  simulation: ResultatSimulationPV
  /** Petit mot de contexte inséré dans les notes du devis (ex: "visite technique photovoltaïque") */
  origine: string
}

export interface CreerDevisResultat {
  devisId: string | null
  error: string | null
}

/**
 * Crée un devis pré-rempli à partir d'une simulation photovoltaïque. Utilise le produit
 * le moins cher de la catégorie "photovoltaique" du catalogue s'il en existe un (afin de
 * refléter un vrai prix vendu par l'entreprise) ; sinon, la ligne est créée à partir du
 * coût estimé par le moteur de simulation, à ajuster manuellement.
 */
export async function creerDevisDepuisPV(params: CreerDevisDepuisPVParams): Promise<CreerDevisResultat> {
  const { prospectId, visiteId, simulation, origine } = params
  if (!prospectId) return { devisId: null, error: 'Aucun prospect associé à cette visite.' }

  const { data: entreprise } = await supabase.from('entreprises').select('id, devis_duree_validite_jours, devis_conditions_paiement_defaut').limit(1).maybeSingle()
  const { data: prospect } = await supabase.from('prospects').select('code_postal').eq('id', prospectId).maybeSingle()

  const { data: produitsCatalogue } = await supabase
    .from('catalogue_produits')
    .select('*')
    .eq('actif', true)
    .eq('categorie', 'photovoltaique')
    .order('prix_unitaire_ht')

  const produit = (produitsCatalogue || [])[0] || null

  const dureeValidite = entreprise?.devis_duree_validite_jours ?? 30
  const dateValidite = new Date(Date.now() + dureeValidite * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: devis, error } = await supabase.from('devis').insert({
    entreprise_id: entreprise?.id || null,
    prospect_id: prospectId,
    visite_id: visiteId || null,
    numero: numeroDevis(),
    statut: 'brouillon',
    type_operation: 'mono_geste',
    date_validite: dateValidite,
    conditions_paiement: entreprise?.devis_conditions_paiement_defaut || '',
    notes: `Devis pré-rempli à partir d'une ${origine}. Production estimée : ${simulation.productionAnnuelle.toLocaleString('fr-FR')} kWh/an, retour sur investissement estimé : ${simulation.dureeAmortissementAnnees ?? '—'} ans.`,
  }).select('id').single()

  if (error || !devis) return { devisId: null, error: error?.message || 'Erreur lors de la création du devis.' }

  // Si le produit catalogue est vendu au kWc, on facture la puissance retenue ; sinon
  // (forfait, unité) on facture 1 installation complète.
  const quantite = produit && produit.unite === 'kwc' ? simulation.puissanceInstallee : 1
  const prixUnitaire = produit
    ? prixProduitPourZone(produit, prospect?.code_postal)
    : (simulation.puissanceInstallee > 0 ? Math.round((simulation.investissementEstime / 1.10) / simulation.puissanceInstallee) : 0)

  const { error: ligneError } = await supabase.from('devis_lignes').insert({
    devis_id: devis.id,
    produit_id: produit?.id || null,
    designation: produit?.nom || `Installation photovoltaïque ${simulation.puissanceInstallee} kWc`,
    description: produit?.description
      || `Production annuelle estimée : ${simulation.productionAnnuelle.toLocaleString('fr-FR')} kWh/an — Taux d'autoconsommation estimé : ${Math.round(simulation.tauxAutoconsommation * 100)}%.`,
    caracteristiques: produit?.caracteristiques || { categorie: 'photovoltaique', puissance_kwc: simulation.puissanceInstallee, issu_visite: true },
    quantite,
    prix_unitaire_ht: prixUnitaire,
    tva_taux: simulation.puissanceInstallee <= 3 ? 10 : 20,
    ordre: 0,
  })

  if (ligneError) return { devisId: devis.id, error: ligneError.message }

  // Ligne d'aide représentant la prime à l'autoconsommation, si applicable.
  if (simulation.primeAutoconsommation > 0) {
    await supabase.from('devis_aides').insert({
      devis_id: devis.id,
      type: 'prime_autoconsommation',
      libelle: "Prime à l'autoconsommation photovoltaïque (versée sur 5 ans)",
      montant: simulation.primeAutoconsommation,
    })
  }

  await supabase.from('interactions').insert({
    prospect_id: prospectId, type: 'devis',
    contenu: `Devis créé depuis une ${origine} (installation photovoltaïque ${simulation.puissanceInstallee} kWc)`,
  })

  return { devisId: devis.id, error: null }
}
