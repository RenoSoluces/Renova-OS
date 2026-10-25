import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { couleurResultat, type Porte } from '../../lib/terrain/tournees'

interface Props {
  portes: Porte[]
  selectionId: string | null
  position: { lat: number; lng: number } | null
  /** Incrémenté par la page pour recentrer la carte (ex. bouton « ma position »). */
  recentrage: number
  visible: boolean
  onSelect: (id: string) => void
  onClicCarte: (lat: number, lng: number) => void
}

const CENTRE_FRANCE: L.LatLngTuple = [46.6, 2.5]

function icone(p: Porte, index: number, actif: boolean) {
  return L.divIcon({
    className: 'tr-pin-conteneur',
    html: `<span class="tr-pin ${actif ? 'actif' : ''}" style="--pin:${couleurResultat(p.resultat)}"><b>${index}</b></span>`,
    iconSize: [34, 42], iconAnchor: [17, 40],
  })
}

export function CarteTournee({ portes, selectionId, position, recentrage, visible, onSelect, onClicCarte }: Props) {
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<L.Map | null>(null)
  const calque = useRef<L.LayerGroup | null>(null)
  const moi = useRef<L.CircleMarker | null>(null)
  const rappels = useRef({ onSelect, onClicCarte })
  rappels.current = { onSelect, onClicCarte }
  const dejaCadre = useRef(false)

  useEffect(() => {
    if (!conteneur.current || carte.current) return
    const m = L.map(conteneur.current, { zoomControl: false, attributionControl: true }).setView(CENTRE_FRANCE, 6)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m)
    calque.current = L.layerGroup().addTo(m)
    m.on('click', e => rappels.current.onClicCarte(e.latlng.lat, e.latlng.lng))
    carte.current = m
    return () => { m.remove(); carte.current = null }
  }, [])

  // Redessine les punaises
  useEffect(() => {
    const m = carte.current, g = calque.current
    if (!m || !g) return
    g.clearLayers()
    portes.forEach((p, i) => {
      L.marker([p.lat, p.lng], { icon: icone(p, i + 1, p.id === selectionId), keyboard: true, title: `${p.adresse || 'Porte'} — ${p.resultat}` })
        .on('click', () => rappels.current.onSelect(p.id)).addTo(g)
    })
    if (!dejaCadre.current && portes.length) {
      dejaCadre.current = true
      m.fitBounds(L.latLngBounds(portes.map(p => [p.lat, p.lng] as L.LatLngTuple)), { padding: [40, 40], maxZoom: 17 })
    }
  }, [portes, selectionId])

  // Position de l'utilisateur
  useEffect(() => {
    const m = carte.current
    if (!m || !position) return
    if (!moi.current) moi.current = L.circleMarker([position.lat, position.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#3A86C8', fillOpacity: 1 }).addTo(m)
    else moi.current.setLatLng([position.lat, position.lng])
  }, [position])

  useEffect(() => {
    if (carte.current && position && recentrage > 0) carte.current.setView([position.lat, position.lng], Math.max(carte.current.getZoom(), 17))
  }, [recentrage]) // eslint-disable-line react-hooks/exhaustive-deps

  // La carte doit recalculer sa taille quand elle réapparaît (bascule carte / liste sur mobile)
  useEffect(() => { if (visible) setTimeout(() => carte.current?.invalidateSize(), 60) }, [visible])

  // Recentre sur la porte sélectionnée
  useEffect(() => {
    const p = portes.find(x => x.id === selectionId)
    if (p && carte.current) carte.current.panTo([p.lat, p.lng])
  }, [selectionId]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={conteneur} className="tr-carte" role="application" aria-label="Carte de la tournée" />
}
