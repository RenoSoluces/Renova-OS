import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Flux d'agenda ICS personnel (abonnement Google Agenda, Outlook, Apple Calendrier).
 *
 * GET /functions/v1/agenda-ics?jeton=<jeton secret>
 * Les applications d'agenda n'envoient pas de jeton de session : l'accès se fait par le jeton secret
 * propre à chaque utilisateur (table agenda_jetons, régénérable depuis l'app). verify_jwt = false.
 */

const echapper = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Plie les lignes à 75 octets comme l'exige la RFC 5545. */
function plier(ligne: string): string {
  const morceaux: string[] = []
  let reste = ligne
  while (new TextEncoder().encode(reste).length > 74) {
    let n = 74
    while (new TextEncoder().encode(reste.slice(0, n)).length > 74) n--
    morceaux.push(reste.slice(0, n))
    reste = ' ' + reste.slice(n)
  }
  morceaux.push(reste)
  return morceaux.join('\r\n')
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', 'TZID:Europe/Paris',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE',
]

const LIBELLES_TYPE: Record<string, string> = { rdv: 'RDV', visite: 'Visite technique', appel: 'Appel', installation: 'Installation', relance: 'Relance' }

function horodatage(d: Date) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Méthode non autorisée', { status: 405 })
  const url = new URL(req.url)
  const jeton = (url.searchParams.get('jeton') || '').trim()
  if (!/^[0-9a-f]{48}$/.test(jeton)) return new Response('Lien d’agenda invalide', { status: 404 })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return new Response('Configuration serveur manquante', { status: 500 })
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const { data: acces } = await admin.from('agenda_jetons').select('user_id').eq('jeton', jeton).maybeSingle()
  if (!acces) return new Response('Lien d’agenda invalide ou réinitialisé', { status: 404 })
  void admin.from('agenda_jetons').update({ dernier_acces: new Date().toISOString() }).eq('jeton', jeton)

  const depuis = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
  const { data: evenements, error } = await admin.from('planning_events')
    .select('id,titre,date,heure,type,adresse,notes,prospect_id,created_at')
    .eq('user_id', acces.user_id).gte('date', depuis).order('date').limit(1000)
  if (error) return new Response('Agenda indisponible', { status: 500 })

  const prospectIds = [...new Set((evenements || []).map(e => e.prospect_id).filter(Boolean))] as string[]
  const { data: prospects } = prospectIds.length
    ? await admin.from('prospects').select('id,prenom,nom,raison_sociale,telephone,adresse,code_postal,ville').in('id', prospectIds)
    : { data: [] as any[] }
  const parId = new Map((prospects || []).map(p => [p.id, p]))

  const maintenant = horodatage(new Date())
  const lignes = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reno Soluces//Renova OS//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Renova OS', 'X-WR-TIMEZONE:Europe/Paris', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    ...VTIMEZONE,
  ]
  for (const e of evenements || []) {
    const p = e.prospect_id ? parId.get(e.prospect_id) : null
    const contact = p ? (p.raison_sociale || `${p.prenom || ''} ${p.nom || ''}`.trim()) : ''
    const adresse = e.adresse || (p ? [p.adresse, p.code_postal, p.ville].filter(Boolean).join(', ') : '')
    const type = LIBELLES_TYPE[String(e.type || '').toLowerCase()] || ''
    const titre = [type && !String(e.titre || '').toLowerCase().startsWith(type.toLowerCase()) ? type : '', e.titre || contact || 'Rendez-vous'].filter(Boolean).join(' · ')
    const description = [contact && `Contact : ${contact}`, p?.telephone && `Téléphone : ${p.telephone}`, e.notes].filter(Boolean).join('\n')
    const jour = String(e.date).replace(/-/g, '')
    lignes.push('BEGIN:VEVENT', `UID:${e.id}@renova-os`, `DTSTAMP:${maintenant}`)
    const heure = /^\d{1,2}:\d{2}/.test(String(e.heure || '')) ? String(e.heure).slice(0, 5).padStart(5, '0') : null
    if (heure) {
      const [h, m] = heure.split(':').map(Number)
      const fin = h * 60 + m + 60
      const hFin = String(Math.min(23, Math.floor(fin / 60))).padStart(2, '0')
      const mFin = fin >= 24 * 60 ? '59' : String(fin % 60).padStart(2, '0')
      lignes.push(`DTSTART;TZID=Europe/Paris:${jour}T${heure.replace(':', '')}00`, `DTEND;TZID=Europe/Paris:${jour}T${hFin}${mFin}00`)
    } else {
      const lendemain = new Date(`${e.date}T00:00:00Z`); lendemain.setUTCDate(lendemain.getUTCDate() + 1)
      lignes.push(`DTSTART;VALUE=DATE:${jour}`, `DTEND;VALUE=DATE:${lendemain.toISOString().slice(0, 10).replace(/-/g, '')}`)
    }
    lignes.push(`SUMMARY:${echapper(titre)}`)
    if (adresse) lignes.push(`LOCATION:${echapper(adresse)}`)
    if (description) lignes.push(`DESCRIPTION:${echapper(description)}`)
    lignes.push('END:VEVENT')
  }
  lignes.push('END:VCALENDAR')

  return new Response(lignes.map(plier).join('\r\n') + '\r\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="renova-os.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
})
