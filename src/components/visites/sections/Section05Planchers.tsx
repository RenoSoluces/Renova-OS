import { Layers3, Info, Plus, Trash2 } from 'lucide-react'
import type { PlancherFiche } from '../../../types'
import { PhotoGrid } from '../../shared/PhotoGrid'

interface Props { planchers: PlancherFiche[]; onChange: (planchers: PlancherFiche[]) => void }
const TYPES = ['Terre-plein','Vide sanitaire','Sous-sol','Local non chauffé']
const COMPOSITIONS = ['Béton','Bois','Hourdis béton','Hourdis polystyrène']
const ISOLANTS = ['Aucun','Laine de verre','Laine de roche','Ouate','Polyuréthane','Polystyrène']

export default function Section05Planchers({ planchers, onChange }: Props) {
  const ajouter = () => onChange([...planchers, { id: crypto.randomUUID(), type:'', position:'', surface_m2:null, composition:'', isolation:'non', isolant_type:'', epaisseur_isolant_cm:null, notes:'', photos:[] }])
  const modifier = (id:string, champ:keyof PlancherFiche, valeur:any) => onChange(planchers.map(p => p.id === id ? { ...p, [champ]: valeur } : p))
  return <div className="vt-modern-section">
    <div className="vt-modern-hero"><div className="vt-modern-icon"><Layers3 size={24}/></div><div><div className="vt-modern-kicker">Enveloppe du logement</div><h2>Plancher bas</h2><p>Décrivez les planchers en contact avec le sol ou les volumes non chauffés.</p></div></div>
    <div className="vt-modern-card"><div className="vt-modern-card-title"><Layers3 size={16}/> Relevé des planchers <button className="vt-modern-add" type="button" onClick={ajouter}><Plus size={16}/> Ajouter un plancher</button></div>
      {planchers.length === 0 && <div className="vt-modern-empty"><Layers3 size={20}/><div><strong>Aucun plancher renseigné</strong><span>Ajoutez les planchers observés sur place.</span></div></div>}
      <div className="vt-modern-stack">{planchers.map((p,i)=><div className="vt-modern-item" key={p.id}><div className="vt-modern-item-head"><div><strong>Plancher {i+1}</strong><span>Relevé terrain</span></div><button className="vt-icon-danger" type="button" title="Supprimer" onClick={()=>onChange(planchers.filter(x=>x.id!==p.id))}><Trash2 size={16}/></button></div>
        <div className="vt-modern-grid"><label>Type<select value={p.type} onChange={e=>modifier(p.id,'type',e.target.value)}><option value="">Choisir</option>{TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label>Surface (m²)<input type="number" min="0" value={p.surface_m2 ?? ''} onChange={e=>modifier(p.id,'surface_m2',e.target.value===''?null:Number(e.target.value))}/></label><label>Composition<select value={p.composition} onChange={e=>modifier(p.id,'composition',e.target.value)}><option value="">Choisir</option>{COMPOSITIONS.map(x=><option key={x}>{x}</option>)}</select></label><label>Isolation<select value={p.isolation} onChange={e=>modifier(p.id,'isolation',e.target.value)}><option value="non">Non</option><option value="oui">Oui</option></select></label></div>
        {p.isolation === 'oui' && <div className="vt-inline-fields"><label>Isolant<select value={p.isolant_type} onChange={e=>modifier(p.id,'isolant_type',e.target.value)}><option value="">Choisir</option>{ISOLANTS.map(x=><option key={x}>{x}</option>)}</select></label><label>Épaisseur (cm)<input type="number" min="0" value={p.epaisseur_isolant_cm ?? ''} onChange={e=>modifier(p.id,'epaisseur_isolant_cm',e.target.value===''?null:Number(e.target.value))}/></label></div>}
        <label>Observations<textarea className="vt-big-textarea" rows={3} value={p.notes} onChange={e=>modifier(p.id,'notes',e.target.value)} placeholder="Accès, humidité, ponts thermiques, état de l'isolant…"/></label>
        <PhotoGrid photos={p.photos || []} onChange={photos=>modifier(p.id,'photos',photos)} label="Photos du plancher" />
      </div>)}</div>
    </div>
    <div className="vt-modern-card vt-modern-hint"><Info size={17}/><span>Concentrez-vous sur ce qui est réellement observable sur place. Les informations manquantes peuvent rester vides et être complétées plus tard.</span></div>
  </div>
}
