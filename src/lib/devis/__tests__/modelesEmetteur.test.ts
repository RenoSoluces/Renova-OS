import { describe, expect, it } from 'vitest'
import { lireChoixEmetteur, optionsEmetteur, proDuModele } from '../modelesEmetteur'

const idehome: any = {
  id: 'ide', nom: 'Idehome', devis_nom_affichage: 'IDEHOME by Reno Soluces',
  modeles_devis: [
    { code: 'clim', libelle: 'Clim / PAC air-air', pro: { rge: '48304', organisme: 'Qualit’EnR — QualiPAC', assurance: 'QBE', fiches: ['BAR-TH-129'] } },
    { code: 'iso', libelle: 'Isolation', emetteur: { nom_affichage: 'ECO ENERGIE' }, pro: { rge: 'E-E213754', organisme: 'Qualibat', assurance: 'AXERIA' } },
  ],
}

describe('modèles de devis par émetteur', () => {
  it('liste un choix par modèle, un seul choix sans modèle', () => {
    expect(optionsEmetteur([idehome, { id: 'bj', nom: 'BJ ECOWATT' } as any])).toEqual([
      { value: 'ide::clim', label: 'IDEHOME by Reno Soluces — Clim / PAC air-air' },
      { value: 'ide::iso', label: 'ECO ENERGIE — Isolation' },
      { value: 'bj', label: 'BJ ECOWATT' },
    ])
  })
  it('lit le choix et coche les fiches couvertes', () => {
    expect(lireChoixEmetteur('ide::clim')).toEqual({ installateurId: 'ide', modele: 'clim' })
    expect(lireChoixEmetteur('bj')).toEqual({ installateurId: 'bj', modele: null })
    expect(proDuModele(idehome.modeles_devis[0]).couvre).toEqual({ 'BAR-TH-129': true })
  })
})
