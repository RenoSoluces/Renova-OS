import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://renova-os.netlify.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
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
}

const staffRoles = new Set(['commercial', 'apporteur', 'teleconseiller'])
const leadershipRoles = new Set(['partner_admin', 'company_admin', 'manager', 'commercial_manager'])

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

  const organisationId = isGlobalAdmin ? String(body.organisation_id || '') : String(caller.organisation_id || '')
  if (!organisationId) return response({ error: 'Sélectionnez une entreprise.' }, 400, origin)

  const { data: organisation, error: orgError } = await adminClient
    .from('organisations')
    .select('id, type, actif')
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
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { nom_complet: nomComplet },
    redirectTo,
  })

  if (inviteError || !inviteData.user) {
    return response({ error: inviteError?.message || 'Invitation impossible.' }, 400, origin)
  }

  // The existing on_auth_user_created trigger creates a basic profile. Replace its
  // default role and attach the user to the approved organisation immediately.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      email,
      nom_complet: nomComplet,
      role: requestedRole,
      organisation_id: organisationId,
      manager_id: managerId,
    })
    .eq('id', inviteData.user.id)

  if (profileError) {
    await adminClient.auth.admin.deleteUser(inviteData.user.id)
    return response({ error: 'Le profil n’a pas pu être configuré. L’invitation a été annulée.' }, 500, origin)
  }

  return response({
    success: true,
    user: { id: inviteData.user.id, email, nom_complet: nomComplet, role: requestedRole },
  }, 201, origin)
})
