import { describe, expect, it } from 'vitest'
import { attentionClientDevis, nomClientDevis, siretClientDevis } from '../clientDevis'
import { genererDevisPDF } from '../pdf/genererDevisPDF'

const pro: any = { civilite: 'M.', prenom: 'Mustapha', nom: 'SAID', type_prospect: 'professionnel', raison_sociale: 'LS IMMO', siret: '82984623700016' }
const particulier: any = { civilite: 'Mme', prenom: 'Emilie', nom: 'ABRAHAM', type_prospect: 'particulier', raison_sociale: null, siret: null }

describe('client affiché sur le devis', () => {
  it('un prospect professionnel est affiché au nom de son entreprise', () => {
    expect(nomClientDevis(pro)).toBe('LS IMMO')
    expect(attentionClientDevis(pro)).toBe("À l'attention de M. Mustapha SAID")
    expect(siretClientDevis(pro)).toBe('SIRET : 82984623700016')
  })

  it('un particulier reste affiché avec son nom', () => {
    expect(nomClientDevis(particulier)).toBe('Mme Emilie ABRAHAM')
    expect(attentionClientDevis(particulier)).toBe('')
    expect(siretClientDevis(particulier)).toBe('')
  })

  it('un professionnel sans raison sociale retombe sur le nom du contact', () => {
    expect(nomClientDevis({ ...pro, raison_sociale: '  ' })).toBe('M. Mustapha SAID')
  })

  it('le PDF se génère pour un professionnel et pour un particulier', () => {
    const devis: any = { numero: 'DEV-TEST', statut: 'brouillon', total_ht: 100, total_ttc: 120, total_tva: 20 }
    for (const p of [pro, particulier, null]) {
      const doc = genererDevisPDF(devis, [], [], p, null, null)
      expect((doc.output('arraybuffer') as ArrayBuffer).byteLength).toBeGreaterThan(1000)
    }
  })
})
