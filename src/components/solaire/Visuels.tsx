import { useId } from 'react'
import { MOIS, ORIENTATIONS, type OrientationToit, type ResultatSolaire } from '../../lib/photovoltaique/simulateurSolaire'

const COULEURS = {
  auto: '#2D6A4F', surplus: '#E8B04A', conso: '#1A1A1A', prod: '#52B788',
  soleil: '#F4B63F', positif: '#2D8659', negatif: '#D9822B',
}

export const euro = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`
export const kwh = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} kWh`

/* ------------------------------------------------------------------ Schéma de toiture */

interface SchemaProps {
  orientation: OrientationToit
  inclinaisonDeg: number | null
  nombrePanneaux: number
  puissanceKwc: number
  surfaceNecessaireM2: number
}

export function SchemaToiture({ orientation, inclinaisonDeg, nombrePanneaux, puissanceKwc, surfaceNecessaireM2 }: SchemaProps) {
  const id = useId().replace(/:/g, '')
  const o = ORIENTATIONS.find(x => x.value === orientation) ?? ORIENTATIONS[0]
  const incl = Math.max(0, Math.min(60, inclinaisonDeg ?? 30))

  // Pan de toiture (trapèze vu en perspective) et grille de panneaux
  const base = { gauche: 92, droite: 428, y: 184 }
  const haut = { gauche: 142, droite: 378, y: 92 }
  const n = Math.max(0, Math.min(nombrePanneaux, 24))
  const lignes = n > 12 ? 3 : n > 4 ? 2 : 1
  const colonnes = Math.max(1, Math.ceil(n / lignes))
  const cellules: { pts: string; cle: string }[] = []
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const marge = 0.06
  for (let r = 0; r < lignes; r++) {
    const t0 = lerp(marge, 1 - marge, r / lignes), t1 = lerp(marge, 1 - marge, (r + 1) / lignes - 0.03)
    const y0 = lerp(base.y, haut.y, t0), y1 = lerp(base.y, haut.y, t1)
    const x = (t: number, u: number) => lerp(lerp(base.gauche, haut.gauche, t), lerp(base.droite, haut.droite, t), u)
    const restant = Math.min(colonnes, n - r * colonnes)
    for (let c = 0; c < restant; c++) {
      const u0 = lerp(0.07, 0.93, c / colonnes), u1 = lerp(0.07, 0.93, (c + 1) / colonnes - 0.012)
      cellules.push({
        cle: `${r}-${c}`,
        pts: `${x(t0, u0)},${y0} ${x(t0, u1)},${y0} ${x(t1, u1)},${y1} ${x(t1, u0)},${y1}`,
      })
    }
  }

  // Encart "profil du toit" : angle d'inclinaison
  const rad = (incl * Math.PI) / 180
  const longueur = 78
  const px = 46, py = 286
  const sommet = { x: px + Math.cos(rad) * longueur, y: py - Math.sin(rad) * longueur }

  return (
    <svg className="sol-svg" viewBox="0 0 520 330" role="img" aria-label={`Schéma de la toiture : ${nombrePanneaux} panneaux, orientation ${o.label}, inclinaison ${incl}°`}>
      <defs>
        <linearGradient id={`ciel${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#CFEBF7" /><stop offset="1" stopColor="#F7F3E4" />
        </linearGradient>
        <linearGradient id={`toit${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8A5B45" /><stop offset="1" stopColor="#6E4535" />
        </linearGradient>
        <linearGradient id={`pv${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#254E7B" /><stop offset="1" stopColor="#12304F" />
        </linearGradient>
        <radialGradient id={`halo${id}`}><stop offset="0" stopColor={COULEURS.soleil} stopOpacity=".55" /><stop offset="1" stopColor={COULEURS.soleil} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="520" height="330" rx="16" fill={`url(#ciel${id})`} />
      {/* soleil + trajectoire */}
      <path d="M40 150 Q260 -20 480 150" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeDasharray="3 7" />
      <circle cx="420" cy="52" r="46" fill={`url(#halo${id})`} />
      <circle cx="420" cy="52" r="17" fill={COULEURS.soleil} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180
        return <line key={i} x1={420 + Math.cos(a) * 23} y1={52 + Math.sin(a) * 23} x2={420 + Math.cos(a) * 31} y2={52 + Math.sin(a) * 31} stroke={COULEURS.soleil} strokeWidth="2.4" strokeLinecap="round" />
      })}
      {/* sol */}
      <rect x="0" y="282" width="520" height="48" fill="#BFD8C2" />
      <rect x="0" y="282" width="520" height="3" fill="#9CC3A4" />
      {/* maison */}
      <rect x="112" y="184" width="296" height="98" fill="#F3EBDD" stroke="#D9CDB6" />
      <rect x="236" y="212" width="46" height="70" rx="3" fill="#7B5A47" />
      <circle cx="274" cy="248" r="2.4" fill="#E8B04A" />
      <rect x="140" y="208" width="62" height="44" rx="3" fill="#BFE3F2" stroke="#fff" strokeWidth="3" />
      <rect x="318" y="208" width="62" height="44" rx="3" fill="#BFE3F2" stroke="#fff" strokeWidth="3" />
      <line x1="171" y1="208" x2="171" y2="252" stroke="#fff" strokeWidth="2" /><line x1="349" y1="208" x2="349" y2="252" stroke="#fff" strokeWidth="2" />
      {/* toiture */}
      <polygon points={`${base.gauche},${base.y} ${base.droite},${base.y} ${haut.droite},${haut.y} ${haut.gauche},${haut.y}`} fill={`url(#toit${id})`} />
      <polygon points={`${base.gauche},${base.y} ${base.droite},${base.y} ${base.droite},${base.y + 7} ${base.gauche},${base.y + 7}`} fill="#523224" />
      {cellules.map(c => (
        <g key={c.cle} className="sol-panneau">
          <polygon points={c.pts} fill={`url(#pv${id})`} stroke="#CFD8E3" strokeWidth="1.2" />
        </g>
      ))}
      {n === 0 && <text x="260" y="140" textAnchor="middle" fontSize="13" fill="#F3EBDD">Choisissez une puissance</text>}

      {/* profil du toit */}
      <g transform="translate(0 -182)">
        <rect x="14" y="196" width="128" height="104" rx="12" fill="#fff" fillOpacity=".86" />
        <line x1={px} y1={py} x2={px + 86} y2={py} stroke="#7A7A7A" strokeWidth="2" />
        <line x1={px} y1={py} x2={sommet.x} y2={sommet.y} stroke="#6E4535" strokeWidth="5" strokeLinecap="round" />
        <path d={`M ${px + 34} ${py} A 34 34 0 0 0 ${px + 34 * Math.cos(rad)} ${py - 34 * Math.sin(rad)}`} fill="none" stroke={COULEURS.soleil} strokeWidth="2.6" />
        <text x={px + 42} y={py - 8} fontSize="13" fontWeight="700" fill="#1A1A1A">{incl}°</text>
        <text x="78" y="214" textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#4A4A4A" letterSpacing=".6">INCLINAISON</text>
      </g>

      {/* boussole */}
      <g transform="translate(446 258)">
        <circle r="44" fill="#fff" fillOpacity=".9" />
        <circle r="36" fill="none" stroke="#D9D5C8" />
        {[['N', 0, -26], ['E', 26, 4], ['S', 0, 33], ['O', -26, 4]].map(([t, x, y]) => (
          <text key={String(t)} x={Number(x)} y={Number(y)} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={t === 'N' ? '#D62828' : '#4A4A4A'}>{t}</text>
        ))}
        <g transform={`rotate(${o.angle})`}>
          <polygon points="0,-20 6,2 0,-3 -6,2" transform="rotate(180)" fill={COULEURS.auto} />
        </g>
        <circle r="3" fill="#fff" stroke={COULEURS.auto} strokeWidth="1.5" />
      </g>
      <text x="446" y="318" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1A1A1A">Toit orienté {o.label}</text>

      {/* légende */}
      <g transform="translate(208 304)">
        <text x="52" y="0" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#1A1A1A">{nombrePanneaux} panneaux · {puissanceKwc.toLocaleString('fr-FR')} kWc · {surfaceNecessaireM2.toLocaleString('fr-FR')} m²</text>
      </g>
    </svg>
  )
}

/* ------------------------------------------------------------------ Production mensuelle */

export function GraphiqueMensuel({ r }: { r: ResultatSolaire }) {
  const W = 560, H = 270, g = 44, d = 24, b = 34
  const maxVal = Math.max(...r.productionMensuelle, ...(r.consommationMensuelle ?? [0]), 1)
  const echelle = niceMax(maxVal)
  const h = H - d - b
  const largeur = (W - g - 10) / 12
  const y = (v: number) => d + h - (v / echelle) * h
  const t = r.tauxAutoconsommation
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * echelle)
  const ligneConso = r.consommationMensuelle?.map((v, i) => `${i ? 'L' : 'M'}${g + largeur * i + largeur / 2},${y(v)}`).join(' ')
  return (
    <svg className="sol-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Production mensuelle estimée comparée à la consommation">
      {ticks.map(v => (
        <g key={v}>
          <line x1={g} x2={W - 10} y1={y(v)} y2={y(v)} stroke="#E8E5DC" />
          <text x={g - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="#7A7A7A">{Math.round(v).toLocaleString('fr-FR')}</text>
        </g>
      ))}
      {r.productionMensuelle.map((v, i) => {
        const x = g + largeur * i + largeur * 0.16, w = largeur * 0.68
        const auto = r.autoconsommationMensuelle?.[i] ?? v * t
        return (
          <g key={i} className="sol-barre" style={{ animationDelay: `${i * 40}ms` }}>
            <rect x={x} y={y(v)} width={w} height={Math.max(0, y(auto) - y(v))} rx="3" fill={COULEURS.surplus} />
            <rect x={x} y={y(auto)} width={w} height={Math.max(0, d + h - y(auto))} fill={COULEURS.auto} />
            <text x={x + w / 2} y={H - 14} textAnchor="middle" fontSize="11" fill="#4A4A4A">{MOIS[i]}</text>
          </g>
        )
      })}
      {ligneConso && <path d={ligneConso} fill="none" stroke={COULEURS.conso} strokeWidth="2.2" strokeDasharray="5 4" strokeLinejoin="round" />}
      {r.consommationMensuelle?.map((v, i) => <circle key={i} cx={g + largeur * i + largeur / 2} cy={y(v)} r="3" fill="#fff" stroke={COULEURS.conso} strokeWidth="1.8" />)}
      <text x={g} y="9" fontSize="10.5" fill="#7A7A7A">kWh par mois</text>
    </svg>
  )
}

function niceMax(v: number): number {
  const pas = v > 1000 ? 200 : v > 400 ? 100 : 50
  return Math.ceil(v / pas) * pas
}

/* ------------------------------------------------------------------ Répartition autoconsommé / revendu */

export function DonutAutoconsommation({ r }: { r: ResultatSolaire }) {
  const R = 62, C = 2 * Math.PI * R
  const part = r.productionAnnuelle > 0 ? r.energieAutoconsommee / r.productionAnnuelle : 0
  return (
    <svg className="sol-svg sol-donut" viewBox="0 0 180 180" role="img" aria-label={`${Math.round(part * 100)} % de la production est autoconsommée`}>
      <circle cx="90" cy="90" r={R} fill="none" stroke={COULEURS.surplus} strokeWidth="22" />
      <circle cx="90" cy="90" r={R} fill="none" stroke={COULEURS.auto} strokeWidth="22" strokeDasharray={`${C * part} ${C}`} strokeLinecap="butt" transform="rotate(-90 90 90)" className="sol-arc" />
      <text x="90" y="88" textAnchor="middle" fontSize="30" fontWeight="700" fill="#1A1A1A" fontFamily="var(--font-display)">{Math.round(part * 100)}%</text>
      <text x="90" y="108" textAnchor="middle" fontSize="11" fill="#7A7A7A">autoconsommé</text>
    </svg>
  )
}

/* ------------------------------------------------------------------ Rentabilité sur 20 ans */

export function CourbeRentabilite({ r }: { r: ResultatSolaire }) {
  const id = useId().replace(/:/g, '')
  const W = 560, H = 280, g = 56, d = 18, b = 34
  const points = [{ annee: 0, cumul: -r.investissement }, ...r.trajectoire.map(p => ({ annee: p.annee, cumul: p.cumul }))]
  const min = Math.min(...points.map(p => p.cumul)), max = Math.max(...points.map(p => p.cumul), 0)
  const pad = (max - min) * 0.08 || 1
  const lo = min - pad, hi = max + pad
  const x = (a: number) => g + (a / 20) * (W - g - 14)
  const y = (v: number) => d + (1 - (v - lo) / (hi - lo)) * (H - d - b)
  const y0 = y(0)
  const ligne = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.annee)},${y(p.cumul)}`).join(' ')
  const aire = `${ligne} L${x(20)},${y0} L${x(0)},${y0} Z`
  const retour = r.delaiRetourAnnees
  const ticksY = [lo + pad, 0, hi - pad].map(v => Math.round(v / 1000) * 1000)
  return (
    <svg className="sol-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gain cumulé sur 20 ans, investissement déduit">
      <defs>
        <clipPath id={`haut${id}`}><rect x="0" y="0" width={W} height={y0} /></clipPath>
        <clipPath id={`bas${id}`}><rect x="0" y={y0} width={W} height={H - y0} /></clipPath>
      </defs>
      {ticksY.map((v, i) => (
        <g key={i}>
          <line x1={g} x2={W - 14} y1={y(v)} y2={y(v)} stroke={v === 0 ? '#7A7A7A' : '#E8E5DC'} strokeWidth={v === 0 ? 1.4 : 1} />
          <text x={g - 8} y={y(v) + 4} textAnchor="end" fontSize="10.5" fill="#7A7A7A">{v.toLocaleString('fr-FR')} €</text>
        </g>
      ))}
      <path d={aire} fill={COULEURS.positif} fillOpacity=".18" clipPath={`url(#haut${id})`} />
      <path d={aire} fill={COULEURS.negatif} fillOpacity=".2" clipPath={`url(#bas${id})`} />
      <path d={ligne} fill="none" stroke={COULEURS.auto} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="sol-ligne" />
      {[0, 5, 10, 15, 20].map(a => <text key={a} x={x(a)} y={H - 12} textAnchor="middle" fontSize="11" fill="#4A4A4A">{a === 0 ? 'Achat' : `An ${a}`}</text>)}
      {retour != null && retour <= 20 && (
        <g>
          <line x1={x(retour)} x2={x(retour)} y1={y0 - 34} y2={y0} stroke={COULEURS.positif} strokeDasharray="3 3" />
          <circle cx={x(retour)} cy={y0} r="6" fill="#fff" stroke={COULEURS.positif} strokeWidth="3" />
          <g transform={`translate(${Math.min(x(retour), W - 150)} ${y0 - 36})`}>
            <rect x="-6" y="-18" width="146" height="26" rx="13" fill={COULEURS.positif} />
            <text x="67" y="-1" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">Rentable en {retour.toLocaleString('fr-FR')} ans</text>
          </g>
        </g>
      )}
    </svg>
  )
}
