import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Invitation d'un membre (commercial, manager, dirigeant partenaire…).
 *
 * L'e-mail par défaut de Supabase (noreply@mail.app.supabase.io) arrive souvent en courrier indésirable,
 * voire pas du tout, et son quota est très faible. Cette fonction :
 *  1. crée le compte (ou réutilise un compte invité qui ne s'est jamais connecté),
 *  2. génère un lien d'activation,
 *  3. envoie un e-mail Renova OS via Resend si RESEND_API_KEY et MAIL_FROM sont configurés,
 *  4. renvoie toujours le lien à l'administrateur, qui peut le transmettre lui-même (e-mail, SMS, WhatsApp…).
 *
 * Le lien pointe directement vers l'application (?token_hash=…&type=…) : l'app valide le jeton
 * avec verifyOtp. Il ne dépend donc pas de la liste des URL de redirection autorisées de Supabase Auth.
 *
 * Mode « mot_de_passe » : le compte est créé avec un mot de passe provisoire (12 caractères minimum,
 * majuscule, chiffre et caractère spécial) que l'invitant transmet lui-même (WhatsApp, SMS…). Le
 * changement est imposé à la première connexion (métadonnée mot_de_passe_a_definir).
 * organisation_nom (Grand Admin) : crée l'entreprise partenaire puis invite son dirigeant.
 * Un apporteur invité est aussi ajouté au carnet « Mon réseau » (apporteurs_affaires).
 */

const allowedOrigins = new Set([
  'https://renova-os.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(Deno.env.get('APP_ORIGINS') || '').split(',').map(o => o.trim()).filter(Boolean),
])

function response(body: unknown, status = 200, origin: string | null = null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Headers'] = 'authorization, x-client-info, apikey, content-type'
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  }
  return new Response(JSON.stringify(body), { status, headers })
}

type InviteBody = {
  email?: string
  nom_complet?: string
  role?: string
  organisation_id?: string | null
  manager_id?: string | null
  mode?: 'lien' | 'mot_de_passe'
  mot_de_passe?: string
  organisation_nom?: string
  telephone?: string
}

const motDePasseValide = (m: string) => m.length >= 12 && /[A-Z]/.test(m) && /[a-z]/.test(m) && /\d/.test(m) && /[^A-Za-z0-9]/.test(m)

const staffRoles = new Set(['commercial', 'apporteur', 'teleconseiller'])
const leadershipRoles = new Set(['partner_admin', 'company_admin', 'manager', 'commercial_manager'])

const ROLE_LIBELLES: Record<string, string> = {
  admin: 'Grand Admin',
  manager: 'Manager',
  commercial_manager: 'Responsable commercial',
  partner_admin: 'Dirigeant partenaire',
  company_admin: 'Dirigeant',
  commercial: 'Commercial',
  apporteur: "Apporteur d'affaires",
  teleconseiller: 'Téléconseiller',
}

const echapper = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function emailInvitation(p: { nom: string; invitePar: string; organisation: string; role: string; lien: string; identifiant?: string; motDePasse?: string }) {
  const prenom = echapper(p.nom.split(' ')[0] || p.nom)
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F8F7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E3E9E5">
<tr><td style="background:#1B4332;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">Renova OS</td></tr>
<tr><td style="padding:28px">
<p style="font-size:16px;margin:0 0 14px">Bonjour ${prenom},</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${echapper(p.invitePar)} vous invite à rejoindre <b>${echapper(p.organisation)}</b> sur Renova OS, en tant que <b>${echapper(p.role)}</b>.</p>
${p.motDePasse
    ? `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">Vos identifiants de connexion :</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background:#F3F7F5;border-radius:10px;width:100%"><tr><td style="padding:14px 16px;font-size:14.5px;line-height:1.8">Identifiant : <b>${echapper(p.identifiant || '')}</b><br>Mot de passe provisoire : <b style="font-family:monospace">${echapper(p.motDePasse)}</b></td></tr></table>
<p style="font-size:13.5px;line-height:1.5;margin:0 0 22px;color:#4A5A52">Vous choisirez votre propre mot de passe à la première connexion.</p>
<p style="margin:0 0 26px"><a href="${p.lien}" style="display:inline-block;background:#1B4332;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:10px">Me connecter</a></p>`
    : `<p style="font-size:15px;line-height:1.55;margin:0 0 22px">Cliquez sur le bouton ci-dessous pour activer votre compte et choisir votre mot de passe.</p>
<p style="margin:0 0 26px"><a href="${p.lien}" style="display:inline-block;background:#1B4332;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:10px">Activer mon compte</a></p>`}
<p style="font-size:12.5px;line-height:1.5;color:#6B7A72;margin:0">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all">${p.lien}</span></p>
<p style="font-size:12.5px;line-height:1.5;color:#6B7A72;margin:14px 0 0">Ce lien est personnel et sa durée de validité est limitée. Si vous n’attendiez pas cette invitation, ignorez cet e-mail.</p>
</td></tr></table></td></tr></table></body></html>`
}

async function envoyerViaResend(destinataire: string, sujet: string, html: string): Promise<string | null> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const mailFrom = Deno.env.get('MAIL_FROM')
  if (!resendApiKey || !mailFrom) return 'non_configure'
  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: mailFrom, to: [destinataire], subject: sujet, html }),
  })
  if (reponse.ok) return null
  const detail = await reponse.json().catch(() => ({}))
  return detail?.message || detail?.error || `Resend a répondu ${reponse.status}`
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  if (req.method === 'OPTIONS') return response({ ok: true }, 200, origin)
  if (req.method !== 'POST') return response({ error: 'Méthode non autorisée.' }, 405, origin)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return response({ error: 'Configuration serveur Supabase manquante.' }, 500, origin)
  }

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return response({ error: 'Authentification requise.' }, 401, origin)

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !authData.user) {
    return response({ error: 'Session utilisateur invalide.' }, 401, origin)
  }

  let body: InviteBody
  try {
    body = await req.json()
  } catch {
    return response({ error: 'Corps de requête invalide.' }, 400, origin)
  }

  const email = String(body.email || '').trim().toLowerCase()
  const nomComplet = String(body.nom_complet || '').trim()
  const requestedRole = String(body.role || 'commercial')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !nomComplet) {
    return response({ error: 'Renseignez un nom complet et une adresse e-mail valide.' }, 400, origin)
  }

  const { data: caller, error: callerError } = await adminClient
    .from('profiles')
    .select('id, role, organisation_id, nom_complet')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (callerError || !caller) return response({ error: 'Profil Renova OS introuvable.' }, 403, origin)

  const isGlobalAdmin = caller.role === 'admin'
  const isCompanyLeader = ['partner_admin', 'company_admin'].includes(caller.role)
  const isManager = ['manager', 'commercial_manager'].includes(caller.role)
  if (!isGlobalAdmin && !isCompanyLeader && !isManager) {
    return response({ error: 'Vous ne disposez pas des droits pour inviter des utilisateurs.' }, 403, origin)
  }

  if (isGlobalAdmin) {
    if (!['admin', 'manager', 'commercial_manager', 'partner_admin', 'company_admin', ...staffRoles].includes(requestedRole)) {
      return response({ error: 'Rôle demandé non autorisé.' }, 400, origin)
    }
  } else if (isCompanyLeader) {
    if (![...staffRoles, 'commercial_manager'].includes(requestedRole)) {
      return response({ error: 'La direction partenaire peut inviter des membres de son entreprise, pas créer une autre direction.' }, 403, origin)
    }
  } else if (!staffRoles.has(requestedRole)) {
    return response({ error: 'Un manager ne peut inviter que des membres de son équipe.' }, 403, origin)
  }

  let organisationId = isGlobalAdmin ? String(body.organisation_id || '') : String(caller.organisation_id || '')
  const nouvelleOrganisation = String(body.organisation_nom || '').trim()
  if (isGlobalAdmin && !organisationId && nouvelleOrganisation) {
    const { data: existante } = await adminClient.from('organisations').select('id').ilike('nom', nouvelleOrganisation).maybeSingle()
    if (existante) organisationId = existante.id
    else {
      const { data: creee, error: creationError } = await adminClient.from('organisations').insert({ nom: nouvelleOrganisation, type: 'partenaire', actif: true }).select('id').single()
      if (creationError || !creee) return response({ error: 'Impossible de créer l’entreprise partenaire.' }, 400, origin)
      organisationId = creee.id
    }
  }
  if (!organisationId) return response({ error: 'Sélectionnez une entreprise.' }, 400, origin)

  const { data: organisation, error: orgError } = await adminClient
    .from('organisations')
    .select('id, nom, type, actif')
    .eq('id', organisationId)
    .maybeSingle()

  if (orgError || !organisation || !organisation.actif) {
    return response({ error: 'Entreprise introuvable ou inactive.' }, 400, origin)
  }
  if (!isGlobalAdmin && organisationId !== caller.organisation_id) {
    return response({ error: 'Vous ne pouvez inviter que dans votre entreprise.' }, 403, origin)
  }
  if (requestedRole === 'admin' && organisation.type !== 'interne') {
    return response({ error: 'Le rôle Grand Admin est réservé à l’entreprise interne.' }, 400, origin)
  }
  if (['partner_admin', 'company_admin'].includes(requestedRole) && organisation.type !== 'partenaire') {
    return response({ error: 'Le rôle de direction partenaire exige une entreprise partenaire.' }, 400, origin)
  }
  if (requestedRole === 'manager' && organisation.type !== 'interne') {
    return response({ error: 'Pour une entreprise partenaire, utilisez le rôle Responsable commercial.' }, 400, origin)
  }

  let managerId = body.manager_id ? String(body.manager_id) : null
  if (!isGlobalAdmin && !managerId) managerId = caller.id
  if (managerId) {
    const { data: manager, error: managerError } = await adminClient
      .from('profiles')
      .select('id, role, organisation_id')
      .eq('id', managerId)
      .maybeSingle()
    if (managerError || !manager || manager.organisation_id !== organisationId || !leadershipRoles.has(manager.role) && manager.role !== 'admin') {
      return response({ error: 'Le responsable doit appartenir à la même entreprise et avoir un rôle d’encadrement.' }, 400, origin)
    }
  }

  const redirectTo = Deno.env.get('APP_REDIRECT_URL') || 'https://renova-os.netlify.app/'
  const metadata = { nom_complet: nomComplet, mot_de_passe_a_definir: true }

  // Compte déjà créé ? On ne renvoie une invitation qu'à un compte qui ne s'est jamais connecté.
  const { data: profilExistant } = await adminClient.from('profiles').select('id, organisation_id').eq('email', email).maybeSingle()
  let userId: string | null = null
  let renvoi = false
  if (profilExistant) {
    const { data: existant } = await adminClient.auth.admin.getUserById(profilExistant.id)
    if (existant?.user?.last_sign_in_at) {
      return response({ error: 'Ce membre a déjà activé son compte. Il peut utiliser « Mot de passe oublié » sur l’écran de connexion.' }, 409, origin)
    }
    if (!isGlobalAdmin && profilExistant.organisation_id !== caller.organisation_id) {
      return response({ error: 'Cette adresse est déjà rattachée à une autre entreprise.' }, 409, origin)
    }
    userId = profilExistant.id
    renvoi = true
    await adminClient.auth.admin.updateUserById(userId, { user_metadata: metadata })
  }

  const mode = body.mode === 'mot_de_passe' ? 'mot_de_passe' : 'lien'
  const motDePasse = String(body.mot_de_passe || '')
  let lien = redirectTo
  if (mode === 'mot_de_passe') {
    if (!motDePasseValide(motDePasse)) {
      return response({ error: 'Mot de passe provisoire trop faible : 12 caractères minimum, avec majuscule, minuscule, chiffre et caractère spécial.' }, 400, origin)
    }
    if (renvoi && userId) {
      const { error: majError } = await adminClient.auth.admin.updateUserById(userId, { password: motDePasse, email_confirm: true, user_metadata: metadata })
      if (majError) return response({ error: majError.message }, 400, origin)
    } else {
      const { data: cree, error: creeError } = await adminClient.auth.admin.createUser({ email, password: motDePasse, email_confirm: true, user_metadata: metadata })
      if (creeError || !cree?.user) return response({ error: creeError?.message || 'Création du compte impossible.' }, 400, origin)
      userId = cree.user.id
    }
  } else {
    // Lien d'activation : « invite » pour un nouveau compte, « magiclink » pour un renvoi.
    const { data: lienData, error: lienError } = await adminClient.auth.admin.generateLink(
      renvoi
        ? { type: 'magiclink', email, options: { redirectTo } }
        : { type: 'invite', email, options: { data: metadata, redirectTo } },
    )
    if (lienError || !lienData?.user || !lienData.properties?.hashed_token) {
      return response({ error: lienError?.message || 'Impossible de générer le lien d’invitation.' }, 400, origin)
    }
    userId = lienData.user.id
    const typeLien = renvoi ? 'magiclink' : 'invite'
    lien = `${redirectTo.replace(/\/?$/, '/')}?token_hash=${encodeURIComponent(lienData.properties.hashed_token)}&type=${typeLien}`
  }
  if (!userId) return response({ error: 'Compte introuvable après création.' }, 500, origin)

  // Le déclencheur on_auth_user_created crée un profil de base : on fixe rôle et entreprise.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      email,
      nom_complet: nomComplet,
      role: requestedRole,
      organisation_id: organisationId,
      manager_id: managerId,
      ...(body.telephone ? { telephone: String(body.telephone).trim() } : {}),
    })
    .eq('id', userId)

  if (profileError) {
    if (!renvoi) await adminClient.auth.admin.deleteUser(userId)
    return response({ error: 'Le profil n’a pas pu être configuré. L’invitation a été annulée.' }, 500, origin)
  }

  // Un apporteur invité rejoint aussi le carnet « Mon réseau » de l'entreprise.
  if (requestedRole === 'apporteur') {
    const { data: dejaCarnet } = await adminClient.from('apporteurs_affaires').select('id').eq('organisation_id', organisationId).eq('email', email).maybeSingle()
    if (!dejaCarnet) {
      await adminClient.from('apporteurs_affaires').insert({ organisation_id: organisationId, nom: nomComplet, contact: nomComplet, email, telephone: body.telephone ? String(body.telephone).trim() : null, statut: 'actif', notes: 'Accès Renova OS créé', created_by: caller.id })
    }
  }

  // Envoi de l'e-mail via Resend (expéditeur de l'entreprise). Pas de repli sur l'e-mail Supabase :
  // il générerait un nouveau jeton et invaliderait le lien renvoyé à l'administrateur.
  const html = emailInvitation({
    nom: nomComplet,
    invitePar: caller.nom_complet || 'Votre responsable',
    organisation: organisation.nom,
    role: ROLE_LIBELLES[requestedRole] || requestedRole,
    lien,
    ...(mode === 'mot_de_passe' ? { identifiant: email, motDePasse } : {}),
  })
  const erreurResend = await envoyerViaResend(email, `${caller.nom_complet || 'Renova OS'} vous invite sur Renova OS`, html)
  const emailEnvoye = erreurResend === null
  const canal: 'resend' | 'aucun' = emailEnvoye ? 'resend' : 'aucun'
  const detailEnvoi: string | null = erreurResend && erreurResend !== 'non_configure' ? erreurResend : null

  return response({
    success: true,
    renvoi,
    email_envoye: emailEnvoye,
    canal,
    detail_envoi: detailEnvoi,
    lien,
    mode,
    organisation: { id: organisationId, nom: organisation.nom },
    user: { id: userId, email, nom_complet: nomComplet, role: requestedRole },
  }, 201, origin)
})
