import { describe, it, expect } from 'vitest'
import { STATUTS_MPR, normaliserTexte, trouverStatut, actionRequise, detecterColonnes, lignesDepuisTableau, rapprocher, type DossierRapprochable } from '../suiviAnah'

describe('statuts Anah', () => {
  it('chaque statut est unique dans sa phase', () => {
    const cles = STATUTS_MPR.map(s => `${s.phase}|${normaliserTexte(s.statut)}`)
    expect(new Set(cles).size).toBe(cles.length)
  })
  it('reconnaît un libellé malgré les accents, tirets et apostrophes', () => {
    expect(trouverStatut('DOSSIER DEPOSE - DEPART D INSTRUCTION')?.statut).toBe('Dossier déposé – départ d\'instruction')
    expect(trouverStatut('en cours d’instruction – réexamen')?.phase).toBe('solde')
    expect(trouverStatut('Acceptée pour paiement')?.phase).toBe('cloture')
    expect(trouverStatut('inconnu du tout')).toBeNull()
    expect(trouverStatut('')).toBeNull()
  })
  it('départage par la phase indiquée quand le libellé existe aux deux endroits', () => {
    expect(trouverStatut('En cours d\'instruction', 'solde')?.phase).toBe('solde')
    expect(trouverStatut('En cours d\'instruction', 'subvention')?.phase).toBe('subvention')
    expect(trouverStatut('En cours d\'instruction')?.phase).toBe('subvention')
  })
  it('repère les statuts qui demandent une action', () => {
    expect(actionRequise('En attente de compléments d\'information')).toBe(true)
    expect(actionRequise('Attente de réponse – information préalable')).toBe(true)
    expect(actionRequise('En cours d\'instruction')).toBe(false)
    expect(actionRequise(null)).toBe(false)
  })
})

describe('import de l\'export mandataire', () => {
  it('devine les colonnes d\'après leurs en-têtes', () => {
    const c = detecterColonnes(['N° de dossier', 'Nom', 'Prénom', 'Date de dépôt', 'Statut du dossier'])
    expect(c).toMatchObject({ numero: 0, nom: 1, prenom: 2, statut: 4 })
  })
  it('lit un nom complet quand nom et prénom sont dans une seule colonne', () => {
    const l = lignesDepuisTableau([['MPR-1', 'Jean Dupont', 'En cours d\'instruction']], { numero: 0, nomComplet: 1, statut: 2 })
    expect(l[0]).toMatchObject({ numero: 'MPR-1', prenom: 'Jean', nom: 'Dupont' })
  })
  const dossiers: DossierRapprochable[] = [
    { id: 'a', reference: 'DOS-A', mpr_numero_dossier: 'MPR-123', mpr_statut: 'En cours d\'instruction', nom: 'Dupont', prenom: 'Jean' },
    { id: 'b', reference: 'DOS-B', mpr_numero_dossier: null, mpr_statut: null, nom: 'Martin', prenom: 'Paul' },
    { id: 'c', reference: 'DOS-C', mpr_numero_dossier: null, mpr_statut: null, nom: 'Durand', prenom: 'Anne' },
    { id: 'd', reference: 'DOS-D', mpr_numero_dossier: null, mpr_statut: null, nom: 'Durand', prenom: 'Anne' },
  ]
  it('rapproche par numéro de dossier en priorité, puis par nom', () => {
    const r = rapprocher([
      { numero: 'mpr 123', nom: 'X', prenom: 'Y', statutBrut: 'Acceptée pour paiement' },
      { numero: '', nom: 'MARTIN', prenom: 'paul', statutBrut: 'En attente de compléments d\'information' },
    ], dossiers)
    expect(r.correspondances.map(c => [c.dossier.id, c.methode, c.changement])).toEqual([['a', 'numero', true], ['b', 'nom', true]])
  })
  it('signale les homonymes et les inconnus au lieu de deviner', () => {
    const r = rapprocher([
      { numero: '', nom: 'Durand', prenom: 'Anne', statutBrut: 'En cours d\'instruction' },
      { numero: '', nom: 'Inconnu', prenom: 'Zoé', statutBrut: 'En cours d\'instruction' },
    ], dossiers)
    expect(r.correspondances).toHaveLength(0)
    expect(r.nonTrouvees.map(n => n.raison)).toEqual(['ambigu', 'introuvable'])
  })
  it('ne signale aucun changement si le statut est déjà à jour', () => {
    const r = rapprocher([{ numero: 'MPR-123', nom: '', prenom: '', statutBrut: 'En cours d\'instruction' }], dossiers)
    expect(r.correspondances[0].changement).toBe(false)
  })
})
