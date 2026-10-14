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
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  if (!supabaseUrl || !serviceKey) return json({ error: 'Configuration Supabase serveur manquante.' }, 500)
  if (!openAiKey) return json({ error: 'Assistant IA non configuré : ajoutez OPENAI_API_KEY dans les secrets Supabase.' }, 503)
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Authentification requise.' }, 401)
  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Session utilisateur invalide.' }, 401)

  let body: { description?: string; photos?: string[]; publicCible?: string; catalogue?: Array<Record<string, unknown>> }
  try { body = await req.json() } catch { return json({ error: 'Requête invalide.' }, 400) }
  const description = String(body.description || '').slice(0, 12000)
  const photos = Array.isArray(body.photos) ? body.photos.filter(x => typeof x === 'string' && x.startsWith('data:image/')).slice(0, 5) : []
  const catalogue = Array.isArray(body.catalogue) ? body.catalogue.slice(0, 250) : []
  if (!description.trim() && photos.length === 0) return json({ error: 'Décrivez le besoin ou ajoutez une photo.' }, 400)
  if (catalogue.length === 0) return json({ error: 'Aucun produit du catalogue n’est disponible.' }, 400)
  // L'API ne reçoit jamais les prix, les forfaits de pose, les tarifs de zone ou les montants d'aides.
  const safeCatalogue = catalogue.map(p => ({ id: String(p.id || ''), nom: String(p.nom || ''), marque: String(p.marque || ''), reference: String(p.reference || ''), description: String(p.description || ''), categorie: String(p.categorie || ''), public_cible: String(p.public_cible || ''), caracteristiques: p.caracteristiques || {} }))
  const content: Array<Record<string, unknown>> = [{ type: 'text', text: `Public cible : ${String(body.publicCible || 'particulier')}\nDemande client : ${description || '(description absente, analyser les photos)'}\nCatalogue autorisé (utiliser exclusivement ces identifiants) : ${JSON.stringify(safeCatalogue)}\nRetourner uniquement un objet JSON avec une clé suggestions. Chaque suggestion doit contenir product_id, quantite entière et justification courte. Ne jamais créer de produit, inventer de référence, proposer un prix ou calculer un montant. Si aucun produit ne convient, retourner suggestions: [].` }]
  for (const photo of photos) content.push({ type: 'image_url', image_url: { url: photo } })

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Tu es un assistant de préparation de devis de rénovation énergétique. Tu ne fais que proposer des références déjà présentes dans le catalogue fourni. Tu ne fournis jamais de prix, de montant, de remise, d’aide financière ou de promesse d’éligibilité. Les prix seront lus par l’application depuis le catalogue. Sois prudent : si l’information est insuffisante, explique-le dans la justification et propose peu de lignes.' },
        { role: 'user', content },
      ],
    }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) return json({ error: result?.error?.message || `Le service IA a répondu ${response.status}.` }, 502)
  const raw = result?.choices?.[0]?.message?.content
  if (typeof raw !== 'string') return json({ error: 'Réponse IA inexploitable.' }, 502)
  try {
    const parsed = JSON.parse(raw)
    const validIds = new Set(safeCatalogue.map(p => p.id))
    const suggestions = (Array.isArray(parsed.suggestions) ? parsed.suggestions : []).filter((x: any) => validIds.has(String(x.product_id))).map((x: any) => ({
      product_id: String(x.product_id),
      quantite: Math.max(1, Math.min(100, Math.floor(Number(x.quantite) || 1))),
      justification: String(x.justification || 'Référence correspondante au besoin décrit.').slice(0, 500),
    }))
    return json({ suggestions })
  } catch {
    return json({ error: 'La réponse de l’assistant n’a pas pu être lue.' }, 502)
  }
})
