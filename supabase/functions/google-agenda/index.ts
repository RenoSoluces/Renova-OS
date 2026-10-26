import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Synchronisation Google Agenda, dans les deux sens.
 *
 * POST { action: 'demarrer', retour }  → URL d'autorisation Google (utilisateur connecté)
 * GET  ?code=…&state=…                 → retour de Google : enregistre la connexion puis renvoie vers l'app
 * POST { action: 'synchroniser' }      → envoie les RDV Renova OS vers Google et importe les événements Google
 * POST { action: 'deconnecter' }       → révoque l'accès et oublie la connexion
 *
 * verify_jwt = false : Google rappelle cette adresse sans session Supabase. Les actions POST vérifient
 * elles-mêmes la session ; le retour de Google est protégé par un « state » signé (HMAC) et daté.
 * Secrets requis : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */

const SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events'
const FUSEAU = 'Europe/Paris'
const ORIGINES_APP = [
  'https://renova-os.netlify.app',
  'http://localhost:5173',
  ...(Deno.env.get('APP_ORIGINS') || '').split(',').map(o => o.trim()).filter(Boolean),
]

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ORIGINES_APP.includes(origin) ? origin : ORIGINES_APP[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
})
const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } })

const env = (k: string) => Deno.env.get(k) || ''
const urlFonction = () => `${env('SUPABASE_URL')}/functions/v1/google-agenda`

/* ------------------------------------------------------------------ state signé */

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0))

async function cleHmac() {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env('SUPABASE_SERVICE_ROLE_KEY')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
async function signer(donnees: Record<string, unknown>) {
  const charge = b64url(new TextEncoder().encode(JSON.stringify(donnees)))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await cleHmac(), new TextEncoder().encode(charge)))
  return `${charge}.${b64url(sig)}`
}
async function verifier(state: string): Promise<Record<string, any> | null> {
  const [charge, sig] = state.split('.')
  if (!charge || !sig) return null
  const ok = await crypto.subtle.verify('HMAC', await cleHmac(), deB64url(sig), new TextEncoder().encode(charge))
  if (!ok) return null
  const donnees = JSON.parse(new TextDecoder().decode(deB64url(charge)))
  return typeof donnees.exp === 'number' && donnees.exp > Date.now() ? donnees : null
}

/* ------------------------------------------------------------------ Google */

async function jetonAcces(refreshToken: string): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), refresh_token: refreshToken, grant_type: 'refresh_token' }),
  })
  const d = await r.json()
  if (!r.ok || !d.access_token) throw new Error(d.error === 'invalid_grant' ? 'ACCES_REVOQUE' : `Google : ${d.error_description || d.error || r.status}`)
  return d.access_token
}

async function google(acces: string, chemin: string, init: RequestInit = {}) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3${chemin}`, {
    ...init,
    headers: { Authorization: `Bearer ${acces}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (r.status === 204) return { ok: true, status: 204, data: null as any }
  const data = await r.json().catch(() => null)
  return { ok: r.ok, status: r.status, data }
}

/** Date et heure locales (Europe/Paris) d'un instant. */
function enLocal(iso: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(iso)).map(p => [p.type, p.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, heure: `${parts.hour}:${parts.minute}` }
}

const ajouterJour = (date: string, n: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const LIBELLES_TYPE: Record<string, string> = { rdv: 'RDV', visite: 'Visite technique', formation: 'Formation' }

/* ------------------------------------------------------------------ Synchronisation */

async function synchroniser(admin: any, userId: string) {
  const { data: connexion } = await admin.from('google_agenda_connexions').select('*').eq('user_id', userId).maybeSingle()
  if (!connexion) return { erreur: 'Google Agenda n’est pas connecté.' }
  const agenda = encodeURIComponent(connexion.calendar_id || 'primary')
  let acces: string
  try { acces = await jetonAcces(connexion.refresh_token) } catch (e) {
    const message = (e as Error).message === 'ACCES_REVOQUE' ? 'L’accès à Google Agenda a été retiré : reconnectez votre agenda.' : (e as Error).message
    await admin.from('google_agenda_connexions').update({ derniere_erreur: message }).eq('user_id', userId)
    return { erreur: message }
  }

  const aujourdhui = enLocal(new Date().toISOString()).date
  const debut = ajouterJour(aujourdhui, -14)
  const fin = ajouterJour(aujourdhui, 120)
  let envoyes = 0, importes = 0, supprimes = 0

  // 1. Suppressions faites dans Renova OS.
  const { data: suppressions } = await admin.from('google_agenda_suppressions').select('google_event_id').eq('user_id', userId)
  for (const s of suppressions || []) {
    const r = await google(acces, `/calendars/${agenda}/events/${encodeURIComponent(s.google_event_id)}`, { method: 'DELETE' })
    if (r.ok || r.status === 404 || r.status === 410) {
      await admin.from('google_agenda_suppressions').delete().eq('user_id', userId).eq('google_event_id', s.google_event_id)
      supprimes++
    }
  }

  // 2. RDV Renova OS → Google.
  const { data: evenements } = await admin.from('planning_events')
    .select('id,titre,date,heure,type,adresse,notes,prospect_id,google_event_id,source')
    .eq('user_id', userId).eq('source', 'renova').gte('date', debut).lte('date', fin)
  const prospectIds = [...new Set((evenements || []).map((e: any) => e.prospect_id).filter(Boolean))]
  const { data: prospects } = prospectIds.length
    ? await admin.from('prospects').select('id,prenom,nom,raison_sociale,telephone,adresse,code_postal,ville').in('id', prospectIds)
    : { data: [] }
  const parId = new Map((prospects || []).map((p: any) => [p.id, p]))
  const idsRenovaDansGoogle = new Set<string>()

  for (const e of evenements || []) {
    const p: any = e.prospect_id ? parId.get(e.prospect_id) : null
    const contact = p ? (p.raison_sociale || `${p.prenom || ''} ${p.nom || ''}`.trim()) : ''
    const type = LIBELLES_TYPE[String(e.type || '').toLowerCase()] || ''
    const heure = /^\d{1,2}:\d{2}/.test(String(e.heure || '')) ? String(e.heure).slice(0, 5).padStart(5, '0') : null
    const corps: Record<string, unknown> = {
      summary: [type && !String(e.titre || '').toLowerCase().startsWith(type.toLowerCase()) ? type : '', e.titre || contact || 'Rendez-vous'].filter(Boolean).join(' · '),
      location: e.adresse || (p ? [p.adresse, p.code_postal, p.ville].filter(Boolean).join(', ') : undefined) || undefined,
      description: [contact && `Contact : ${contact}`, p?.telephone && `Téléphone : ${p.telephone}`, e.notes, 'Rendez-vous créé dans Renova OS'].filter(Boolean).join('\n'),
      extendedProperties: { private: { renova_id: e.id } },
    }
    if (heure) {
      const [h, m] = heure.split(':').map(Number)
      const finMinutes = Math.min(h * 60 + m + 60, 23 * 60 + 59)
      corps.start = { dateTime: `${e.date}T${heure}:00`, timeZone: FUSEAU }
      corps.end = { dateTime: `${e.date}T${String(Math.floor(finMinutes / 60)).padStart(2, '0')}:${String(finMinutes % 60).padStart(2, '0')}:00`, timeZone: FUSEAU }
    } else {
      corps.start = { date: e.date }
      corps.end = { date: ajouterJour(e.date, 1) }
    }
    let r = e.google_event_id
      ? await google(acces, `/calendars/${agenda}/events/${encodeURIComponent(e.google_event_id)}`, { method: 'PATCH', body: JSON.stringify(corps) })
      : { ok: false, status: 404, data: null as any }
    if (!r.ok && (r.status === 404 || r.status === 410)) {
      r = await google(acces, `/calendars/${agenda}/events`, { method: 'POST', body: JSON.stringify(corps) })
      if (r.ok && r.data?.id) await admin.from('planning_events').update({ google_event_id: r.data.id }).eq('id', e.id)
    }
    if (r.ok) { envoyes++; idsRenovaDansGoogle.add(r.data?.id || e.google_event_id) }
  }

  // 3. Événements Google → Renova OS (lecture seule dans l'app, marqués source « google »).
  const vus = new Set<string>()
  let pageToken = ''
  do {
    const params = new URLSearchParams({
      timeMin: new Date(`${debut}T00:00:00Z`).toISOString(), timeMax: new Date(`${ajouterJour(fin, 1)}T00:00:00Z`).toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '250', showDeleted: 'false',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const r = await google(acces, `/calendars/${agenda}/events?${params}`)
    if (!r.ok) break
    for (const g of r.data?.items || []) {
      if (g.status === 'cancelled' || g.extendedProperties?.private?.renova_id || idsRenovaDansGoogle.has(g.id)) continue
      const local = g.start?.dateTime ? enLocal(g.start.dateTime) : { date: g.start?.date, heure: '' }
      if (!local.date) continue
      vus.add(g.id)
      const ligne = {
        titre: String(g.summary || 'Occupé (Google Agenda)').slice(0, 200), date: local.date, heure: local.heure || null,
        type: 'google', adresse: g.location || null, notes: g.description ? String(g.description).slice(0, 2000) : null,
        user_id: userId, google_event_id: g.id, source: 'google',
      }
      const { data: existant } = await admin.from('planning_events').select('id').eq('user_id', userId).eq('google_event_id', g.id).eq('source', 'google').maybeSingle()
      if (existant) await admin.from('planning_events').update(ligne).eq('id', existant.id)
      else { await admin.from('planning_events').insert(ligne); importes++ }
    }
    pageToken = r.data?.nextPageToken || ''
  } while (pageToken)

  // Événements Google supprimés ou déplacés hors de la période.
  const { data: importesAvant } = await admin.from('planning_events').select('id,google_event_id')
    .eq('user_id', userId).eq('source', 'google').gte('date', debut).lte('date', fin)
  const aRetirer = (importesAvant || []).filter((x: any) => !vus.has(x.google_event_id)).map((x: any) => x.id)
  if (aRetirer.length) await admin.from('planning_events').delete().in('id', aRetirer)

  await admin.from('google_agenda_connexions').update({ derniere_synchro: new Date().toISOString(), derniere_erreur: null }).eq('user_id', userId)
  return { envoyes, importes, supprimes, retires: aRetirer.length }
}

/* ------------------------------------------------------------------ Point d'entrée */

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) })
  if (!env('GOOGLE_CLIENT_ID') || !env('GOOGLE_CLIENT_SECRET')) return json({ error: 'Google Agenda n’est pas configuré (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).' }, 503, origin)
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } })

  // Retour de Google après autorisation.
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const state = await verifier(url.searchParams.get('state') || '').catch(() => null)
    const retour = state?.retour && ORIGINES_APP.some(o => String(state.retour).startsWith(o)) ? String(state.retour) : `${ORIGINES_APP[0]}/app/planning`
    const rediriger = (statut: string) => Response.redirect(`${retour}${retour.includes('?') ? '&' : '?'}google=${statut}`, 302)
    if (!state || url.searchParams.get('error')) return rediriger(url.searchParams.get('error') === 'access_denied' ? 'refuse' : 'erreur')
    const code = url.searchParams.get('code')
    if (!code) return rediriger('erreur')
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), redirect_uri: urlFonction(), grant_type: 'authorization_code' }),
    })
    const jetons = await r.json()
    if (!r.ok || !jetons.access_token) return rediriger('erreur')
    let email: string | null = null
    try { email = JSON.parse(new TextDecoder().decode(deB64url(String(jetons.id_token).split('.')[1]))).email || null } catch { /* facultatif */ }
    const { data: existante } = await admin.from('google_agenda_connexions').select('refresh_token').eq('user_id', state.uid).maybeSingle()
    const refresh = jetons.refresh_token || existante?.refresh_token
    if (!refresh) return rediriger('erreur')
    await admin.from('google_agenda_connexions').upsert({ user_id: state.uid, google_email: email, refresh_token: refresh, connecte_le: new Date().toISOString(), derniere_erreur: null })
    await synchroniser(admin, state.uid).catch(() => null)
    return rediriger('ok')
  }

  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405, origin)
  const jeton = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: auth } = await admin.auth.getUser(jeton)
  if (!auth?.user) return json({ error: 'Session utilisateur invalide.' }, 401, origin)
  const userId = auth.user.id
  let body: { action?: string; retour?: string } = {}
  try { body = await req.json() } catch { /* corps vide */ }

  if (body.action === 'demarrer') {
    const retour = body.retour && ORIGINES_APP.some(o => String(body.retour).startsWith(o)) ? body.retour : `${ORIGINES_APP[0]}/app/planning`
    const state = await signer({ uid: userId, retour, exp: Date.now() + 15 * 60 * 1000 })
    const params = new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: urlFonction(), response_type: 'code', scope: SCOPES,
      access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state,
      login_hint: auth.user.email || '',
    })
    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, 200, origin)
  }

  if (body.action === 'synchroniser') {
    const resultat = await synchroniser(admin, userId)
    return json(resultat, 'erreur' in resultat ? 400 : 200, origin)
  }

  if (body.action === 'deconnecter') {
    const { data: connexion } = await admin.from('google_agenda_connexions').select('refresh_token').eq('user_id', userId).maybeSingle()
    if (connexion?.refresh_token) {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(connexion.refresh_token)}`, { method: 'POST' }).catch(() => null)
    }
    await admin.from('google_agenda_connexions').delete().eq('user_id', userId)
    await admin.from('google_agenda_suppressions').delete().eq('user_id', userId)
    await admin.from('planning_events').delete().eq('user_id', userId).eq('source', 'google')
    await admin.from('planning_events').update({ google_event_id: null }).eq('user_id', userId).eq('source', 'renova')
    return json({ success: true }, 200, origin)
  }

  return json({ error: 'Action inconnue.' }, 400, origin)
})
