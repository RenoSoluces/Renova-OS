import { useEffect, useMemo, useState } from 'react'
import {
  Plus,
  Users,
  ClipboardCheck,
  FileText,
  TrendingUp,
  ArrowRight,
  Calendar,
  Wallet,
  FileSignature,
  Percent,
  CheckCircle2,
  Banknote,
  Clock3,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type {
  Prospect,
  Visite,
  PageKey,
  Interaction,
  Devis,
  Simulation,
  PlanningEvent,
  Entreprise,
  Commission,
} from '../types'
import {
  PIPELINE_STAGES,
  stageOf,
  euro,
  timeAgo,
  isProspectTerminal,
} from '../lib/crm/constants'
import { useAuth } from '../lib/auth/AuthContext'
import { TodayTasksWidget } from '../components/crm/TodayTasksWidget'
import { AdminDashboard } from '../components/dashboard/AdminDashboard'
import { CommercialDashboard } from '../components/dashboard/CommercialDashboard'

export function DashboardPage({
  onNavigate,
}: {
  onNavigate: (p: PageKey) => void
}) {
  const { profile } = useAuth()

  const isAdmin =
    profile?.role === 'admin' || profile?.role === 'manager'

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [visites, setVisites] = useState<Visite[]>([])
  const [devis, setDevis] = useState<Devis[]>([])
  const [simulations, setSimulations] = useState<Simulation[]>([])
  const [activity, setActivity] = useState<Interaction[]>([])
  const [agendaEvents, setAgendaEvents] = useState<PlanningEvent[]>([])
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)

    const inSevenDays = new Date(today)
    inSevenDays.setDate(inSevenDays.getDate() + 6)

    let agendaQuery = supabase
      .from('planning_events')
      .select('*')
      .gte('date', todayKey)
      .lte('date', inSevenDays.toISOString().slice(0, 10))
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      .limit(8)

    if (!isAdmin && profile?.id) {
      agendaQuery = agendaQuery.or(
        `user_id.eq.${profile.id},user_id.is.null`,
      )
    }

    Promise.all([
      supabase
        .from('prospects')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('visites')
        .select('*, prospect:prospects(*)')
        .order('created_at', { ascending: false }),

      supabase
        .from('devis')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('simulations')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('interactions')
        .select('*, prospect:prospects(*)')
        .order('created_at', { ascending: false })
        .limit(5),

      agendaQuery,

      supabase
        .from('entreprises')
        .select('*')
        .limit(1)
        .maybeSingle(),

      supabase
        .from('commissions_safe')
        .select('*')
        .order('date_generation', { ascending: false }),
    ]).then(([p, v, d, s, a, ag, ent, com]) => {
      setProspects(p.data || [])
      setVisites((v.data || []) as any)
      setDevis((d.data || []) as Devis[])
      setSimulations((s.data || []) as Simulation[])
      setActivity((a.data || []) as any)
      setAgendaEvents((ag.data || []) as PlanningEvent[])
      setEntreprise((ent.data as Entreprise) || null)
      setCommissions(
        (com.data || []) as unknown as Commission[],
      )
      setLoading(false)
    })
  }, [isAdmin, profile?.id])


  const prospectCount = prospects.length

  const visitesEnCours = visites.filter(
    v => v.statut === 'en_cours',
  ).length

  const visitesTerminees = visites.filter(
    v => v.statut === 'terminee',
  ).length

  const devisEnvoyes = devis.filter(
    d => d.statut !== 'brouillon',
  ).length

  const devisSignes = devis.filter(
    d => d.statut === 'signe',
  ).length

  const pipeline = PIPELINE_STAGES.map(stage => ({
    stage: stage.label,
    count: prospects.filter(
      p =>
        !isProspectTerminal(p.statut) &&
        stageOf(p.statut).value === stage.value,
    ).length,
    color: stage.color,
  }))

  const maxCount = Math.max(
    ...pipeline.map(p => p.count),
    1,
  )

  const pipelineValue = prospects
    .filter(
      p =>
        !isProspectTerminal(p.statut) &&
        stageOf(p.statut).value !== 'Signé',
    )
    .reduce(
      (sum, p) =>
        sum + (Number(p.montant_potentiel) || 0),
      0,
    )

  /*
   * CA EN COURS
   *
   * Toujours calculé depuis les devis réellement créés (brouillons et
   * devis envoyés), jamais depuis le montant potentiel du Prospect.
   */
  const caEnCours = useMemo(() => {
    // Le CA en cours doit provenir des devis réellement créés, jamais du
    // montant_potentiel renseigné dans la fiche Prospect.
    return devis
      .filter(d => d.statut === 'brouillon' || d.statut === 'envoye')
      .reduce((sum, d) => sum + (Number(d.montant_ttc) || 0), 0)
  }, [devis])

  /*
   * COMMISSIONS EN COURS
   *
   * Pour le commercial :
   * les commissions qui ne sont pas encore payées.
   *
   * La requête Supabase ci-dessus limite déjà les résultats
   * aux commissions du commercial connecté.
   */
  const commissionsEnCours = useMemo(() => {
    return commissions
      .filter(c => c.statut !== 'annulee' && c.statut !== 'payee' && !c.date_paiement_commercial)
      .reduce(
        (sum, c) =>
          sum + (Number(c.montant_commercial) || 0),
        0,
      )
  }, [commissions])

  const recentProspects = prospects.slice(0, 5)

  const dpeMoyen = useMemo(() => {
    const valides = simulations.filter(s => s.dpe_avant)

    if (!valides.length) return null

    const ordre = [
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
      'G',
    ]

    const lettres = valides
      .map(s => ordre.indexOf(s.dpe_avant!))
      .filter(i => i >= 0)
      .sort((a, b) => a - b)

    const consoValues = valides
      .map(
        s =>
          Number(
            (s.resultat_avant as any)?.consommationEP,
          ),
      )
      .filter(
        n => Number.isFinite(n) && n > 0,
      )

    return {
      lettre: lettres.length
        ? ordre[
            lettres[
              Math.floor(lettres.length / 2)
            ]
          ]
        : null,

      conso: consoValues.length
        ? Math.round(
            consoValues.reduce(
              (a, b) => a + b,
              0,
            ) / consoValues.length,
          )
        : null,

      count: valides.length,
    }
  }, [simulations])

  const totalCommissionsPayees = useMemo(() => {
    return commissions
      .filter(c => !!c.date_paiement_commercial)
      .reduce(
        (sum, c) =>
          sum + (Number(c.montant_commercial) || 0),
        0,
      )
  }, [commissions])

  const totalCommissionsPayeesMois = useMemo(() => {
    const now = new Date()

    return commissions
      .filter(c => {
        if (!c.date_paiement_commercial) return false

        const date = new Date(c.date_paiement_commercial)

        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        )
      })
      .reduce(
        (sum, c) =>
          sum +
          (Number(c.montant_commercial) || 0),
        0,
      )
  }, [commissions])

  const dossiersActifs = prospects.filter(
    p => !isProspectTerminal(p.statut),
  ).length

  const commissionsActives = commissions.filter(
    c => c.statut !== 'annulee' && !c.date_paiement_commercial,
  ).length

  // ── Suivi financier des commissions ─────────────────────────────────────
  const commissionsCommercialEnAttente = useMemo(() => {
    return commissions
      .filter(c => c.statut !== 'annulee' && c.statut !== 'payee' && !c.date_paiement_commercial)
      .reduce((sum, c) => sum + (Number(c.montant_commercial) || 0), 0)
  }, [commissions])

  const commissionsCommercialPayees = useMemo(() => {
    return commissions
      .filter(c => c.statut !== 'annulee' && !!c.date_paiement_commercial)
      .reduce((sum, c) => sum + (Number(c.montant_commercial) || 0), 0)
  }, [commissions])

  const commissionsSocieteEnAttente = useMemo(() => {
    return commissions
      .filter(c => c.statut !== 'annulee' && !c.date_paiement_societe)
      .reduce((sum, c) => sum + (Number(c.montant_societe) || 0), 0)
  }, [commissions])

  const commissionsSocietePayees = useMemo(() => {
    return commissions
      .filter(c => c.statut !== 'annulee' && !!c.date_paiement_societe)
      .reduce((sum, c) => sum + (Number(c.montant_societe) || 0), 0)
  }, [commissions])

  const commissionsCommercialTotal = commissionsCommercialEnAttente + commissionsCommercialPayees
  const commissionsSocieteTotal = commissionsSocieteEnAttente + commissionsSocietePayees

  const recentCommissions = useMemo(() => {
    return [...commissions]
      .filter(c => c.statut !== 'annulee')
      .sort((a, b) =>
        new Date(b.date_generation).getTime() -
        new Date(a.date_generation).getTime(),
      )
      .slice(0, 6)
  }, [commissions])

  const todayKey = new Date()
    .toISOString()
    .slice(0, 10)

  const TYPE_LABEL: Record<string, string> = {
    visite: 'Visite technique',
    rdv: 'Rendez-vous',
    formation: 'Formation',
  }

  // Tous les hooks doivent être exécutés avant ce retour conditionnel.
  // Sinon React lève « Rendered fewer hooks than expected » lorsque le rôle
  // passe du chargement au profil admin.
  if (isAdmin) return <AdminDashboard onNavigate={onNavigate} />

  return <CommercialDashboard onNavigate={onNavigate} />
}
