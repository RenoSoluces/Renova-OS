/**
 * Mode hors-ligne pour la visite technique.
 *
 * Un commercial terrain n'a pas toujours de réseau chez le client (murs épais, sous-sol,
 * zone rurale). Ce module garantit qu'aucune saisie n'est jamais perdue :
 *
 * 1. Chaque modification de la fiche d'audit est immédiatement écrite dans le
 *    localStorage du terminal (source de vérité locale, disponible même hors-ligne
 *    et même après un rechargement de la page / fermeture de l'onglet).
 * 2. En parallèle, on tente de pousser la modification vers Supabase. Si ça échoue
 *    (pas de réseau, timeout, erreur serveur), la visite est marquée "en attente de
 *    synchronisation" dans une file locale.
 * 3. Dès que la connexion revient (évènement navigateur 'online', ou vérification
 *    périodique), toutes les visites en attente sont automatiquement resynchronisées.
 *
 * Limite assumée : la résolution de conflit est "dernière écriture locale gagne" — pas de
 * fusion fine champ à champ. Pour un usage terrain mono-utilisateur par visite (un seul
 * commercial saisit une visite donnée), c'est un compromis raisonnable.
 */

const PREFIX_DRAFT = "renova_offline_draft_";
const CLE_PENDING = "renova_offline_pending_visites";

export interface DraftAudit {
  visiteId: string;
  auditData: any;
  updatedAt: number;
}

/** Enregistre localement la dernière version connue de la fiche d'audit d'une visite. */
export function enregistrerDraftLocal(visiteId: string, auditData: any): void {
  try {
    const draft: DraftAudit = { visiteId, auditData, updatedAt: Date.now() };
    localStorage.setItem(PREFIX_DRAFT + visiteId, JSON.stringify(draft));
  } catch {
    // Quota localStorage dépassé ou navigateur en mode privé strict : on ne bloque pas
    // la saisie pour autant, seule la résilience hors-ligne est dégradée.
  }
}

/** Relit le dernier brouillon local d'une visite, s'il existe. */
export function lireDraftLocal(visiteId: string): DraftAudit | null {
  try {
    const raw = localStorage.getItem(PREFIX_DRAFT + visiteId);
    return raw ? (JSON.parse(raw) as DraftAudit) : null;
  } catch {
    return null;
  }
}

/** Supprime le brouillon local d'une visite (après synchronisation réussie). */
export function supprimerDraftLocal(visiteId: string): void {
  try {
    localStorage.removeItem(PREFIX_DRAFT + visiteId);
  } catch {
    // ignore
  }
}

function lirePendingIds(): string[] {
  try {
    const raw = localStorage.getItem(CLE_PENDING);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function ecrirePendingIds(ids: string[]): void {
  try {
    localStorage.setItem(CLE_PENDING, JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // ignore
  }
}

/** Marque une visite comme ayant des modifications non encore synchronisées avec Supabase. */
export function marquerEnAttenteSync(visiteId: string): void {
  const ids = lirePendingIds();
  if (!ids.includes(visiteId)) ecrirePendingIds([...ids, visiteId]);
}

/** Retire une visite de la file d'attente de synchronisation (une fois synchronisée). */
export function retirerDeLaFileSync(visiteId: string): void {
  ecrirePendingIds(lirePendingIds().filter(id => id !== visiteId));
}

/** Liste des visites ayant des modifications en attente de synchronisation. */
export function listerVisitesEnAttente(): string[] {
  return lirePendingIds();
}

export function estEnLigne(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
