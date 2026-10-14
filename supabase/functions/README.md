# Fonctions serveur Renova-OS

Déployer les fonctions depuis la racine du projet avec la CLI Supabase :

```bash
supabase functions deploy send-invoice
supabase functions deploy suggest-devis-lines
supabase functions deploy notify-new-prospect
```

Secrets à configurer dans Supabase (Project Settings → Edge Functions → Secrets) :

- `RESEND_API_KEY` : clé API Resend pour l'envoi des factures PDF.
- `MAIL_FROM` : expéditeur vérifié chez Resend, par exemple `Reno Soluces <facturation@votre-domaine.fr>`.
- `OPENAI_API_KEY` : clé API OpenAI pour l'assistant de proposition de lignes de devis.

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par l'environnement Edge Functions Supabase. Ne jamais mettre ces secrets dans des variables `VITE_*` ou dans le navigateur.

L'assistant de devis reçoit uniquement la description, les photos et les informations descriptives du catalogue. Les prix, forfaits de pose, tarifs par zone et montants d'aides ne lui sont jamais transmis : le devis reprend les prix du catalogue local.
