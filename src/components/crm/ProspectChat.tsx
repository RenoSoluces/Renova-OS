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
  // Admin / manager → le commercial du prospect ; le commercial → un responsable ;
  // l'apporteur ou le call → le commercial qui suit le prospect.
  const recipient=isAdmin?commercial:(commercial&&commercial.id!==profile?.id?commercial:admins[0])
  async function load(){setLoading(true);const [m,p]=await Promise.all([supabase.from('prospect_messages').select('*, sender:profiles!prospect_messages_sender_id_fkey(nom_complet,role)').eq('prospect_id',prospect.id).order('created_at',{ascending:true}),supabase.from('profiles').select('id,nom_complet,role').in('role',['admin','manager','commercial']).order('nom_complet')]);setMessages((m.data||[]) as any);setPeople((p.data||[]) as Profile[]);setLoading(false)}
  useEffect(()=>{load()},[prospect.id])
  async function send(){const contenu=text.trim();if(!contenu||!profile?.id||sending)return;setSending(true);const recipientId=recipient?.id||null;const {data,error}=await supabase.from('prospect_messages').insert({prospect_id:prospect.id,sender_id:profile.id,recipient_id:recipientId,contenu}).select('*, sender:profiles!prospect_messages_sender_id_fkey(nom_complet,role)').single();if(!error&&data){setMessages(x=>[...x,data as any]);setText('')}setSending(false)}
  return <div className="prospect-chat-card"><div className="prospect-chat-head"><div><div className="prospect-chat-kicker"><MessageSquareText size={14}/> CHAT DOSSIER</div><strong>Échange interne</strong><span>{recipient?`Avec ${recipient.nom_complet}`:'Aucun interlocuteur attribué'}</span></div><UserRound size={18}/></div><div className="prospect-chat-body">{loading?<div className="prospect-chat-empty">Chargement…</div>:messages.length===0?<div className="prospect-chat-empty"><MessageSquareText size={22}/><strong>Aucun message</strong><span>Écrivez ici : le commercial, l’équipe et l’apporteur du prospect voient les messages.</span></div>:messages.map(m=><div className={`prospect-chat-message ${m.sender_id===profile?.id?'mine':''}`} key={m.id}><div className="prospect-chat-bubble"><div>{m.contenu}</div><small>{m.sender?.nom_complet||'Utilisateur'} · {new Date(m.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small></div></div>)}</div><div className="prospect-chat-compose"><textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}}} placeholder={recipient?'Écrire un message…':'Attribuez un commercial pour activer le chat.'} disabled={!recipient||sending}/><Button size="sm" variant="primary" onClick={send} disabled={!recipient||!text.trim()||sending}><Send size={14}/></Button></div></div>
}
