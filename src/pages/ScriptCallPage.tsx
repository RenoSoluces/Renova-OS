import { useState } from 'react'
import { ScrollText, Copy, Check, AlertTriangle, PhoneCall } from 'lucide-react'
import {
  APRES_APPEL, CAMPAGNES, CONFIRMATION_RDV, CONSEIL_CAMPAGNES, INFOS_AVANT_RDV, NOTES_REPERES, OBJECTIONS, OUVERTURE,
  REGLES_A_FAIRE, REGLES_A_NE_PAS_FAIRE, REGLES_APPEL_PRO, REPERES_CEE, SCRIPTS_PRODUITS, SMS_CONFIRMATION, type Bloc as BlocScript,
} from '../lib/scripts/scriptsCall'

type Onglet = 'ouverture' | 'objections' | 'rdv' | 'regles' | string

const blocTexte = (b: BlocScript): string[] => [
  ...(b.titre ? [b.titre] : []),
  ...(b.note ? [`(${b.note})`] : []),
  ...(b.dire || []),
  ...(b.questions || []).map(q => `- ${q}`),
  '',
]

function texteOnglet(onglet: Onglet): string {
  if (onglet === 'ouverture') return ['OUVERTURE', ...OUVERTURE.flatMap(blocTexte)].join('\n')
  if (onglet === 'objections') return ['OBJECTIONS', ...OBJECTIONS.flatMap(o => [`« ${o.objection} »`, ...o.reponse, ''])].join('\n')
  if (onglet === 'rdv') return ['CONFIRMATION DU RENDEZ-VOUS', ...CONFIRMATION_RDV, '', 'SMS', SMS_CONFIRMATION].join('\n')
  if (onglet === 'regles') return ['À FAIRE', ...REGLES_A_FAIRE.map(r => `- ${r}`), '', 'À NE JAMAIS FAIRE', ...REGLES_A_NE_PAS_FAIRE.map(r => `- ${r}`)].join('\n')
  const s = SCRIPTS_PRODUITS.find(p => p.id === onglet)
  return s ? [s.titre, s.cible, ...s.etapes.flatMap(blocTexte), `Informations indispensables : ${s.infos}`].join('\n') : ''
}

export function ScriptCallPage(): JSX.Element {
  const [actif, setActif] = useState<Onglet>('ouverture')
  const [copie, setCopie] = useState(false)
  const produit = SCRIPTS_PRODUITS.find(s => s.id === actif)

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texteOnglet(actif))
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch { /* copie impossible : l’écran reste utilisable */ }
  }

  const onglets: { id: Onglet; label: string }[] = [
    { id: 'ouverture', label: 'Ouverture' },
    ...SCRIPTS_PRODUITS.map(s => ({ id: s.id, label: s.titre })),
    { id: 'objections', label: 'Objections' },
    { id: 'rdv', label: 'Rendez-vous' },
    { id: 'regles', label: 'Règles et repères' },
  ]
  const titre = onglets.find(o => o.id === actif)?.label ?? ''

  return (
    <div className="page">
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><PhoneCall size={18} /> Avant d’appeler</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {REGLES_APPEL_PRO.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {onglets.map(o => (
          <button key={o.id} type="button" className={`btn ${o.id === actif ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActif(o.id)}>{o.label}</button>
        ))}
      </div>

      <div className="card card-pad" style={{ fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><ScrollText size={20} /> {titre}</h2>
            {produit && <p className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>Cible : {produit.cible}</p>}
          </div>
          <button type="button" className="btn btn-outline" onClick={() => void copier()}>
            {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? 'Copié' : 'Copier'}
          </button>
        </div>

        {actif === 'ouverture' && OUVERTURE.map(b => <Bloc key={b.titre} bloc={b} />)}

        {produit && (
          <>
            {produit.note && <p className="text-muted" style={{ fontStyle: 'italic' }}>{produit.note}</p>}
            {produit.attention && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, borderRadius: 8, background: 'rgba(232,163,23,.12)', marginBottom: 12, fontSize: 13 }}>
                <AlertTriangle size={16} /> {produit.attention}
              </div>
            )}
            {produit.etapes.map(b => <Bloc key={b.titre} bloc={b} />)}
            <p><strong>Informations indispensables avant le rendez-vous :</strong> {produit.infos}</p>
          </>
        )}

        {actif === 'objections' && OBJECTIONS.map((o, i) => (
          <section key={o.objection} style={{ marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 6px' }}>Objection {i + 1} : « {o.objection} »</h4>
            {o.reponse.map(r => <p key={r} style={{ margin: '4px 0' }}>{r}</p>)}
          </section>
        ))}

        {actif === 'rdv' && (
          <>
            <h4 style={{ margin: '0 0 6px' }}>À demander avant de prendre un rendez-vous</h4>
            <table style={{ borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
              <tbody>
                {INFOS_AVANT_RDV.map(([a, b]) => (
                  <tr key={a}><td style={{ padding: '2px 16px 2px 0' }}><strong>{a}</strong></td><td className="text-muted">{b}</td></tr>
                ))}
              </tbody>
            </table>
            <h4 style={{ margin: '0 0 6px' }}>Confirmation du rendez-vous</h4>
            {CONFIRMATION_RDV.map(p => <p key={p} style={{ margin: '4px 0' }}>{p}</p>)}
            <h4 style={{ margin: '16px 0 6px' }}>Confirmation par SMS</h4>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'rgba(0,0,0,.04)', padding: 12, borderRadius: 8 }}>{SMS_CONFIRMATION}</pre>
            <h4 style={{ margin: '16px 0 6px' }}>Après l’appel</h4>
            <ul style={{ margin: 0, paddingLeft: 18 }}>{APRES_APPEL.map(a => <li key={a}>{a}</li>)}</ul>
          </>
        )}

        {actif === 'regles' && (
          <>
            <h4 style={{ margin: '0 0 6px' }}>À faire</h4>
            <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>{REGLES_A_FAIRE.map(r => <li key={r}>{r}</li>)}</ul>
            <h4 style={{ margin: '0 0 6px' }}>À ne jamais faire</h4>
            <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>{REGLES_A_NE_PAS_FAIRE.map(r => <li key={r}>{r}</li>)}</ul>
            <h4 style={{ margin: '0 0 6px' }}>Références CEE</h4>
            <table style={{ borderCollapse: 'collapse', marginBottom: 8, fontSize: 13 }}>
              <tbody>{REPERES_CEE.map(([a, b]) => <tr key={a}><td style={{ padding: '2px 16px 2px 0' }}><strong>{a}</strong></td><td>{b}</td></tr>)}</tbody>
            </table>
            <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13 }}>{NOTES_REPERES.map(n => <li key={n}>{n}</li>)}</ul>
            <h4 style={{ margin: '0 0 6px' }}>Campagnes par spécialité</h4>
            <table style={{ borderCollapse: 'collapse', marginBottom: 8, fontSize: 13 }}>
              <tbody>{CAMPAGNES.map(([a, b, c]) => <tr key={a}><td style={{ padding: '2px 16px 2px 0' }}><strong>{a}</strong></td><td style={{ padding: '2px 16px 2px 0' }}>{b}</td><td className="text-muted">{c}</td></tr>)}</tbody>
            </table>
            <p>{CONSEIL_CAMPAGNES}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Bloc({ bloc }: { bloc: BlocScript }): JSX.Element {
  return (
    <section style={{ marginBottom: 16 }}>
      {bloc.titre && <h4 style={{ margin: '0 0 6px' }}>{bloc.titre}</h4>}
      {bloc.note && <p className="text-muted" style={{ fontStyle: 'italic', margin: '0 0 4px' }}>{bloc.note}</p>}
      {bloc.dire?.map(p => <p key={p} style={{ margin: '4px 0' }}>{p}</p>)}
      {bloc.questions && <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{bloc.questions.map(q => <li key={q}>{q}</li>)}</ul>}
    </section>
  )
}
