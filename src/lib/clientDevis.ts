import type { Prospect } from '../types'

type ClientDevis = Pick<Prospect, 'prenom' | 'nom'> &
  Partial<Pick<Prospect, 'civilite' | 'type_prospect' | 'raison_sociale' | 'siret'>>

const nettoyer = (v: string) => v.replace(/\s+/g, ' ').trim()

/** Nom du contact (personne physique) : civilité, prénom, nom. */
export function nomContactDevis(p: ClientDevis | null | undefined): string {
  if (!p) return ''
  return nettoyer(`${p.civilite || ''} ${p.prenom || ''} ${p.nom || ''}`)
}

/** Un prospect professionnel avec une raison sociale est facturé au nom de l'entreprise. */
export function estClientProDevis(p: ClientDevis | null | undefined): boolean {
  return !!p && p.type_prospect === 'professionnel' && !!(p.raison_sociale || '').trim()
}

/** Nom affiché comme client sur le devis : la raison sociale pour un pro, sinon le nom du contact. */
export function nomClientDevis(p: ClientDevis | null | undefined): string {
  if (!p) return ''
  return estClientProDevis(p) ? nettoyer(p.raison_sociale || '') : nomContactDevis(p)
}

/** Ligne « À l'attention de … » pour un client professionnel, vide sinon. */
export function attentionClientDevis(p: ClientDevis | null | undefined): string {
  if (!p || !estClientProDevis(p)) return ''
  const contact = nomContactDevis(p)
  return contact ? `À l'attention de ${contact}` : ''
}

/** Ligne SIRET du client professionnel, vide sinon. */
export function siretClientDevis(p: ClientDevis | null | undefined): string {
  if (!p || !estClientProDevis(p)) return ''
  const siret = (p.siret || '').trim()
  return siret ? `SIRET : ${siret}` : ''
}
