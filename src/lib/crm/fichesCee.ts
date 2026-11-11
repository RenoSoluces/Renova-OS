// Fiches d'opérations proposées à la saisie d'un prospect ou d'un dossier.
// Les codes sont les codes officiels des fiches d'opérations standardisées (identiques à ceux du catalogue).
export const FICHES_CEE = [
  { code: 'BAR-EN-101', cat: 'Isolation combles / toitures', title: 'Isolation de combles ou de toitures', desc: 'Combles perdus, rampants, toiture', group: 'Isolation' },
  { code: 'BAR-EN-102', cat: 'Isolation des murs', title: 'Isolation des murs', desc: 'Murs par l\'intérieur (ITI) ou par l\'extérieur (ITE)', group: 'Isolation' },
  { code: 'BAR-EN-103', cat: 'Isolation plancher', title: 'Isolation d\'un plancher', desc: 'Plancher bas, vide sanitaire, sous-sol', group: 'Isolation' },
  { code: 'BAR-EN-104', cat: 'Fenêtres', title: 'Fenêtre ou porte-fenêtre complète avec vitrage isolant', desc: 'Remplacement des menuiseries', group: 'Isolation' },
  { code: 'BAR-TH-171', cat: 'PAC air/eau', title: 'Pompe à chaleur de type air/eau', desc: 'PAC air/eau pour chauffage central', group: 'Chauffage' },
  { code: 'BAR-TH-172', cat: 'PAC eau/eau ou sol/eau', title: 'Pompe à chaleur de type eau/eau ou sol/eau', desc: 'PAC géothermique sur capteurs enterrés', group: 'Chauffage' },
  { code: 'BAR-TH-129', cat: 'PAC air/air', title: 'Pompe à chaleur de type air/air', desc: 'PAC air/air (climatisation réversible)', group: 'Chauffage' },
  { code: 'BAR-TH-143', cat: 'Système solaire combiné', title: 'Système solaire combiné', desc: 'Chauffage et eau chaude solaires', group: 'Chauffage' },
  { code: 'BAR-TH-148', cat: 'Chauffe-eau thermodynamique', title: 'Chauffe-eau thermodynamique à accumulation', desc: 'Production d\'eau chaude sanitaire thermodynamique', group: 'Eau chaude' },
  { code: 'BAR-TH-168', cat: 'Solaire thermique', title: 'Dispositif solaire thermique', desc: 'Chauffe-eau solaire individuel', group: 'Eau chaude' },
  { code: 'BAR-TH-174', cat: 'Rénovation d\'ampleur', title: 'Rénovation d\'ampleur d\'une maison individuelle', desc: 'Rénovation globale par saut de classes DPE', group: 'Rénovation globale' },
  { code: 'BAR-TH-125', cat: 'VMC double flux', title: 'Ventilation double flux autoréglable ou modulée', desc: 'Ventilation mécanique double flux', group: 'Ventilation' },
  { code: 'BAR-TH-127', cat: 'VMC simple flux', title: 'Ventilation mécanique simple flux hygroréglable', desc: 'VMC simple flux hygroréglable', group: 'Ventilation' },
  { code: 'VISITE-TECHNIQUE', cat: 'Visite technique', title: 'Visite technique / audit', desc: 'Audit énergétique préalable, sans engagement contractuel', group: 'Services' },
]
