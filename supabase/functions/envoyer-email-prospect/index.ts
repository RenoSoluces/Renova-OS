import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Envoi d'un e-mail à un prospect depuis Renova OS (suivi de RDV, relance de devis…).
 *
 * - Le prospect doit être visible par le commercial (contrôle par la RLS, avec la session de l'appelant).
 * - L'e-mail part de MAIL_FROM via Resend, avec le commercial en « Répondre à » : les réponses arrivent
 *   directement dans sa boîte.
 * - L'échange est ajouté à l'historique du prospect (interactions, type « email »).
 * - piece_jointe (facultatif) : chemin d'un document du prospect dans le stockage « documents » (ex. devis
 *   signé) ; il doit figurer dans la table documents pour ce prospect, visible par le commercial.
 * Sans RESEND_API_KEY / MAIL_FROM, la fonction répond 503 { non_configure: true } : l'app ouvre alors
 * la messagerie du téléphone avec le message pré-rempli.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const echapper = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function html(message: string, signature: { nom: string; telephone: string; entreprise: string }) {
  const corps = echapper(message).split(/\n{2,}/).map(par => `<p style="margin:0 0 14px;line-height:1.55">${par.replace(/\n/g, '<br>')}</p>`).join('')
  const sig = [signature.nom && `<b>${echapper(signature.nom)}</b>`, signature.entreprise && echapper(signature.entreprise), signature.telephone && echapper(signature.telephone)].filter(Boolean).join('<br>')
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1F2A24;font-size:15px">
<div style="max-width:600px;padding:24px 18px">${corps}<p style="margin:22px 0 0;line-height:1.5;color:#3d4a43">${sig}</p></div></body></html>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Configuration serveur manquante.' }, 500)

  const authorization = req.headers.get('Authorization') || ''
  if (!/^Bearer\s+/i.test(authorization)) return json({ error: 'Authentification requise.' }, 401)

  let body: { prospect_id?: string; sujet?: string; message?: string; modele?: string; piece_jointe?: string }
  try { body = await req.json() } catch { return json({ error: 'Corps de requête invalide.' }, 400) }
  const sujet = String(body.sujet || '').trim().slice(0, 200)
  const message = String(body.message || '').trim().slice(0, 10000)
  if (!body.prospect_id || !sujet || !message) return json({ error: 'Prospect, objet et message sont obligatoires.' }, 400)

  // Client « utilisateur » : la RLS décide si le commercial a accès au prospect.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Session utilisateur invalide.' }, 401)

  const { data: prospect, error: prospectError } = await userClient.from('prospects').select('id,email,prenom,nom').eq('id', body.prospect_id).maybeSingle()
  if (prospectError || !prospect) return json({ error: 'Prospect introuvable ou non autorisé.' }, 404)
  if (!prospect.email || !String(prospect.email).includes('@')) return json({ error: 'Ce prospect n’a pas d’adresse e-mail valide.' }, 400)

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: profil } = await admin.from('profiles').select('nom_complet,email,telephone,organisation_id').eq('id', authData.user.id).maybeSingle()
  const { data: organisation } = profil?.organisation_id
    ? await admin.from('organisations').select('nom').eq('id', profil.organisation_id).maybeSingle()
    : { data: null }

  // Pièce jointe : uniquement un document déjà rattaché à ce prospect (contrôle RLS avec la session de l'appelant).
  let attachments: { filename: string; content: string }[] | undefined
  if (body.piece_jointe) {
    const chemin = String(body.piece_jointe)
    const { data: doc } = await userClient.from('documents').select('nom,url').eq('prospect_id', prospect.id).eq('url', chemin).limit(1).maybeSingle()
    if (!doc) return json({ error: 'Pièce jointe introuvable pour ce client.' }, 404)
    const { data: fichier, error: dlError } = await admin.storage.from('documents').download(chemin)
    if (dlError || !fichier) return json({ error: 'Pièce jointe illisible.' }, 500)
    if (fichier.size > 15 * 1024 * 1024) return json({ error: 'Pièce jointe trop volumineuse.' }, 413)
    const octets = new Uint8Array(await fichier.arrayBuffer())
    let binaire = ''
    for (let i = 0; i < octets.length; i += 0x8000) binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000))
    attachments = [{ filename: String(doc.nom || 'document.pdf').replace(/[^\w.\- ]+/g, '_'), content: btoa(binaire) }]
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const mailFrom = Deno.env.get('MAIL_FROM')
  if (!resendApiKey || !mailFrom) return json({ error: 'Envoi automatique non configuré.', non_configure: true }, 503)

  // « Prénom Nom via Renova OS <adresse MAIL_FROM> » : l'adresse d'envoi reste celle du domaine vérifié.
  const adresseFrom = (mailFrom.match(/<([^>]+)>/)?.[1] || mailFrom).trim()
  const nomExpediteur = profil?.nom_complet ? `${profil.nom_complet} – ${organisation?.nom || 'Renova OS'}` : (organisation?.nom || 'Renova OS')
  const replyTo = profil?.email || authData.user.email || undefined

  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${nomExpediteur.replace(/[<>"]/g, '')} <${adresseFrom}>`,
      to: [prospect.email],
      reply_to: replyTo ? [replyTo] : undefined,
      subject: sujet,
      text: message,
      attachments,
      html: html(message, { nom: profil?.nom_complet || '', telephone: profil?.telephone || '', entreprise: organisation?.nom || '' }),
    }),
  })
  const resultat = await reponse.json().catch(() => ({}))
  if (!reponse.ok) return json({ error: resultat?.message || `Le fournisseur e-mail a répondu ${reponse.status}.` }, 502)

  await userClient.from('interactions').insert({
    prospect_id: prospect.id, type: 'email', contenu: `E-mail envoyé : ${sujet}\n\n${message}`.slice(0, 4000),
    auteur: profil?.nom_complet || authData.user.email, meta: { canal: 'email', modele: body.modele || null, envoi: 'resend', message_id: resultat?.id || null, piece_jointe: body.piece_jointe || null },
  })

  return json({ success: true, id: resultat?.id || null })
})
