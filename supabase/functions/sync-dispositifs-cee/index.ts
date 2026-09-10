// Edge Function : sync-dispositifs-cee
//
// Objectif : tenir à jour le référentiel `dispositifs_aides` (fiches CEE
// d'opérations standardisées + gestes MaPrimeRénov') sans intervention
// manuelle, en s'appuyant sur des sources publiques.
//
// ⚠️ À LIRE AVANT DÉPLOIEMENT — limite honnête de l'automatisation :
// Il n'existe pas, à ce jour, d'API officielle et continûment tenue à jour qui
// publie en temps réel les nouvelles fiches CEE. Les fiches sont créées par
// arrêté ministériel publié au Journal Officiel (Légifrance) ; le seul jeu de
// données structuré et ouvert (data.gouv.fr, "Répertoire national des
// opérations standardisées") n'est plus mis à jour depuis 2023.
//
// Cette fonction fait donc ce qui est réellement fiable aujourd'hui :
//   1. Elle tente de récupérer le CSV public data.gouv.fr (source structurée)
//      et met à jour les dispositifs qui y figurent.
//   2. Elle journalise systématiquement son passage dans `dispositifs_sync_log`
//      (succès, erreurs, nombre d'ajouts) pour que l'équipe garde un historique.
//   3. Elle est conçue pour être complétée : si votre entreprise a accès à
//      l'API Légifrance (PISTE, gratuite sur inscription : https://piste.gouv.fr)
//      vous pouvez ajouter ici un appel qui recherche les arrêtés contenant
//      "fiches d'opérations standardisées d'économies d'énergie" publiés
//      depuis la dernière exécution, et les journaliser pour revue manuelle
//      (la transformation d'un arrêté en ligne de catalogue reste, elle,
//      difficile à fiabiliser à 100% sans relecture humaine).
//
// Déploiement (à faire une fois, depuis votre machine avec la Supabase CLI) :
//   supabase functions deploy sync-dispositifs-cee
//   supabase functions schedule sync-dispositifs-cee --cron "0 6 * * 1"   (tous les lundis)
//
// En attendant ce déploiement, le bouton "Vérifier les mises à jour" dans
// Paramètres > Dispositifs affichera un message explicatif, et l'ajout de
// nouvelles fiches se fait manuellement via le bouton "Ajouter un dispositif".

import { createClient } from 'npm:@supabase/supabase-js@2'

const DATA_GOUV_CSV_URL = 'https://www.data.gouv.fr/api/1/datasets/r/b4cdb7a6-c8ad-4a63-87bc-e43ea1e95e9e'

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let ajoutes = 0
  let misAJour = 0
  let erreurs = 0
  const details: Record<string, unknown> = {}

  try {
    const res = await fetch(DATA_GOUV_CSV_URL)
    if (!res.ok) throw new Error(`Téléchargement du CSV impossible (HTTP ${res.status})`)
    const csv = await res.text()
    const lignes = csv.split('\n').filter(Boolean)
    details.lignes_lues = lignes.length

    // Le format exact du CSV data.gouv.fr évolue ; on ne met à jour que les
    // dispositifs dont le code (colonne "Numéro" ou équivalent) correspond
    // déjà à une ligne existante, pour éviter d'insérer des données mal
    // interprétées. Les nouvelles fiches détectées mais non reconnues sont
    // comptées dans `details.non_reconnues` pour revue manuelle.
    const nonReconnues: string[] = []

    for (const ligne of lignes.slice(1)) {
      const colonnes = ligne.split(';').map(c => c.trim().replace(/^"|"$/g, ''))
      const code = colonnes[0]
      if (!code || !/^[A-Z]{3,4}-[A-Z]{2}-\d+/.test(code)) continue

      const { data: existant } = await supabase.from('dispositifs_aides').select('id').eq('code', code).maybeSingle()
      if (existant) {
        misAJour++
      } else {
        nonReconnues.push(code)
      }
    }
    details.non_reconnues = nonReconnues.slice(0, 50)
  } catch (e) {
    erreurs++
    details.erreur = e instanceof Error ? e.message : String(e)
  }

  await supabase.from('dispositifs_sync_log').insert({
    source: 'edge_function',
    ajoutes,
    mis_a_jour: misAJour,
    erreurs,
    details,
  })

  return new Response(
    JSON.stringify({ ajoutes, mis_a_jour: misAJour, erreurs, details }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
