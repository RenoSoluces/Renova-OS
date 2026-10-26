import { supabase } from './supabase'

/** Clé publique VAPID (publique par nature) ; la clé privée est conservée dans le coffre-fort Supabase. */
export const CLE_PUBLIQUE_VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY
  || 'BBYByO1WBIikd7Vqk2g_j3bFQMBVQXc1PoXKsnnFUMW1TLn3m-WKrWFkYpOy-OB9MamTHbkAkuwb2gLawfPE9zM'

export const pushDisponible = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext

function decoderCle(valeur: string): ArrayBuffer {
  const remplissage = '='.repeat((4 - valeur.length % 4) % 4)
  const base64 = (valeur + remplissage).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from([...window.atob(base64)].map(c => c.charCodeAt(0))).buffer as ArrayBuffer
}

export async function abonnementActif(): Promise<boolean> {
  if (!pushDisponible()) return false
  try {
    const registration = await navigator.serviceWorker.ready
    return Boolean(await registration.pushManager.getSubscription())
  } catch { return false }
}

/** Demande l'autorisation, abonne ce navigateur et l'enregistre pour l'utilisateur. */
export async function activerNotifications(userId: string): Promise<void> {
  if (!pushDisponible()) throw new Error('Ce navigateur ne prend pas en charge les notifications. Sur iPhone, ajoutez d’abord Renova OS à l’écran d’accueil (Partager → Sur l’écran d’accueil).')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications refusées. Vous pouvez les réautoriser dans les réglages du navigateur pour ce site.')
  const registration = await navigator.serviceWorker.ready
  let abonnement = await registration.pushManager.getSubscription()
  if (!abonnement) abonnement = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decoderCle(CLE_PUBLIQUE_VAPID) })
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId, endpoint: abonnement.endpoint, subscription: abonnement.toJSON(),
    user_agent: navigator.userAgent, updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function desactiverNotifications(): Promise<void> {
  if (!pushDisponible()) return
  const registration = await navigator.serviceWorker.ready
  const abonnement = await registration.pushManager.getSubscription()
  if (abonnement) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', abonnement.endpoint)
    await abonnement.unsubscribe()
  }
}
