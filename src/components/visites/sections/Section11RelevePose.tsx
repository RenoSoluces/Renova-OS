import { useEffect, useState } from 'react'
import { Camera, Check, Plus, Wrench } from 'lucide-react'
import { RELEVES_POSE, releveDe, avancementReleve, type DonneesReleve } from '../../../lib/visites/relevePose'

export interface RelevePoseData {
  produits: string[]
  releves: DonneesReleve
}

interface Props {
  data: RelevePoseData
  onChange: (d: RelevePoseData) => void
  /** Produits ciblés par la visite (VT produit) : proposés d'office. */
  produitsVisite: string[]
}

/** Section « Relevé de pose » : un onglet par produit, champs en une touche et photos à prendre. */
export default function Section11RelevePose({ data, onChange, produitsVisite }: Props) {
  const produits = data.produits.length ? data.produits : produitsVisite.filter(p => releveDe(p))
  const [actif, setActif] = useState(produits[0] || '')
  const [ajout, setAjout] = useState(false)

  useEffect(() => { if (!produits.includes(actif)) setActif(produits[0] || '') }, [produits.join(','), actif])

  const releve = releveDe(actif)
  const valeurs = data.releves[actif] || {}
  const maj = (champ: string, valeur: string) => onChange({ produits, releves: { ...data.releves, [actif]: { ...valeurs, [champ]: valeur } } })
  const ajouter = (p: string) => { onChange({ produits: [...produits, p], releves: data.releves }); setActif(p); setAjout(false) }
  const retirer = (p: string) => { if (window.confirm('Retirer ce produit du relevé ? Les informations saisies seront conservées si vous le rajoutez.')) onChange({ produits: produits.filter(x => x !== p), releves: data.releves }) }
  const disponibles = RELEVES_POSE.filter(r => !produits.includes(r.produit))

  return (
    <div className="rp">
      <p className="rp-intro"><Wrench size={16} /> Ce que l’équipe de pose doit savoir pour chiffrer juste et intervenir sans seconde visite.</p>
      <div className="rp-onglets" role="tablist">
        {produits.map(p => {
          const a = avancementReleve(p, data.releves[p])
          return (
            <button key={p} role="tab" type="button" aria-selected={p === actif} className={`rp-onglet${p === actif ? ' on' : ''}`} onClick={() => setActif(p)}>
              <span>{releveDe(p)?.label || p}</span>
              <small className={a.complet ? 'ok' : ''}>{a.complet ? <Check size={12} /> : null}{a.obligatoiresRemplis}/{a.obligatoires}</small>
            </button>
          )
        })}
        {disponibles.length > 0 && <button type="button" className="rp-ajout" onClick={() => setAjout(o => !o)} aria-expanded={ajout}><Plus size={15} /> Produit</button>}
      </div>
      {ajout && (
        <div className="rp-choix">
          {disponibles.map(r => <button key={r.produit} type="button" onClick={() => ajouter(r.produit)}>{r.label}</button>)}
        </div>
      )}

      {!releve && <div className="rp-vide">Ajoutez le ou les produits prévus pour faire le relevé de pose.</div>}

      {releve && (
        <div className="rp-corps">
          {releve.champs.map(c => (
            <div key={c.id} className="rp-champ">
              <div className="rp-label">{c.label}{c.obligatoire && <span className="rp-oblig">*</span>}{c.aide && <small>{c.aide}</small>}</div>
              {c.type === 'choix' && (
                <div className="rp-options">
                  {c.options!.map(o => (
                    <button key={o} type="button" aria-pressed={valeurs[c.id] === o} className={`rp-option${valeurs[c.id] === o ? ' on' : ''}`} onClick={() => maj(c.id, valeurs[c.id] === o ? '' : o)}>{o}</button>
                  ))}
                </div>
              )}
              {c.type === 'nombre' && (
                <div className="rp-nombre"><input type="number" inputMode="decimal" min={0} step="any" value={valeurs[c.id] ?? ''} onChange={e => maj(c.id, e.target.value)} />{c.unite && <span>{c.unite}</span>}</div>
              )}
              {c.type === 'texte' && <textarea rows={2} value={valeurs[c.id] ?? ''} onChange={e => maj(c.id, e.target.value)} />}
            </div>
          ))}
          <div className="rp-photos">
            <div className="rp-label"><Camera size={15} /> Photos à prendre</div>
            {releve.photos.map((ph, i) => {
              const fait = valeurs[`photo_${i}`] === 'oui'
              return (
                <button key={ph} type="button" className={`rp-photo${fait ? ' on' : ''}`} aria-pressed={fait} onClick={() => maj(`photo_${i}`, fait ? '' : 'oui')}>
                  <span className="rp-case">{fait && <Check size={13} />}</span>{ph}
                </button>
              )
            })}
            <small className="rp-note">Ajoutez les photos dans « Notes &amp; photos » (section Identification) ; cochez-les ici une fois prises.</small>
          </div>
          <label className="rp-champ"><div className="rp-label">Remarques pour la pose</div>
            <textarea rows={3} value={valeurs.remarques ?? ''} onChange={e => maj('remarques', e.target.value)} placeholder="Accès, horaires, animaux, contraintes particulières…" /></label>
          <button type="button" className="rp-retirer" onClick={() => retirer(actif)}>Retirer ce produit du relevé</button>
        </div>
      )}
    </div>
  )
}
