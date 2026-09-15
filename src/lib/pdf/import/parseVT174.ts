import type {
  AuditData,
  MenuiserieFiche,
  MenuiserieMur,
  MurFiche,
  PlafondFiche,
  PlancherFiche,
} from '../../../types'

import {
  VT174_DEFAULTS,
  type VT174MurBlock,
  type VT174MenuiserieBlock,
  type VT174PorteBlock,
  type VT174ParseResult,
  type VT174Extraction,
} from './typesVT174'

export type { VT174ParseResult } from './typesVT174'

function clean(value: string | undefined | null): string {
  return (value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string): string {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function numberValue(
  value: string | undefined | null,
): number | null {
  if (!value) return null

  const match = value
    .replace(',', '.')
    .match(/-?\d+(?:\.\d+)?/)

  if (!match) return null

  const result = Number(match[0])

  return Number.isFinite(result) ? result : null
}

function dimensionValue(
  value: string | undefined | null,
): {
  largeur: number | null
  hauteur: number | null
} {
  if (!value) {
    return {
      largeur: null,
      hauteur: null,
    }
  }

  const match = value
    .replace(',', '.')
    .match(
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/,
    )

  if (!match) {
    return {
      largeur: null,
      hauteur: null,
    }
  }

  return {
    largeur: Number(match[1]),
    hauteur: Number(match[2]),
  }
}

function extractField(
  text: string,
  labels: string[],
): string {
  const normalizedText = text.replace(/\r/g, '')

  for (const label of labels) {
    const escaped = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    )

    const regex = new RegExp(
      `${escaped}\\s*:?\\s*([^\\n]+)`,
      'i',
    )

    const match = normalizedText.match(regex)

    if (match?.[1]) {
      return clean(match[1])
    }
  }

  return ''
}

function extractNumberField(
  text: string,
  labels: string[],
): number | null {
  return numberValue(
    extractField(text, labels),
  )
}

function extractPhotos(text: string): string[] {
  const photos = new Set<string>()

  const regex = /\bPhoto\s+\d+\b/gi

  for (const match of text.matchAll(regex)) {
    photos.add(clean(match[0]))
  }

  return [...photos]
}

function extractPhotoNumbers(
  value: string,
): string[] {
  if (!value) return []

  const result: string[] = []

  const regex = /\bPhoto\s+\d+\b/gi

  for (const match of value.matchAll(regex)) {
    result.push(clean(match[0]))
  }

  return [...new Set(result)]
}

function parseMurBlock(
  lines: string[],
  startIndex: number,
  endIndex: number,
  numero: number,
): VT174MurBlock {
  const blockLines = lines.slice(
    startIndex,
    endIndex,
  )

  const blockText = blockLines.join('\n')

  const orientation =
    extractField(blockText, [
      'Orientation',
      'Orientation mur',
      'Orientation de la paroi',
    ])

  const limite =
    extractField(blockText, [
      'Limite',
      'Paroi',
      'Type de limite',
      'Mur donnant sur',
    ])

  const surface =
    extractNumberField(blockText, [
      'Surface',
      'Surface du mur',
      'Surface paroi',
    ])

  const typeMur =
    extractField(blockText, [
      'Type de mur',
      'Type mur',
      'Composition',
    ])

  const isolation =
    extractField(blockText, [
      'Isolation',
      'Isolation du mur',
      'Isolant',
    ])

  const piece =
    extractField(blockText, [
      'Pièce',
      'Local',
      'Emplacement',
      'Piece',
    ])

  const isolationPossible =
    extractField(blockText, [
      'Isolation possible',
      'Possibilité isolation',
      'Isolable',
    ])

  const photos =
    extractPhotoNumbers(blockText)

  const menuiseries: VT174MenuiserieBlock[] = []
  const portes: VT174PorteBlock[] = []

  const menuRegex =
    /(Fenêtre|Porte Fenêtre|Baie vitrée|Porte-fenêtre)[^\n]*/gi

  for (const match of blockText.matchAll(menuRegex)) {
    const ligne = clean(match[0])

    const dimensions =
      dimensionValue(ligne)

    const materiauMatch =
      ligne.match(
        /\b(PVC|Bois|Aluminium|Alu|Mixte)\b/i,
      )

    const qtyMatch =
      ligne.match(
        /(?:Qté|Quantité|Qte|qty)\s*:?\s*(\d+)/i,
      )

    const nombre = qtyMatch
      ? Number(qtyMatch[1])
      : 1

    const item: VT174MenuiserieBlock = {
      type: ligne,
      materiau: materiauMatch
        ? clean(materiauMatch[1])
        : '',
      largeur_m:
        dimensions.largeur,
      hauteur_m:
        dimensions.hauteur,
      nombre,
      photos:
        extractPhotoNumbers(ligne),
    }

    if (
      normalize(ligne).includes('porte')
    ) {
      portes.push({
        type: item.type,
        materiau: item.materiau,
        largeur_m: item.largeur_m,
        hauteur_m: item.hauteur_m,
        nombre: item.nombre,
        photos: item.photos,
      })
    } else {
      menuiseries.push(item)
    }
  }

  return {
    numero,
    orientation,
    limite,
    surface_m2: surface,
    type_mur: typeMur,
    isolation,
    piece,
    photos,
    isolation_possible: isolationPossible,
    menuiseries,
    portes,
  }
}

function parseMurs(
  text: string,
): VT174MurBlock[] {
  const lines = text
    .replace(/\r/g, '')
    .split('\n')
    .map(clean)
    .filter(Boolean)

  const murIndexes: number[] = []

  lines.forEach((line, index) => {
    if (/^Mur\s+\d+$/i.test(line)) {
      murIndexes.push(index)
    }
  })

  if (!murIndexes.length) {
    return []
  }

  return murIndexes.map(
    (start, index) => {
      const end =
        murIndexes[index + 1] ??
        lines.length

      const numero = Number(
        lines[start].match(/\d+/)?.[0] ??
          index + 1,
      )

      return parseMurBlock(
        lines,
        start,
        end,
        numero,
      )
    },
  )
}

function murToAudit(
  mur: VT174MurBlock,
): MurFiche {
  const menuiseries: MenuiserieMur[] =
    mur.menuiseries.map(
      (
        menu: VT174MenuiserieBlock,
        index: number,
      ) => ({
        id: `import-vt174-mur-${mur.numero}-menu-${index + 1}`,
        type_menuiserie: menu.type,
        largeur_m: menu.largeur_m,
        hauteur_m: menu.hauteur_m,
        vitrage: menu.vitrage ?? '',
        photos: menu.photos,
      }),
    )

  return {
    id: `import-vt174-mur-${mur.numero}`,
    orientation: mur.orientation,
    position: mur.limite,
    type_doublage: '',
    composition: mur.type_mur,
    epaisseur_cm:
      numberValue(mur.type_mur),
    longueur_m: null,
    hauteur_type: null,
    hauteur_m: null,
    isole: mur.isolation,
    isolant_type: mur.isolation,
    epaisseur_isolant_cm: null,
    mur_lourd: '',
    paroi_ancienne: '',
    retour_iso_menuiseries:
      mur.isolation_possible,
    menuiseries,
    notes: mur.piece
      ? `Pièce : ${mur.piece}`
      : '',
    etape_active: 0,
    photos: mur.photos,
  }
}

function porteToMenuiserieFiche(
  mur: VT174MurBlock,
  porte: VT174PorteBlock,
  index: number,
): MenuiserieFiche {
  return {
    id: `import-vt174-mur-${mur.numero}-porte-${index + 1}`,
    type_menuiserie: porte.type,
    orientation: mur.orientation,
    mur_rattache: `mur-${mur.numero}`,
    largeur_m: porte.largeur_m,
    hauteur_m: porte.hauteur_m,
    vitrage: '',
    materiau: porte.materiau,
    nombre: porte.nombre,
    notes: mur.piece
      ? `Pièce : ${mur.piece}`
      : '',
    photos: porte.photos,
  }
}

function murMenuiserieToFiche(
  mur: VT174MurBlock,
  menu: VT174MenuiserieBlock,
  index: number,
): MenuiserieFiche {
  return {
    id: `import-vt174-mur-${mur.numero}-fenetre-${index + 1}`,
    type_menuiserie: menu.type,
    orientation: mur.orientation,
    mur_rattache: `mur-${mur.numero}`,
    largeur_m: menu.largeur_m,
    hauteur_m: menu.hauteur_m,
    vitrage: menu.vitrage ?? '',
    materiau: menu.materiau,
    nombre: menu.nombre,
    notes: mur.piece
      ? `Pièce : ${mur.piece}`
      : '',
    photos: menu.photos,
  }
}

function allMenuiseriesToFiches(
  murs: VT174MurBlock[],
): MenuiserieFiche[] {
  const result: MenuiserieFiche[] = []

  murs.forEach(
    (mur: VT174MurBlock) => {
      mur.menuiseries.forEach(
        (
          menu: VT174MenuiserieBlock,
          index: number,
        ) => {
          result.push(
            murMenuiserieToFiche(
              mur,
              menu,
              index,
            ),
          )
        },
      )

      mur.portes.forEach(
        (
          porte: VT174PorteBlock,
          index: number,
        ) => {
          result.push(
            porteToMenuiserieFiche(
              mur,
              porte,
              index,
            ),
          )
        },
      )
    },
  )

  return result
}

function parsePlanchers(
  text: string,
): PlancherFiche[] {
  const type =
    extractField(text, [
      'Type de plancher',
      'Type plancher',
    ])

  const surface =
    extractNumberField(text, [
      'Surface du plancher',
      'Surface plancher',
    ])

  const isolation =
    extractField(text, [
      'Isolation du plancher',
    ])

  if (
    !type &&
    surface === null &&
    !isolation
  ) {
    return []
  }

  return [
    {
      id: 'import-vt174-plancher-1',
      type,
      position: '',
      surface_m2: surface,
      composition: '',
      isolation,
      isolant_type: '',
      epaisseur_isolant_cm: null,
      notes: '',
      photos: [],
    },
  ]
}

function parsePlafonds(
  text: string,
): PlafondFiche[] {
  const type =
    extractField(text, [
      'Type de plafond',
      'Type plafond',
      'Type de toiture',
    ])

  const surface =
    extractNumberField(text, [
      'Surface du plafond',
      'Surface plafond',
    ])

  const isolation =
    extractField(text, [
      'Isolation du plafond',
      'Isolation des combles',
    ])

  if (
    !type &&
    surface === null &&
    !isolation
  ) {
    return []
  }

  return [
    {
      id: 'import-vt174-plafond-1',
      type,
      position: '',
      surface_m2: surface,
      composition: '',
      isolation,
      isolant_type: '',
      epaisseur_isolant_cm: null,
      notes: '',
      photos: [],
    },
  ]
}

function buildIdentification(
  text: string,
): AuditData['identification'] {
  return {
    ...VT174_DEFAULTS.identification,
    date_visite:
      extractField(text, [
        'Date de visite',
        'Date visite',
      ]),
    occupation:
      extractField(text, [
        'Logement loué',
        'Occupation',
        'Statut occupation',
      ]),
    nom_occupant:
      extractField(text, [
        'Nom locataire',
        'Nom occupant',
      ]),
    prenom_occupant:
      extractField(text, [
        'Prénom locataire',
        'Prenom locataire',
        'Prénom occupant',
        'Prenom occupant',
      ]),
    telephone:
      extractField(text, [
        'Téléphone',
        'Telephone',
        'Téléphone occupant',
      ]),
    email:
      extractField(text, [
        'Email',
        'E-mail',
        'Adresse email',
      ]),
    adresse:
      extractField(text, [
        'Adresse',
        'Adresse du logement',
      ]),
    code_postal:
      extractField(text, [
        'Code postal',
        'Code Postal',
      ]),
    ville:
      extractField(text, [
        'Ville',
        'Commune',
      ]),
    notes:
      extractField(text, [
        'Observations',
        'Observation',
      ]),
  }
}

function buildBatiment(
  text: string,
): AuditData['donnees_batiment'] {
  return {
    ...VT174_DEFAULTS.donnees_batiment,
    type_batiment:
      extractField(text, [
        'Type de logement',
        'Type du logement',
        'Type',
      ]),
    surface_habitable:
      extractNumberField(text, [
        'Surface habitable',
        'Surface habitable (m²)',
      ]),
    nombre_niveaux:
      extractNumberField(text, [
        'Nombre de niveaux',
        'Nombre niveaux',
        'Niveaux',
      ]),
    annee_construction:
      extractNumberField(text, [
        'Année de construction',
        'Annee de construction',
      ]),
    hsp:
      extractNumberField(text, [
        'Hauteur sous plafond',
        'HSP',
      ]),
  }
}

function buildVentilation(
  text: string,
): AuditData['ventilation'] {
  const type =
    extractField(text, [
      'Type de ventilation',
      'Ventilation',
    ])

  return {
    ...VT174_DEFAULTS.ventilation,
    type,
    presence_vmc:
      normalize(type).includes('aucune')
        ? 'non'
        : type
          ? 'oui'
          : '',
  }
}

function buildChauffage(
  text: string,
): AuditData['chauffage'] {
  return {
    ...VT174_DEFAULTS.chauffage,
    energie:
      extractField(text, [
        'Énergie chauffage',
        'Energie chauffage',
        'Énergie',
        'Energie',
      ]),
    systeme_principal:
      extractField(text, [
        'Émetteur principal',
        'Emetteur principal',
        'Système principal',
        'Systeme principal',
      ]),
    puissance_kw:
      extractNumberField(text, [
        'Puissance',
        'Puissance (kW)',
      ]),
    annee_installation:
      extractNumberField(text, [
        'Année installation chauffage',
        'Annee installation chauffage',
      ]),
    systeme_secondaire: '',
    notes:
      extractField(text, [
        'Notes chauffage',
        'Observations chauffage',
      ]),
  }
}

function buildEcs(
  text: string,
): AuditData['ecs'] {
  return {
    ...VT174_DEFAULTS.ecs,
    systeme:
      extractField(text, [
        'Générateur ECS',
        'Generateur ECS',
        'Système ECS',
        'Systeme ECS',
        'ECS',
      ]),
    energie:
      extractField(text, [
        'Énergie ECS',
        'Energie ECS',
      ]),
    capacite_l:
      extractNumberField(text, [
        'Volume ECS',
        'Volume',
        'Capacité',
        'Capacite',
      ]),
    annee_installation:
      extractNumberField(text, [
        'Année installation ECS',
        'Annee installation ECS',
      ]),
    notes:
      extractField(text, [
        'Notes ECS',
        'Observations ECS',
      ]),
  }
}

function countFields(
  audit: AuditData,
): number {
  let count = 0

  const countObject = (
    object: unknown,
  ) => {
    if (
      !object ||
      typeof object !== 'object'
    ) {
      return
    }

    Object.values(
      object as Record<
        string,
        unknown
      >,
    ).forEach(value => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          count++
        }
      } else if (
        value !== null &&
        value !== undefined &&
        value !== ''
      ) {
        count++
      }
    })
  }

  countObject(audit.identification)
  countObject(audit.donnees_batiment)
  countObject(audit.ventilation)
  countObject(audit.chauffage)
  countObject(audit.ecs)

  count += audit.murs?.length ?? 0
  count += audit.menuiseries?.length ?? 0
  count += audit.planchers?.length ?? 0
  count += audit.plafonds?.length ?? 0

  return count
}

export function parseVT174(
  rawText: string,
): VT174ParseResult {
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')

  const normalizedText =
    normalize(text)

  const formatDetecte =
    normalizedText.includes('vt th174') &&
    normalizedText.includes('175 smart')

  const avertissements: string[] = []
  const erreurs: string[] = []

  if (!formatDetecte) {
    avertissements.push(
      'Le format du rapport ne correspond pas exactement à VT TH174 / 175 SMART.',
    )
  }

  const murBlocks =
    parseMurs(text)

  if (!murBlocks.length) {
    avertissements.push(
      'Aucun mur n’a été détecté dans le rapport.',
    )
  }

  const murs =
    murBlocks.map(murToAudit)

  const menuiseries =
    allMenuiseriesToFiches(
      murBlocks,
    )

  const planchers =
    parsePlanchers(text)

  const plafonds =
    parsePlafonds(text)

  const auditData: AuditData = {
    identification:
      buildIdentification(text),

    donnees_batiment:
      buildBatiment(text),

    murs,

    menuiseries,

    planchers,

    plafonds,

    ventilation:
      buildVentilation(text),

    chauffage:
      buildChauffage(text),

    ecs:
      buildEcs(text),

    completed_sections: [],
  }

  const photos =
    extractPhotos(text)

  const extraction: VT174Extraction = {
    identification:
      auditData.identification ?? {},

    donnees_batiment:
      auditData.donnees_batiment ?? {},

    murs,

    menuiseries,

    planchers,

    plafonds,

    ventilation:
      auditData.ventilation ?? {},

    chauffage:
      auditData.chauffage ?? {},

    ecs:
      auditData.ecs ?? {},

    photos,

    observations:
      auditData.identification?.notes
        ? [
            auditData
              .identification
              .notes,
          ]
        : [],

    metadata: {
      format:
        'VT_TH174_175_SMART',

      source: 'pdf',

      nom_proprietaire:
        extractField(text, [
          'Nom propriétaire',
          'Nom proprietaire',
        ]),

      prenom_proprietaire:
        extractField(text, [
          'Prénom propriétaire',
          'Prenom proprietaire',
        ]),

      nom_locataire:
        extractField(text, [
          'Nom locataire',
        ]),

      prenom_locataire:
        extractField(text, [
          'Prénom locataire',
          'Prenom locataire',
        ]),

      rapport_statut:
        extractField(text, [
          'Statut',
          'Résultat',
          'Resultat',
        ]),
    },
  }

  const champsDetectes =
    countFields(auditData)

  if (
    !auditData.identification?.adresse
  ) {
    avertissements.push(
      'Adresse du logement non détectée.',
    )
  }

  if (
    !auditData.donnees_batiment
      ?.surface_habitable
  ) {
    avertissements.push(
      'Surface habitable non détectée.',
    )
  }

  if (
    !auditData.chauffage
      ?.systeme_principal
  ) {
    avertissements.push(
      'Système de chauffage non détecté.',
    )
  }

  if (
    !auditData.ecs?.systeme
  ) {
    avertissements.push(
      'Système ECS non détecté.',
    )
  }

  return {
    success:
      erreurs.length === 0,

    format_detecte:
      formatDetecte,

    audit_data:
      auditData,

    extraction,

    statistiques: {
      champs_detectes:
        champsDetectes,

      murs_detectes:
        murs.length,

      menuiseries_detectees:
        menuiseries.length,

      planchers_detectes:
        planchers.length,

      plafonds_detectes:
        plafonds.length,

      photos_detectees:
        photos.length,
    },

    avertissements,

    erreurs,
  }
}