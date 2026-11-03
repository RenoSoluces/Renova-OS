import { describe, expect, it } from 'vitest'
import { MODELES, piecesAttendues, remplirModele } from '../modelesAdministratifs'

const ligne = (designation: string, extra = {}) => ({ designation, ...extra })

describe('piecesAttendues', () => {
  it('toujours devis, TVA et fiches techniques', () => {
    const codes = piecesAttendues({ lignes: [ligne('Forfait divers')] }).map(p => p.code)
    expect(codes).toEqual(['devis', 'mention_tva', 'fiches_techniques'])
  })
  it('photovoltaïque : mandat Enedis obligatoire + mandat mairie', () => {
    const p = piecesAttendues({ lignes: [ligne('Panneaux photovoltaïques 6 kWc')] })
    expect(p.find(x => x.code === 'mandat_enedis')?.obligatoire).toBe(true)
    expect(p.find(x => x.code === 'mandat_mairie')?.obligatoire).toBe(false)
  })
  it('pas de mandat Enedis hors photovoltaïque', () => {
    const p = piecesAttendues({ lignes: [ligne('Pompe à chaleur air/eau')] })
    expect(p.some(x => x.code === 'mandat_enedis')).toBe(false)
    expect(p.some(x => x.code === 'mandat_mairie')).toBe(true)
  })
  it('MPR et CEE selon éligibilité ou catégorie', () => {
    const p = piecesAttendues({ lignes: [ligne('Isolation des combles', { eligible_cee: true })], categorieMpr: 'bleu' })
    expect(p.map(x => x.code)).toEqual(expect.arrayContaining(['mandat_mpr', 'cadre_cee']))
  })
})

describe('remplirModele', () => {
  it('remplace les variables et laisse des points quand elles manquent', () => {
    const t = remplirModele(MODELES.mandat_enedis.corps, { client_nom: 'Durand', installateur_nom: 'ACME' })
    expect(t).toContain('Durand')
    expect(t).toContain('ACME')
    expect(t).not.toContain('{{')
    expect(t).toContain('……………')
  })
})
