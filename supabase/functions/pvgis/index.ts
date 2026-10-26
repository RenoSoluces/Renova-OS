/**
 * Production photovoltaïque PVGIS (Centre commun de recherche de la Commission européenne) pour une
 * adresse : production mensuelle d'1 kWc selon la position, l'inclinaison et l'azimut du toit.
 * L'API PVGIS n'accepte pas les appels directs depuis le navigateur : cette fonction sert de relais.
 *
 * POST { lat, lon, inclinaison, azimut }  →  { mensuel: number[12], annuel, source }
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  let b: { lat?: number; lon?: number; inclinaison?: number; azimut?: number }
  try { b = await req.json() } catch { return json({ error: 'Requête invalide.' }, 400) }
  const lat = Number(b.lat), lon = Number(b.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 41 || lat > 52 || lon < -5.5 || lon > 10) return json({ error: 'Position hors de France métropolitaine.' }, 400)
  const angle = Math.min(90, Math.max(0, Number(b.inclinaison ?? 30)))
  const aspect = Math.min(180, Math.max(-180, Number(b.azimut ?? 0)))
  const url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&peakpower=1&loss=14&angle=${angle}&aspect=${aspect}&outputformat=json`
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!r.ok) return json({ error: `PVGIS a répondu ${r.status}.` }, 502)
    const d = await r.json()
    const mensuel = (d?.outputs?.monthly?.fixed || []).sort((a: any, z: any) => a.month - z.month).map((m: any) => Math.round(Number(m.E_m) * 10) / 10)
    if (mensuel.length !== 12) return json({ error: 'Réponse PVGIS incomplète.' }, 502)
    return json({ mensuel, annuel: Math.round(Number(d.outputs.totals.fixed.E_y)), source: 'PVGIS 5.3 (Commission européenne, JRC)' })
  } catch (e) {
    return json({ error: `PVGIS indisponible : ${e instanceof Error ? e.message : 'erreur'}` }, 502)
  }
})
