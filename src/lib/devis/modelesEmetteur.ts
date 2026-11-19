import type { Installateur } from '../../types'

/**
 * Modèle de devis d'un émetteur partenaire : un même partenaire n'utilise pas les mêmes
 * qualifications (ni parfois la même société) selon le type de travaux. Ex. Idehome :
 * clim → QualiPAC, photovoltaïque → QualiPV, isolation → SARL ECO ENERGIE (Qualibat).
 * Choisir le modèle à la création du devis remplit l'émetteur et le bloc « professionnel
 * qualifié » d'un coup, au lieu de tout ressaisir à chaque devis.
 */
export interface ModeleDevis {
  code: string
  libelle: string
  /** Autre société émettrice que le partenaire lui-même (ex. ECO ENERGIE pour l'isolation). */
  emetteur?: Partial<{
    nom_affichage: string
    raison_sociale: string
    forme_juridique: string
    siret: string
    numero_tva: string
    adresse: string
    code_postal: string
    ville: string
    telephone: string
    email: string
    logo_url: string
  }>
  pro: {
    rge: string
    organisme: string
    assurance: string
    validite?: string
    /** Fiches CEE couvertes par la qualification : cochées d'office sur le devis. */
    fiches?: string[]
  }
}

export function modelesDe(p: Installateur | null | undefined): ModeleDevis[] {
  const brut = (p as any)?.modeles_devis
  return Array.isArray(brut) ? brut.filter(m => m && m.code && m.libelle && m.pro) : []
}

/** Valeur du sélecteur d'émetteur : « id » ou « id::code » pour un modèle. */
export function lireChoixEmetteur(valeur: string): { installateurId: string; modele: string | null } {
  const [installateurId, modele] = valeur.split('::')
  return { installateurId, modele: modele || null }
}

export function optionsEmetteur(partenaires: Installateur[]): { value: string; label: string }[] {
  return partenaires.flatMap(p => {
    const nom = p.devis_nom_affichage || p.nom
    const modeles = modelesDe(p)
    return modeles.length
      ? modeles.map(m => ({ value: `${p.id}::${m.code}`, label: `${m.emetteur?.nom_affichage || nom} — ${m.libelle}` }))
      : [{ value: p.id, label: nom }]
  })
}

/** Bloc « professionnel qualifié » prêt à enregistrer sur le devis. */
export function proDuModele(m: ModeleDevis) {
  return {
    rge: m.pro.rge,
    organisme: m.pro.organisme,
    assurance: m.pro.assurance,
    validite: m.pro.validite || '',
    couvre: Object.fromEntries((m.pro.fiches || []).map(f => [f, true])),
  }
}
