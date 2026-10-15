
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

const esc = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (ch) =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[ch] || ch,
  )

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const mailFrom = Deno.env.get('MAIL_FROM')

  if (!url || !serviceKey) {
    return json({ error: 'Configuration Supabase serveur manquante.' }, 500)
  }

  if (!resendKey || !mailFrom) {
    return json({ error: 'Configuration e-mail manquante.' }, 503)
  }

  const token = (req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')

  if (!token) {
    return json({ error: 'Authentification requise.' }, 401)
  }

  const supabase = createClient(url, serviceKey)
  const { data: auth, error: authError } =
    await supabase.auth.getUser(token)

  if (authError || !auth.user) {
    return json({ error: 'Session utilisateur invalide.' }, 401)
  }

  let body: { prospectIds?: string[] }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Requête invalide.' }, 400)
  }

  const ids = Array.isArray(body.prospectIds)
    ? [...new Set(body.prospectIds.map(String))].slice(0, 100)
    : []

  if (!ids.length) {
    return json({ error: 'Aucun prospect à notifier.' }, 400)
  }

  const [
    { data: prospects, error: prospectError },
    { data: admins, error: adminError },
  ] = await Promise.all([
    supabase
      .from('prospects')
      .select(
        'id,nom,prenom,raison_sociale,telephone,email,code_postal,ville,source,created_at',
      )
      .in('id', ids),

    supabase
      .from('profiles')
      .select('email,nom_complet')
      .eq('role', 'admin'),
  ])

  if (prospectError) {
    return json({ error: prospectError.message }, 500)
  }

  if (adminError) {
    return json({ error: adminError.message }, 500)
  }

  const recipients = [
    ...new Set(
      (admins || [])
        .map((admin) => String(admin.email || '').trim())
        .filter((email) => email.includes('@')),
    ),
  ]

  if (!recipients.length) {
    return json({
      error: 'Aucune adresse e-mail administrateur renseignée.',
    }, 400)
  }

  const rows = (prospects || []) as Array<{
    id: string
    nom: string | null
    prenom: string | null
    raison_sociale: string | null
    telephone: string | null
    email: string | null
    code_postal: string | null
    ville: string | null
    source: string | null
    created_at: string | null
  }>

  if (!rows.length) {
    return json({ error: 'Prospect(s) introuvable(s).' }, 404)
  }

  const single = rows.length === 1
  const title = single
    ? 'Un nouveau prospect vous attend'
    : `${rows.length} nouveaux prospects vous attendent`

  const htmlRows = rows.map((p) => {
    const name =
      `${p.prenom || ''} ${p.nom || ''}`.trim() ||
      p.raison_sociale ||
      'Non renseigné'

    const city = [p.code_postal, p.ville]
      .filter(Boolean)
      .join(' ') || 'Non renseignée'

    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e8edf2;color:#202b3c;font-weight:600;">
          ${esc(name)}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e8edf2;color:#344054;">
          ${esc(p.telephone || '—')}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e8edf2;color:#344054;word-break:break-word;">
          ${esc(p.email || '—')}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e8edf2;color:#344054;">
          ${esc(city)}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e8edf2;color:#344054;">
          ${esc(p.source || '—')}
        </td>
      </tr>
    `
  }).join('')

  const html = `
    <!doctype html>
    <html lang="fr">
      <body style="margin:0;padding:0;background:#f3f6f9;font-family:Arial,Helvetica,sans-serif;color:#202b3c;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${esc(title)} — notification Renova OS par Reno Soluces.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f9;padding:28px 12px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:760px;background:#ffffff;border-radius:12px;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:28px 24px;background:#ffffff;border-bottom:3px solid #e8a23a;">
                    <img
                      src="https://www.renosoluces.fr/Logo%20RenoSoluces.png"
                      alt="Reno Soluces"
                      width="210"
                      style="display:block;width:210px;max-width:100%;height:auto;border:0;"
                    />
                    <p style="margin:14px 0 0;color:#657184;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;">
                      Notification Renova OS
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:30px 24px 18px;">
                    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#17365d;">
                      ${esc(title)}
                    </h1>
                    <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#475467;">
                      Bonjour,
                    </p>
                    <p style="margin:0;font-size:15px;line-height:1.7;color:#475467;">
                      ${single
                        ? 'Un nouveau prospect vient d’être enregistré dans Renova OS.'
                        : `${rows.length} nouveaux prospects viennent d’être enregistrés dans Renova OS.`}
                      Voici les informations disponibles :
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 16px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-size:13px;">
                      <thead>
                        <tr style="background:#17365d;color:#ffffff;text-align:left;">
                          <th style="padding:12px;">Nom</th>
                          <th style="padding:12px;">Téléphone</th>
                          <th style="padding:12px;">E-mail</th>
                          <th style="padding:12px;">Ville</th>
                          <th style="padding:12px;">Source</th>
                        </tr>
                      </thead>
                      <tbody>${htmlRows}</tbody>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:8px 24px 32px;">
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#475467;">
                      Connectez-vous à votre espace pour consulter les fiches et organiser les relances.
                    </p>
                    <a
                      href="https://renova-os.netlify.app/"
                      style="display:inline-block;background:#17365d;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 26px;border-radius:6px;"
                    >
                      Ouvrir Renova OS
                    </a>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:20px 24px;background:#f8fafc;border-top:1px solid #e8edf2;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#17365d;">
                      Reno Soluces
                    </p>
                    <p style="margin:0;font-size:12px;line-height:1.6;color:#667085;">
                      Cet e-mail est une notification automatique de Renova OS.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `

  const subject = single
    ? `Nouveau prospect — ${rows[0].prenom || ''} ${rows[0].nom || rows[0].raison_sociale || ''}`.trim()
    : `${rows.length} nouveaux prospects — Renova OS`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: mailFrom,
      to: recipients,
      subject,
      html,
    }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    return json({
      error:
        result?.message ||
        result?.error ||
        `Le service e-mail a répondu ${response.status}.`,
    }, 502)
  }

  return json({
    success: true,
    count: rows.length,
    recipients: recipients.length,
  })
})
