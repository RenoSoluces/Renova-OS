import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const mailFrom = Deno.env.get('MAIL_FROM')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuration Supabase serveur manquante.' }, 500)
  if (!resendApiKey || !mailFrom) return json({ error: 'Envoi e-mail non configuré : renseignez RESEND_API_KEY et MAIL_FROM dans les secrets Supabase.' }, 503)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Authentification requise.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await adminClient.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Session utilisateur invalide.' }, 401)
  const { data: profile, error: profileError } = await adminClient.from('profiles').select('role,organisation_id').eq('id', userData.user.id).maybeSingle()
  if (profileError || !profile || !['admin', 'manager'].includes(profile.role)) return json({ error: 'Envoi réservé à l’administration.' }, 403)

  let payload: { storagePath?: string; recipient?: string; invoiceNumber?: string; partnerName?: string; dossierId?: string }
  try { payload = await req.json() } catch { return json({ error: 'Corps de requête invalide.' }, 400) }
  const { storagePath, recipient, invoiceNumber, partnerName, dossierId } = payload
  if (!storagePath || !recipient || !invoiceNumber) return json({ error: 'Chemin PDF, destinataire et numéro de facture sont obligatoires.' }, 400)
  if (!String(recipient).includes('@')) return json({ error: 'Adresse e-mail du partenaire invalide.' }, 400)

  const { data: file, error: fileError } = await adminClient.storage.from('documents').download(storagePath)
  if (fileError || !file) return json({ error: `PDF introuvable dans le stockage : ${fileError?.message || 'fichier manquant'}` }, 404)

  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)))
  const content = btoa(binary)
  // Émetteur : l'entreprise de l'utilisateur qui envoie (aucun nom d'entreprise codé en dur).
  const [{ data: emetteur }, { data: org }] = await Promise.all([
    adminClient.from('entreprises').select('raison_sociale').eq('organisation_id', profile.organisation_id || '').order('created_at').limit(1).maybeSingle(),
    adminClient.from('organisations').select('nom').eq('id', profile.organisation_id || '').maybeSingle(),
  ])
  const nomEmetteur = String(emetteur?.raison_sociale || org?.nom || '').replace(/[<>]/g, '').trim()
  const subject = `Facture ${invoiceNumber}${nomEmetteur ? ` — ${nomEmetteur}` : ''}`
  const html = `<p>Bonjour${partnerName ? ` ${String(partnerName).replace(/[<>]/g, '')}` : ''},</p><p>Veuillez trouver en pièce jointe la facture <strong>${String(invoiceNumber).replace(/[<>]/g, '')}</strong>${nomEmetteur ? ` émise par ${nomEmetteur}` : ''}${dossierId ? ` (référence ${String(dossierId).slice(0, 8)})` : ''}.</p><p>Merci de votre confiance.</p>${nomEmetteur ? `<p>${nomEmetteur}</p>` : ''}`
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mailFrom,
      to: [recipient],
      subject,
      html,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content }],
    }),
  })
  const result = await resendResponse.json().catch(() => ({}))
  if (!resendResponse.ok) return json({ error: result?.message || result?.error || `Le fournisseur e-mail a répondu ${resendResponse.status}.` }, 502)
  return json({ success: true, id: result?.id || null })
})
