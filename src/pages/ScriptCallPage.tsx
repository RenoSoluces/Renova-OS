import { useState } from 'react'
import { ScrollText, Copy, Check, AlertTriangle, PhoneCall } from 'lucide-react'
import { INTRO_APPEL, REGLES_APPEL_PRO, SCRIPTS_PRODUITS, type ScriptProduit } from '../lib/scripts/scriptsCall'

const texteComplet = (s: ScriptProduit): string => [
  s.titre,
  `Cible : ${s.cible}`,
  `Présentation : ${INTRO_APPEL}`,
  `Accroche : ${s.accroche}`,
  'Questions :', ...s.questions.map(q => `- ${q}`),
  'Arguments :', ...s.arguments.map(a => `- ${a}`),
  'Objections :', ...s.objections.map(o => `- « ${o.objection} » : ${o.reponse}`),
  `Clôture : ${s.cloture}`,
].join('\n')

export function ScriptCallPage(): JSX.Element {
  const [actif, setActif] = useState(SCRIPTS_PRODUITS[0].id)
  const [copie, setCopie] = useState(false)
  const script = SCRIPTS_PRODUITS.find(s => s.id === actif) ?? SCRIPTS_PRODUITS[0]

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texteComplet(script))
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch { /* copie impossible : l’écran reste utilisable */ }
  }

  return (
    <div className="page">
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><PhoneCall size={18} /> Avant d’appeler un pro</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {REGLES_APPEL_PRO.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {SCRIPTS_PRODUITS.map(s => (
          <button key={s.id} type="button" className={`btn ${s.id === actif ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActif(s.id)}>{s.titre}</button>
        ))}
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><ScrollText size={20} /> {script.titre}</h2>
            <p className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>{script.cible}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => void copier()}>
            {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? 'Copié' : 'Copier le script'}
          </button>
        </div>

        {script.attention && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, borderRadius: 8, background: 'rgba(232,163,23,.12)', marginBottom: 12, fontSize: 13 }}>
            <AlertTriangle size={16} /> {script.attention}
          </div>
        )}

        <Bloc titre="1. Présentation"><p>{INTRO_APPEL}</p></Bloc>
        <Bloc titre="2. Accroche"><p>{script.accroche}</p></Bloc>
        <Bloc titre="3. Questions à poser"><Liste elements={script.questions} /></Bloc>
        <Bloc titre="4. Arguments"><Liste elements={script.arguments} /></Bloc>
        <Bloc titre="5. Objections">
          {script.objections.map(o => (
            <p key={o.objection}><strong>« {o.objection} »</strong><br />{o.reponse}</p>
          ))}
        </Bloc>
        <Bloc titre="6. Clôture : prendre le rendez-vous"><p>{script.cloture}</p></Bloc>
      </div>
    </div>
  )
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }): JSX.Element {
  return (
    <section style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
      <h4 style={{ margin: '0 0 6px' }}>{titre}</h4>
      {children}
    </section>
  )
}

function Liste({ elements }: { elements: string[] }): JSX.Element {
  return <ul style={{ margin: 0, paddingLeft: 18 }}>{elements.map(e => <li key={e}>{e}</li>)}</ul>
}
