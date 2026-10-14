import { Mail, ShieldCheck } from 'lucide-react'

export function CourrierPage() {
  return <div className="page">
    <div className="page-header"><div><h1 className="page-title">Mon courrier</h1><p className="page-subtitle">Boîte de réception professionnelle</p></div></div>
    <div className="card card-pad" style={{maxWidth:760}}>
      <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
        <div style={{padding:12,borderRadius:12,background:'var(--c-primary-50,#eafaf1)'}}><Mail size={24}/></div>
        <div>
          <h2 style={{margin:'0 0 8px'}}>Connexion Gmail à configurer</h2>
          <p className="text-muted">Cette page est prête à accueillir le courrier professionnel, mais aucune boîte Gmail n'est connectée pour le moment. Pour lire et envoyer des e-mails depuis Renova-OS, il faudra activer OAuth Google dans le projet Google Cloud et configurer les identifiants côté Supabase. Aucune donnée Gmail n'est lue ou envoyée avant cette configuration.</p>
          <div className="text-sm" style={{display:'flex',gap:8,alignItems:'center',marginTop:14}}><ShieldCheck size={16}/> Les messages resteront associés au compte professionnel autorisé.</div>
        </div>
      </div>
    </div>
  </div>
}
