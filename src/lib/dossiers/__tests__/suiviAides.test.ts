import { describe, expect, it } from 'vitest'
import { etapesDossier, piecesAAjouter, piecesAttendues, messageDemandePieces } from '../suiviAides'

const maintenant = new Date('2026-10-26T12:00:00Z')

describe('suivi des aides', () => {
  it('ajoute la note de dimensionnement pour une PAC en CEE et les pièces MPR', () => {
    const types = piecesAttendues(['cee', 'mpr'], ['BAR-TH-171']).map(p => p.type)
    expect(types).toContain('note_dimensionnement')
    expect(types).toContain('mpr_depot')
    expect(piecesAAjouter(['cee'], [], [{ type: 'avis_imposition', nom: 'x' }]).some(p => p.type === 'avis_imposition')).toBe(false)
  })
  it('bloque une offre CEE acceptée après la signature du devis', () => {
    const e = etapesDossier({ aides: ['cee'], suivi: { cee: { offre_acceptee: '2026-10-10' } }, signatureDevis: '2026-10-05T10:00:00Z', pieces: [], maintenant })
    expect(e.find(x => x.id === 'cee_offre')?.etat).toBe('bloquant')
  })
  it('bloque une demande MPR déposée après le début des travaux, et relance le dépôt CEE après 30 jours', () => {
    const e = etapesDossier({ aides: ['cee', 'mpr'], suivi: { mpr: { depot: '2026-10-20' }, cee: { offre_acceptee: '2026-09-01' }, facture: '2026-09-10' }, signatureDevis: '2026-09-02', installation: '2026-10-15', pieces: [], maintenant })
    expect(e.find(x => x.id === 'mpr_depot')?.etat).toBe('bloquant')
    expect(e.find(x => x.id === 'cee_depot')?.etat).toBe('en_retard')
  })
  it('relance les pièces demandées depuis plus de 7 jours', () => {
    const e = etapesDossier({ aides: [], suivi: {}, pieces: [{ type: 'rib', nom: 'RIB', demande_le: '2026-10-15T09:00:00Z' }], maintenant })
    expect(e.find(x => x.id === 'relance_pieces')?.etat).toBe('en_retard')
    expect(messageDemandePieces('Jean', [{ nom: 'RIB' }])).toContain('• RIB')
  })
})
