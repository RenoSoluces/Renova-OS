import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

/**
 * Notifications push Renova OS (appelée uniquement par la base, avec l'en-tête x-renova-cron).
 *
 * { mode: 'notification', notification_id } : envoie la notification aux appareils du destinataire
 *   (au plus une alerte du même type toutes les 2 minutes, pour éviter les rafales lors des imports).
 * { mode: 'horaire' } : chaque heure — relances des devis envoyés sans réponse à J+3 et J+7 ;
 *   à 7 h (heure de Paris), récapitulatif de la journée pour chaque commercial abonné.
 */

const FUSEAU = 'Europe/Paris'
const ETAPES_A_RELANCER = ['nouveau', 'qualifie', 'visite planifiee', 'visite faite', 'dossier']
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

const URL_PAR_TYPE: Record<string, string> = {
  nouveau_prospect: '/app/prospects', message_prospect: '/app/prospects', relance_devis: '/app/devis',
  evolution_dossier: '/app/dossiers', vt_a_qualifier: '/app/visites', tache_retard: '/app/a_traiter',
}

function local(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, heure: Number(p.hour) }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
  const lire = async (nom: string) => (await admin.rpc('lire_secret_serveur', { p_nom: nom })).data as string | null
  const [secret, privee, publique] = await Promise.all([lire('renova_cron_secret'), lire('renova_vapid_private_key'), lire('renova_vapid_public_key')])
  if (!secret || req.headers.get('x-renova-cron') !== secret) return json({ error: 'Accès refusé.' }, 401)
  if (!privee || !publique) return json({ error: 'Clés VAPID absentes.' }, 503)
  webpush.setVapidDetails('mailto:contact@renosoluces.fr', publique, privee)

  /** Envoie une alerte à tous les appareils d'un utilisateur ; supprime les abonnements expirés. */
  async function pousser(userId: string, charge: { title: string; body: string; url: string; tag: string }) {
    const { data: abonnements } = await admin.from('push_subscriptions').select('id,subscription').eq('user_id', userId)
    let envoyes = 0
    for (const a of abonnements || []) {
      try {
        await webpush.sendNotification(a.subscription, JSON.stringify(charge), { TTL: 6 * 3600, urgency: 'normal' })
        envoyes++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', a.id)
      }
    }
    return envoyes
  }

  let corps: { mode?: string; notification_id?: string } = {}
  try { corps = await req.json() } catch { /* vide */ }

  if (corps.mode === 'notification' && corps.notification_id) {
    const { data: n } = await admin.from('notifications').select('id,type,titre,message,recipient_id').eq('id', corps.notification_id).maybeSingle()
    if (!n?.recipient_id) return json({ envoyes: 0 })
    const { data: recent } = await admin.from('push_journal').select('id').eq('user_id', n.recipient_id).eq('type', n.type)
      .gte('envoye_le', new Date(Date.now() - 2 * 60 * 1000).toISOString()).limit(1)
    if (recent?.length) return json({ envoyes: 0, ignore: 'rafale' })
    const envoyes = await pousser(n.recipient_id, { title: n.titre || 'Renova OS', body: n.message || '', url: URL_PAR_TYPE[n.type] || '/app/a_traiter', tag: `renova-${n.type}` })
    if (envoyes) await admin.from('push_journal').insert({ user_id: n.recipient_id, type: n.type })
    return json({ envoyes })
  }

  if (corps.mode !== 'horaire') return json({ error: 'Mode inconnu.' }, 400)
  const bilan = { relances: 0, recaps: 0 }

  // 1. Relances de devis envoyés sans réponse : J+3 puis J+7.
  const { data: devis } = await admin.from('devis').select('id,numero,prospect_id,created_at,prospect:prospects(prenom,nom,commercial_id,commercial)').eq('statut', 'envoye')
  for (const d of devis || []) {
    const jours = Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000)
    const palier = jours >= 7 ? 'j7' : jours >= 3 ? 'j3' : null
    if (!palier) continue
    const kind = `relance_devis_${palier}`
    const { data: deja } = await admin.from('notifications').select('id').eq('devis_id', d.id).eq('meta->>kind', kind).limit(1)
    if (deja?.length) continue
    const p = d.prospect as { prenom?: string; nom?: string; commercial_id?: string; commercial?: string } | null
    const client = p ? `${p.prenom || ''} ${p.nom || ''}`.trim() : 'le client'
    if (d.prospect_id) {
      await admin.from('tasks').insert({
        prospect_id: d.prospect_id, titre: `Relancer le devis ${d.numero} (J+${palier === 'j7' ? 7 : 3})`,
        description: `Devis envoyé il y a ${jours} jours, toujours sans réponse. Utilisez le modèle « Relance de devis » dans la fiche.`,
        type: 'relance', priorite: palier === 'j7' ? 'haute' : 'normale', assigne: p?.commercial || '', due_at: new Date().toISOString(), done: false,
      })
    }
    await admin.from('notifications').insert({
      type: 'relance_devis', titre: `Relancer le devis ${d.numero}`,
      message: `${client} n'a pas répondu depuis ${jours} jours. ${palier === 'j7' ? 'Deuxième relance : un appel est conseillé.' : 'Un e-mail de relance est prêt dans la fiche.'}`,
      prospect_id: d.prospect_id, devis_id: d.id, recipient_id: p?.commercial_id || null, meta: { kind, devis_id: d.id },
    })
    bilan.relances++
  }

  // 2. Récapitulatif du matin (7 h, heure de Paris), une fois par jour.
  const maintenant = local()
  if (maintenant.heure === 7) {
    const { data: abonnes } = await admin.from('push_subscriptions').select('user_id')
    for (const userId of [...new Set((abonnes || []).map(a => a.user_id))]) {
      const { data: deja } = await admin.from('push_journal').select('id').eq('user_id', userId).eq('type', 'recap_matin')
        .gte('envoye_le', new Date(Date.now() - 20 * 3600 * 1000).toISOString()).limit(1)
      if (deja?.length) continue
      const [{ count: rdv }, { data: prospects }] = await Promise.all([
        admin.from('planning_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('date', maintenant.date).neq('source', 'google'),
        admin.from('prospects').select('id,statut,created_at').eq('commercial_id', userId),
      ])
      const actifs = (prospects || []).filter(p => ETAPES_A_RELANCER.includes(norm(p.statut)))
      let aRelancer = 0
      if (actifs.length) {
        const { data: inter } = await admin.from('interactions').select('prospect_id,created_at').in('prospect_id', actifs.map(p => p.id))
          .gte('created_at', new Date(Date.now() - 14 * 86400000).toISOString())
        const recents = new Set((inter || []).map(i => i.prospect_id))
        aRelancer = actifs.filter(p => !recents.has(p.id) && Date.now() - new Date(p.created_at).getTime() > 14 * 86400000).length
      }
      if (!rdv && !aRelancer) continue
      const morceaux = [rdv ? `${rdv} rendez-vous aujourd’hui` : '', aRelancer ? `${aRelancer} prospect${aRelancer > 1 ? 's' : ''} à relancer` : ''].filter(Boolean)
      const envoyes = await pousser(userId, { title: 'Votre journée Renova OS', body: `${morceaux.join(' · ')}. Bonne journée !`, url: '/app/a_traiter', tag: 'renova-recap' })
      if (envoyes) { await admin.from('push_journal').insert({ user_id: userId, type: 'recap_matin' }); bilan.recaps++ }
    }
  }

  // Nettoyage du journal.
  await admin.from('push_journal').delete().lt('envoye_le', new Date(Date.now() - 30 * 86400000).toISOString())
  return json(bilan)
})
