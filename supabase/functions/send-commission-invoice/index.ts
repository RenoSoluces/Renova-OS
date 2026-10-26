import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const mailFrom = Deno.env.get('MAIL_FROM')
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Configuration Supabase serveur manquante.' }, 500)
  if (!resendApiKey || !mailFrom) return json({ error: 'Envoi e-mail non configuré : RESEND_API_KEY ou MAIL_FROM absent.' }, 503)

  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Authentification requise.' }, 401)

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Session utilisateur invalide.' }, 401)

  let payload: { factureId?: string }
  try { payload = await req.json() } catch { return json({ error: 'Corps de requête invalide.' }, 400) }
  if (!payload.factureId) return json({ error: 'Identifiant de facture manquant.' }, 400)

  const uid = userData.user.id
  const { data: profile, error: profileError } = await admin.from('profiles').select('role,organisation_id,nom_complet').eq('id', uid).maybeSingle()
  if (profileError || profile?.role !== 'apporteur') return json({ error: 'Envoi réservé à l’apporteur émetteur.' }, 403)

  const { data: invoice, error: invoiceError } = await admin
    .from('commission_factures')
    .select('id,commission_id,commercial_id,organisation_id,numero_facture_emise,montant_ht,taux_tva,date_emission,pdf_storage_path,statut,email_envoye_at')
    .eq('id', payload.factureId)
    .eq('commercial_id', uid)
    .maybeSingle()
  if (invoiceError || !invoice) return json({ error: 'Facture introuvable ou accès refusé.' }, 404)
  if (invoice.statut !== 'deposee') return json({ error: 'La facture doit être soumise avant son envoi.' }, 409)
  if (invoice.email_envoye_at) return json({ success: true, alreadySent: true })

  const { data: company, error: companyError } = await admin
    .from('entreprises')
    .select('raison_sociale,email,organisation_id')
    .eq('organisation_id', invoice.organisation_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (companyError || !company?.email || !company.email.includes('@')) {
    const message = 'Adresse e-mail de l’entreprise destinataire manquante dans Paramètres.'
    await admin.from('commission_factures').update({ email_erreur: message, updated_at: new Date().toISOString() }).eq('id', invoice.id)
    return json({ error: message }, 422)
  }
  if (!invoice.pdf_storage_path || !invoice.numero_facture_emise) {
    const message = 'Le numéro et le PDF de la facture sont obligatoires avant l’envoi.'
    await admin.from('commission_factures').update({ email_erreur: message, updated_at: new Date().toISOString() }).eq('id', invoice.id)
    return json({ error: message }, 422)
  }

  const { data: pdf, error: pdfError } = await admin.storage.from('commission-factures').download(invoice.pdf_storage_path)
  if (pdfError || !pdf) {
    const message = 'PDF introuvable dans le stockage privé.'
    await admin.from('commission_factures').update({ email_erreur: message, updated_at: new Date().toISOString() }).eq('id', invoice.id)
    return json({ error: message }, 404)
  }

  const bytes = new Uint8Array(await pdf.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)))
  const content = btoa(binary)
  const safeNumber = String(invoice.numero_facture_emise).replace(/[<>]/g, '')
  const safeName = String(profile.nom_complet || '').replace(/[<>]/g, '')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mailFrom,
      to: [company.email],
      subject: `Facture de commission ${safeNumber} — ${safeName || 'Apporteur'}`,
      html: `<p>Bonjour,</p><p>Veuillez trouver en pièce jointe la facture de commission <strong>${safeNumber}</strong> déposée par ${safeName || 'un apporteur d’affaires'}.</p><p>Montant : ${Number(invoice.montant_ht).toFixed(2)} € HT.</p><p>Cordialement,</p><p>${safeName || 'Apporteur d’affaires'}</p>`,
      attachments: [{ filename: `${safeNumber}.pdf`, content }],
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = result?.message || result?.error || `Le fournisseur e-mail a répondu ${response.status}.`
    await admin.from('commission_factures').update({ email_erreur: String(message).slice(0, 1000), updated_at: new Date().toISOString() }).eq('id', invoice.id)
    return json({ error: message }, 502)
  }

  await admin.from('commission_factures').update({
    email_envoye_at: new Date().toISOString(),
    email_erreur: null,
    updated_at: new Date().toISOString(),
  }).eq('id', invoice.id)
  return json({ success: true, id: result?.id || null })
})
