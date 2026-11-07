import { describe, expect, it } from 'vitest'
import { genererDevisPDF } from '../genererDevisPDF'

const CGV = 'CONDITIONS GÉNÉRALES DE VENTE\n\nArticle 11 – Garantie\n\nLe client bénéficie des garanties légales :\n- Garantie légale de conformité : délai d’action de 2 ans.\n- Garantie des vices cachés.\n\nArticle 15 – Réclamation\n\nAdresse : IDEHOME France\nEmail : contact@exemple.fr'
const devis = (cgv: string): any => ({ numero: 'DEV-TEST', date_emission: '2026-11-07', emetteur_cgv: cgv, emetteur_nom: 'IDEHOME France', statut: 'brouillon', total_ht: 100, total_ttc: 105.5, total_tva: 5.5 })
const taille = (cgv: string) => (genererDevisPDF(devis(cgv), [], [], null, null, null).output('arraybuffer') as ArrayBuffer).byteLength

describe('CGV du devis PDF', () => {
  it('des retours à la ligne Windows ou Mac donnent le même document qu\'avec \\n', () => {
    const base = taille(CGV)
    expect(taille(CGV.replace(/\n/g, '\r\n'))).toBe(base)
    expect(taille(CGV.replace(/\n/g, '\r'))).toBe(base)
  })
})
