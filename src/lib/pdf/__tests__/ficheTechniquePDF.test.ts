import { describe, expect, it } from 'vitest'
import { caracteristiquesPubliques, descriptionPublique, genererFicheOperation, genererFicheProduit } from '../ficheTechniquePDF'

describe('fiches Reno Soluces', () => {
  it('ne reprend aucune donnée tarifaire ou interne', () => {
    const r = caracteristiquesPubliques({ prix_fournisseur_ht: 339, prime_cee_estimation_eur: '[object Object]', reference_fabricant: 'à confirmer', pose_info: 'x', type_flux: 'simple', type_hygro: 'à confirmer', fiche_cee: 'BAR-TH-127', 'Type de VMC hygroréglable': 'B' })
    expect(r).toEqual([['Type flux', 'simple'], ['Type de VMC hygroréglable', 'B']])
  })
  it('retire les lignes de service de la description', () => {
    expect(descriptionPublique('Équipement VMC.\nMontants Indicatifs A Confirmer : true\nType Hygro : à confirmer')).toBe('Équipement VMC.')
  })
  it('génère des PDF non vides', async () => {
    const a = genererFicheProduit({ nom: 'Aldes EasyHOME — groupe seul', marque: 'Aldes', categorie: 'vmc', fiche_cee: 'BAR-TH-127', eligible_cee: true, caracteristiques: { prix_fournisseur_ht: 3 } })
    const b = genererFicheOperation('BAR-TH-171', [{ nom: 'PAC', marque: 'Atlantic' }])
    expect((await a.arrayBuffer()).byteLength).toBeGreaterThan(2000)
    expect((await b.arrayBuffer()).byteLength).toBeGreaterThan(2000)
  })
})
