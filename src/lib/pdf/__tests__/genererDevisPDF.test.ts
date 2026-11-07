import { describe, expect, it } from 'vitest'
import { genererDevisPDF } from '../genererDevisPDF'

const CGV = 'CONDITIONS GÉNÉRALES DE VENTE\n\nArticle 11 – Garantie\n\nLe client bénéficie des garanties légales :\n- Garantie légale de conformité : délai d’action de 2 ans.\n- Garantie des vices cachés.\n\nArticle 15 – Réclamation\n\nAdresse : IDEHOME France\nEmail : contact@exemple.fr'
const devis = (cgv: string): any => ({ numero: 'DEV-TEST', date_emission: '2026-11-07', emetteur_cgv: cgv, emetteur_nom: 'IDEHOME France', statut: 'brouillon', total_ht: 100, total_ttc: 105.5, total_tva: 5.5 })
const texte = (cgv: string) => {
  const doc = genererDevisPDF(devis(cgv), [], [], null, null, null)
  return Buffer.from(doc.output('arraybuffer')).toString('latin1')
}

describe('CGV du devis PDF', () => {
  it('des retours à la ligne Windows ou Mac donnent le même document qu\'avec \\n', () => {
    const base = texte(CGV)
    expect(texte(CGV.replace(/\n/g, '\r\n')).length).toBe(base.length)
    expect(texte(CGV.replace(/\n/g, '\r')).length).toBe(base.length)
  })
})
