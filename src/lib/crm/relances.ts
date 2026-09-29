import { supabase } from '../supabase'

/** Un devis "envoyé" sans réponse depuis ce nombre de jours déclenche une relance. */
export const SEUIL_RELANCE_DEVIS_JOURS = 5

function joursDepuis(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Vérifie les devis "envoyés" sans réponse depuis trop longtemps et les tâches
 * en retard, et crée les tâches de relance / notifications correspondantes si
 * elles n'existent pas déjà (idempotent — peut être appelé à chaque ouverture
 * de l'application sans dupliquer les relances).
 *
 * Ceci tourne côté client, à l'ouverture de l'app : c'est une automatisation
 * "douce", suffisante pour une petite équipe qui utilise l'outil au quotidien.
 * Pour une vraie automatisation même app fermée (ex: relance à 6h du matin),
 * il faudrait déployer une Edge Function planifiée (même limite de
 * déploiement que pour la synchronisation des dispositifs d'aides).
 */
export async function verifierRelances(auteur: string | null) {
  await Promise.all([verifierDevisSansReponse(auteur), verifierTachesEnRetard()])
}

async function verifierDevisSansReponse(auteur: string | null) {
  const { data: devisEnvoyes } = await supabase
    .from('devis')
    .select('id, numero, prospect_id, statut, created_at, prospect:prospects(nom, prenom, commercial_id)')
    .eq('statut', 'envoye')

  for (const devis of devisEnvoyes || []) {
    if (joursDepuis(devis.created_at) < SEUIL_RELANCE_DEVIS_JOURS) continue

    // Déduplication : une relance déjà notifiée pour ce devis ?
    const { data: existante } = await supabase
      .from('notifications')
      .select('id')
      .eq('devis_id', devis.id)
      .eq('type', 'relance_devis')
      .maybeSingle()
    if (existante) continue

    const prospect = devis.prospect as any
    const recipientId = prospect?.commercial_id || null
    const nomClient = prospect ? `${prospect.prenom} ${prospect.nom}` : 'client'

    if (devis.prospect_id) {
      await supabase.from('tasks').insert({
        prospect_id: devis.prospect_id,
        titre: `Relancer le devis ${devis.numero}`,
        description: `Devis envoyé il y a ${joursDepuis(devis.created_at)} jours, toujours sans réponse.`,
        type: 'relance',
        priorite: 'haute',
        assigne: auteur || '',
        due_at: new Date().toISOString(),
      })
    }

    await supabase.from('notifications').insert({
      type: 'relance_devis',
      titre: `Devis ${devis.numero} sans réponse`,
      message: `${nomClient} n'a pas répondu depuis ${joursDepuis(devis.created_at)} jours. Une tâche de relance a été créée.`,
      prospect_id: devis.prospect_id,
      devis_id: devis.id,
      recipient_id: recipientId,
      meta: { devis_id: devis.id, kind: 'relance_devis' },
    })
  }
}

async function verifierTachesEnRetard() {
  const { data: tachesEnRetard } = await supabase
    .from('tasks')
    .select('id, titre, prospect_id, due_at, prospect:prospects(commercial_id)')
    .eq('done', false)
    .lt('due_at', new Date().toISOString())

  for (const tache of tachesEnRetard || []) {
    const { data: existante } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'tache_retard')
      .contains('meta', { task_id: tache.id })
      .maybeSingle()
    if (existante) continue

    const recipientId = (tache.prospect as any)?.commercial_id || null
    await supabase.from('notifications').insert({
      type: 'tache_retard',
      titre: 'Tâche en retard',
      message: tache.titre,
      prospect_id: tache.prospect_id,
      recipient_id: recipientId,
      meta: { task_id: tache.id, kind: 'tache_retard' },
    })
  }
}
