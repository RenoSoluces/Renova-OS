import { useState } from 'react'
import { ScrollText, Copy, Check, AlertTriangle, PhoneCall } from 'lucide-react'
import { OBJECTIONS, REGLES_APPEL_PRO, SCRIPTS_PRODUITS, SECTIONS_GENERALES } from '../lib/scripts/scriptsCall'

const GENERAL = 'general'

const texteGeneral = (): string => [
  'SCRIPT D’APPEL',
  ...SECTIONS_GENERALES.flatMap(s => [s.titre, ...(s.note ? [s.note] : []), ...s.paragraphes, '']),
  '7. OBJECTIONS COURANTES',
  ...OBJECTIONS.flatMap(o => [`« ${o.objection} »`, ...o.reponse, '']),
  'RÈGLES À RESPECTER',
  ...REGLES_APPEL_PRO.map(r => `- ${r}`),
].join('\n')

export function ScriptCallPage(): JSX.Element {
  const [actif, setActif] = useState(GENERAL)
  const [copie, setCopie] = useState(false)
  const produit = SCRIPTS_PRODUITS.find(s => s.id === actif)

  const copier = async () => {
    const texte = produit ? [produit.titre, ...produit.presentation].join('\n\n') : texteGeneral()
    try {
      await navigator.clipboard.writeText(texte)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch { /* copie impossible : l’écran reste utilisable */ }
  }

  return (
    <div className="page">
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><PhoneCall size={18} /> Règles à respecter</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          {REGLES_APPEL_PRO.map(r => <li key={r}>{r}</li>)}
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button type="button" className={`btn ${actif === GENERAL ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActif(GENERAL)}>Déroulé de l’appel</button>
        {SCRIPTS_PRODUITS.map(s => (
          <button key={s.id} type="button" className={`btn ${s.id === actif ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActif(s.id)}>{s.titre}</button>
        ))}
      </div>

      <div className="card card-pad">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><ScrollText size={20} /> {produit ? produit.titre : 'Script d’appel'}</h2>
            <p className="text-muted" style={{ marginTop: 4, fontSize: 13 }}>{produit ? produit.cible : 'À suivre dans l’ordre. Les solutions (étape 5) sont dans les onglets produit.'}</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={() => void copier()}>
            {copie ? <Check size={15} /> : <Copy size={15} />} {copie ? 'Copié' : 'Copier'}
          </button>
        </div>

        {produit ? (
          <>
            {produit.attention && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 10, borderRadius: 8, background: 'rgba(232,163,23,.12)', marginBottom: 12, fontSize: 13 }}>
                <AlertTriangle size={16} /> {produit.attention}
              </div>
            )}
            <Bloc titre="Présentation de la solution">{produit.presentation.map(p => <p key={p}>{p}</p>)}</Bloc>
          </>
        ) : (
          <>
            {SECTIONS_GENERALES.slice(0, 4).map(s => <Section key={s.id} titre={s.titre} note={s.note} paragraphes={s.paragraphes} />)}
            <Bloc titre="5. Présentation des solutions"><p>Après avoir identifié un besoin, ouvrir l’onglet du produit concerné.</p></Bloc>
            {SECTIONS_GENERALES.slice(4, 5).map(s => <Section key={s.id} titre={s.titre} note={s.note} paragraphes={s.paragraphes} />)}
            <Bloc titre="7. Objections courantes">
              {OBJECTIONS.map(o => (
                <div key={o.objection} style={{ marginBottom: 10 }}>
                  <strong>« {o.objection} »</strong>
                  {o.reponse.map(r => <p key={r} style={{ margin: '4px 0' }}>{r}</p>)}
                </div>
              ))}
            </Bloc>
            {SECTIONS_GENERALES.slice(5).map(s => <Section key={s.id} titre={s.titre} note={s.note} paragraphes={s.paragraphes} />)}
          </>
        )}
      </div>
    </div>
  )
}

function Section({ titre, note, paragraphes }: { titre: string; note?: string; paragraphes: string[] }): JSX.Element {
  return (
    <Bloc titre={titre}>
      {note && <p className="text-muted" style={{ fontStyle: 'italic' }}>{note}</p>}
      {paragraphes.map(p => <p key={p}>{p}</p>)}
    </Bloc>
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
