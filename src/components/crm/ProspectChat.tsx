import { useEffect, useMemo, useState } from 'react'
import { MessageSquareText, Send, UserRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth/AuthContext'
import { Button } from '../ui/Button'
import type { Prospect } from '../../types'

interface Message { id:string; prospect_id:string; sender_id:string; recipient_id:string|null; contenu:string; lu:boolean; created_at:string; sender?:{nom_complet:string;role:string} }
interface Profile { id:string; nom_complet:string; role:string }

export function ProspectChat({ prospect }:{prospect:Prospect}) {
  const { profile }=useAuth(); const isAdmin=profile?.role==='admin'||profile?.role==='manager'
  const [messages,setMessages]=useState<Message[]>([]),[people,setPeople]=useState<Profile[]>([]),[text,setText]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false)
  const admins=useMemo(()=>people.filter(p=>p.role==='admin'||p.role==='manager'),[people]), commercial=people.find(p=>p.id===prospect.commercial_id)
  const apporteurId=(prospect as any).apporteur_user_id as string|null|undefined, appelId=prospect.liste_appels_pour
  const apporteur=people.find(p=>p.id===apporteurId), appel=appelId&&appelId!==apporteurId?people.find(p=>p.id===appelId):undefined
  // Admin / manager → le commercial du prospect ; le commercial → un responsable ;
  // l'apporteur ou le call → le commercial qui suit le prospect.
  const autres=[commercial,apporteur,appel].filter((x):x is Profile=>!!x&&x.id!==profile?.id)
  const recipient=isAdmin?(commercial&&commercial.id!==profile?.id?commercial:autres[0]):(commercial&&commercial.id!==profile?.id?commercial:(admins.find(a=>a.id!==profile?.id)||autres[0]))
  const participants=[...new Map([commercial&&{p:commercial,r:'commercial'},apporteur&&{p:apporteur,r:'apporteur'},appel&&{p:appel,r:'call'}].filter(Boolean).map((x:any)=>[x.p.id,x])).values()].filter((x:any)=>x.p.id!==profile?.id) as {p:Profile;r:string}[]
  const libelleParticipants=participants.length?participants.map(x=>x.p.nom_complet+(x.r==='apporteur'?' (apporteur)':x.r==='call'?' (call)':'')).join(' · '):(recipient?.nom_complet||'')
  async function load(){setLoading(true);const [m,p]=await Promise.all([supabase.from('prospect_messages').select('*, sender:profiles!prospect_messages_sender_id_fkey(nom_complet,role)').eq('prospect_id',prospect.id).order('created_at',{ascending:true}),supabase.from('profiles').select('id,nom_complet,role').or(`role.in.(admin,manager,commercial_manager,commercial)${[prospect.commercial_id,(prospect as any).apporteur_user_id,prospect.liste_appels_pour].filter(Boolean).map(i=>`,id.eq.${i}`).join('')}`).order('nom_complet')]);setMessages((m.data||[]) as any);setPeople((p.data||[]) as Profile[]);setLoading(false)}
  useEffect(()=>{load()},[prospect.id])
  async function send(){const contenu=text.trim();if(!contenu||!profile?.id||sending)return;setSending(true);const recipientId=recipient?.id||null;const {data,error}=await supabase.from('prospect_messages').insert({prospect_id:prospect.id,sender_id:profile.id,recipient_id:recipientId,contenu}).select('*, sender:profiles!prospect_messages_sender_id_fkey(nom_complet,role)').single();if(!error&&data){setMessages(x=>[...x,data as any]);setText('')}setSending(false)}
  return <div className="prospect-chat-card"><div className="prospect-chat-head"><div><div className="prospect-chat-kicker"><MessageSquareText size={14}/> CHAT DOSSIER</div><strong>Échange interne</strong><span>{libelleParticipants?`Avec ${libelleParticipants}`:'Aucun interlocuteur attribué'}</span></div><UserRound size={18}/></div><div className="prospect-chat-body">{loading?<div className="prospect-chat-empty">Chargement…</div>:messages.length===0?<div className="prospect-chat-empty"><MessageSquareText size={22}/><strong>Aucun message</strong><span>Écrivez ici : le commercial, l’équipe et l’apporteur du prospect voient les messages.</span></div>:messages.map(m=><div className={`prospect-chat-message ${m.sender_id===profile?.id?'mine':''}`} key={m.id}><div className="prospect-chat-bubble"><div>{m.contenu}</div><small>{m.sender?.nom_complet||'Utilisateur'} · {new Date(m.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div></div>)}</div><div className="prospect-chat-compose"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={recipient?'Écrire un message…':'Attribuez un commercial pour activer le chat.'} disabled={!recipient||sending}/><Button size="sm" variant="primary" onClick={send} disabled={!recipient||!text.trim()||sending}><Send size={14}/></Button></div></div>
}
