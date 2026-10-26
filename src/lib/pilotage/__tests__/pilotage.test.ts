import { describe, expect, it } from 'vitest'
import { alertesPilotage, bornesPeriode, calculerPilotage, type DonneesPilotage } from '../pilotage'

const d: DonneesPilotage = {
  profils: [{ id: 'a', nom_complet: 'Alice', role: 'commercial', objectif_mensuel: 30000 }, { id: 'b', nom_complet: 'Bruno', role: 'commercial' }],
  prospects: [
    { id: 'p1', commercial_id: 'a', created_at: '2026-10-05T10:00:00Z', statut: 'Qualifié', prenom: 'Jean', nom: 'Dupont' },
    { id: 'p2', commercial_id: 'a', created_at: '2026-10-06T10:00:00Z', statut: 'Signé' },
    { id: 'p3', commercial_id: 'b', created_at: '2026-09-01T10:00:00Z', statut: 'Qualifié', temperature: 'chaud', derniere_interaction_at: '2026-10-01T10:00:00Z', prenom: 'Léa', nom: 'Martin' },
  ],
  devis: [
    { id: 'd1', prospect_id: 'p1', numero: 'DEV-1', statut: 'envoye', created_at: '2026-10-07T10:00:00Z', montant_ht: 10000 },
    { id: 'd2', prospect_id: 'p2', numero: 'DEV-2', statut: 'signe', created_at: '2026-10-08T10:00:00Z', signature_date: '2026-10-10T10:00:00Z', montant_ht: 12000, montant_ht_avant_remise: 12500, remise_montant_ht: 500, niveau_rentabilite: 'non_rentable' },
  ],
  visites: [{ id: 'v1', prospect_id: 'p3', statut: 'terminee', date_visite: '2026-10-15' }],
  evenements: [{ id: 'e1', user_id: 'a', type: 'rdv', date: '2026-10-09' }, { id: 'e2', user_id: 'a', type: 'google', date: '2026-10-09', source: 'google' }],
  portes: [{ commercial_id: 'b', resultat: 'absent', cree_le: '2026-10-02T10:00:00Z' }, { commercial_id: 'b', resultat: 'rdv', cree_le: '2026-10-02T10:05:00Z' }],
}
const { debut, fin } = bornesPeriode('mois', new Date('2026-10-20T12:00:00'))

describe('pilotage', () => {
  it('calcule l’activité et la transformation par commercial', () => {
    const r = calculerPilotage(d, debut, fin)
    const alice = r.lignes.find(l => l.id === 'a')!
    expect(alice).toMatchObject({ prospects: 2, rdv: 1, devisEmis: 2, devisSignes: 1, caSigneHT: 12000, transformation: 50, remiseMoyennePct: 4, nonRentables: 1 })
    const bruno = r.lignes.find(l => l.id === 'b')!
    expect(bruno).toMatchObject({ portes: 2, contacts: 1, vt: 1 })
    expect(r.total.devisSignes).toBe(1)
    expect(r.entonnoir[0]).toEqual({ etape: 'Portes frappées', valeur: 2 })
  })
  it('liste les points d’attention, les plus graves d’abord', () => {
    const a = alertesPilotage(d, new Date('2026-10-20T12:00:00Z'))
    expect(a.map(x => x.type)).toEqual(['devis_non_rentable', 'devis_sans_reponse', 'vt_sans_devis', 'prospect_chaud_oublie'])
  })
})
