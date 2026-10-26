import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Portail client Renova OS : accès sans compte, par lien personnel (jeton de 48 caractères).
 *
 * POST { jeton, action }
 *  - charger : projet, étapes, pièces à fournir, devis (lignes, aides, CGV), contact
 *  - deposer : { piece_id?, nom_fichier, type_mime, contenu_base64 } → enregistre la pièce dans le dossier
 *  - code : envoie un code de signature à 6 chiffres par e-mail (valable 10 minutes)
 *  - signer : { code, nom, signature (image PNG en data URL), consentements } → signe le devis
 * La signature est une signature électronique simple : identité vérifiée par un code reçu sur l'adresse
 * e-mail du client, horodatage, adresse IP, navigateur et empreinte des montants conservés.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const echapper = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const PIECES_INTERNES = ['facture', 'cee_offre', 'mpr_depot', 'mpr_accord', 'attestation_honneur', 'note_dimensionnement', 'certificat_rge', 'devis_signe', 'devis_partenaire']
const TYPES_ACCEPTES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

async function sha256(texte: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Expéditeur des e-mails envoyés aux clients : le nom de l'entreprise qui suit le client.
 * Pour une entreprise autre que l'entreprise interne, l'adresse MAIL_FROM_AUTRES (si définie)
 * remplace celle de MAIL_FROM, afin qu'aucune adresse d'une autre entreprise n'apparaisse.
 */
async function expediteurClient(admin: any, organisationId: string | null, mailFrom: string): Promise<string> {
  const adresse = (v: string) => (v.match(/<([^>]+)>/)?.[1] || v).trim()
  if (!organisationId) return mailFrom
  const [{ data: org }, { data: ent }] = await Promise.all([
    admin.from('organisations').select('nom,type').eq('id', organisationId).maybeSingle(),
    admin.from('entreprises').select('raison_sociale').eq('organisation_id', organisationId).order('created_at').limit(1).maybeSingle(),
  ])
  if (!org || org.type === 'interne') return mailFrom
  const nom = String(ent?.raison_sociale || org.nom || 'Renova OS').replace(/[<>"]/g, '').trim()
  return `${nom} <${adresse(Deno.env.get('MAIL_FROM_AUTRES') || mailFrom)}>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })

  let b: Record<string, any>
  try { b = await req.json() } catch { return json({ error: 'Requête invalide.' }, 400) }
  const jeton = String(b.jeton || '')
  if (!/^[0-9a-f]{48}$/.test(jeton)) return json({ error: 'Lien invalide.' }, 404)
  const { data: acces } = await admin.from('portail_acces').select('*').eq('jeton', jeton).maybeSingle()
  if (!acces || !acces.actif || new Date(acces.expire_le) < new Date()) return json({ error: 'Ce lien a expiré. Demandez un nouveau lien à votre conseiller.' }, 410)

  const { data: prospect } = await admin.from('prospects').select('id,prenom,nom,email,telephone,adresse,code_postal,ville,statut,commercial_id,organisation_id').eq('id', acces.prospect_id).maybeSingle()
  if (!prospect) return json({ error: 'Projet introuvable.' }, 404)

  // Devis du lien, sinon le plus récent hors brouillon ; dossier du lien, sinon celui du devis.
  const { data: tousDevis } = await admin.from('devis').select('*').eq('prospect_id', prospect.id).order('created_at', { ascending: false })
  const devis = (tousDevis || []).find(d => d.id === acces.devis_id) || (tousDevis || []).find(d => d.statut !== 'brouillon' && !d.origine_interne) || null
  let dossierId = acces.dossier_id || devis?.dossier_id || null
  if (!dossierId) {
    const { data: dos } = await admin.from('dossiers').select('id').eq('prospect_id', prospect.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    dossierId = dos?.id || null
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = req.headers.get('user-agent') || null
  const action = String(b.action || 'charger')

  async function notifier(titre: string, message: string, type = 'message_prospect') {
    if (!prospect!.commercial_id) return
    await admin.from('notifications').insert({ type, titre, message, prospect_id: prospect!.id, recipient_id: prospect!.commercial_id, dossier_id: dossierId, meta: { kind: 'portail_client' } })
  }

  if (action === 'charger') {
    await admin.from('portail_acces').update({ dernier_acces: new Date().toISOString() }).eq('id', acces.id)
    const [{ data: entreprise }, { data: commercial }, { data: dossier }, { data: lignes }, { data: aides }, { data: visites }] = await Promise.all([
      // Identité de l'entreprise qui suit ce client, et d'elle seule.
      admin.from('entreprises').select('raison_sociale,telephone,email,logo_url,conditions_generales_devis').eq('organisation_id', prospect.organisation_id || '').order('created_at').limit(1).maybeSingle(),
      prospect.commercial_id ? admin.from('profiles').select('nom_complet,telephone,email').eq('id', prospect.commercial_id).maybeSingle() : Promise.resolve({ data: null }),
      dossierId ? admin.from('dossiers').select('id,reference,statut,date_installation_prevue,date_installation').eq('id', dossierId).maybeSingle() : Promise.resolve({ data: null }),
      devis ? admin.from('devis_lignes').select('designation,quantite,montant_ht,ordre').eq('devis_id', devis.id).order('ordre') : Promise.resolve({ data: [] }),
      devis ? admin.from('devis_aides').select('libelle,montant').eq('devis_id', devis.id) : Promise.resolve({ data: [] }),
      admin.from('visites').select('id,statut,date_visite').eq('prospect_id', prospect.id),
    ])
    const filtrePieces = dossierId ? admin.from('documents').select('id,nom,type,recu,url,obligatoire,etape,demande_le,created_at').eq('dossier_id', dossierId) : admin.from('documents').select('id,nom,type,recu,url,obligatoire,etape,demande_le,created_at').eq('prospect_id', prospect.id)
    const { data: docs } = await filtrePieces
    const pieces = (docs || []).filter(d => !PIECES_INTERNES.includes(d.type || '') && d.type !== 'image' && (!d.recu || d.etape || d.obligatoire || d.demande_le))
      .map(d => ({ id: d.id, nom: d.nom, recu: !!(d.recu || d.url), obligatoire: !!d.obligatoire }))
    const devisSigne = (docs || []).find(d => d.type === 'devis_signe' && d.url)
    let lienPdf: string | null = null
    if (devisSigne?.url) {
      const { data: s } = await admin.storage.from('documents').createSignedUrl(devisSigne.url, 3600)
      lienPdf = s?.signedUrl || null
    }
    const statut = String(prospect.statut || '').toLowerCase()
    const signe = devis?.statut === 'signe' || ['signé', 'installation', 'installé'].includes(statut)
    const installe = statut === 'installé' || dossier?.statut === 'installe' || !!dossier?.date_installation
    const etapes = [
      { id: 'demande', label: 'Demande reçue', fait: true },
      { id: 'visite', label: 'Visite technique', fait: (visites || []).some(v => v.statut === 'terminee') || !!devis, date: (visites || [])[0]?.date_visite || null },
      { id: 'devis', label: 'Proposition (devis)', fait: !!devis },
      { id: 'signature', label: 'Signature', fait: signe, date: devis?.signature_date || null },
      { id: 'aides', label: 'Dossier d’aides', fait: signe && pieces.length > 0 && pieces.every(p => p.recu) },
      { id: 'installation', label: 'Installation', fait: installe, date: dossier?.date_installation || dossier?.date_installation_prevue || null },
    ]
    const meta = (devis?.conformite_devis || {}) as Record<string, any>
    return json({
      client: { prenom: prospect.prenom, nom: prospect.nom, email_masque: prospect.email ? prospect.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') : null },
      entreprise: { nom: devis?.emetteur_nom_affichage || entreprise?.raison_sociale || 'Votre conseiller', telephone: devis?.emetteur_telephone || entreprise?.telephone || null, email: devis?.emetteur_email || entreprise?.email || null, logo: devis?.emetteur_logo_url || entreprise?.logo_url || null },
      conseiller: commercial ? { nom: commercial.nom_complet, telephone: commercial.telephone, email: commercial.email } : null,
      etapes,
      dossier: dossier ? { reference: dossier.reference, installation_prevue: dossier.date_installation_prevue } : null,
      pieces,
      devis: devis ? {
        numero: devis.numero, statut: devis.statut, montant_ht: devis.montant_ht, montant_tva: devis.montant_tva, montant_ttc: devis.montant_ttc,
        montant_aides: devis.montant_aides, reste_a_charge: devis.reste_a_charge, remise_ht: devis.remise_montant_ht, date_validite: devis.date_validite,
        conditions_paiement: devis.conditions_paiement, signe: devis.statut === 'signe', signature_date: devis.signature_date, signataire: devis.signature_nom_signataire,
        lignes: (lignes || []).map(l => ({ designation: l.designation, quantite: l.quantite, montant_ht: l.montant_ht })),
        aides: (aides || []).filter(a => Number(a.montant) > 0),
        cgv: devis.emetteur_cgv || entreprise?.conditions_generales_devis || '',
        hors_etablissement: !!meta.venteHorsEtablissement,
        signable: devis.statut === 'envoye' && !!prospect.email && (!devis.date_validite || new Date(`${devis.date_validite}T23:59:59`) >= new Date()),
        pdf: lienPdf,
      } : null,
    })
  }

  if (action === 'deposer') {
    const type = String(b.type_mime || '').toLowerCase()
    const contenu = String(b.contenu_base64 || '')
    if (!TYPES_ACCEPTES.includes(type)) return json({ error: 'Format accepté : PDF ou photo (JPG, PNG, HEIC).' }, 400)
    const octets = Uint8Array.from(atob(contenu), c => c.charCodeAt(0))
    if (!octets.length || octets.length > 12 * 1024 * 1024) return json({ error: 'Fichier vide ou trop volumineux (12 Mo maximum).' }, 413)
    let piece: { id: string; nom: string; type: string | null } | null = null
    if (b.piece_id) {
      const { data } = await admin.from('documents').select('id,nom,type,dossier_id,prospect_id').eq('id', String(b.piece_id)).maybeSingle()
      if (!data || (data.dossier_id !== dossierId && data.prospect_id !== prospect.id) || PIECES_INTERNES.includes(data.type || '')) return json({ error: 'Pièce introuvable.' }, 404)
      piece = data
    }
    const ext = type === 'application/pdf' ? 'pdf' : type.split('/')[1].replace('jpeg', 'jpg')
    const chemin = `${dossierId || prospect.id}/portail-${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage.from('documents').upload(chemin, octets, { contentType: type, upsert: false })
    if (upErr) return json({ error: 'Envoi impossible, réessayez.' }, 500)
    const nomFichier = String(b.nom_fichier || 'document').slice(0, 120)
    if (piece) {
      await admin.from('documents').update({ url: chemin, recu: true, taille: String(octets.length) }).eq('id', piece.id)
    } else {
      await admin.from('documents').insert({ dossier_id: dossierId, prospect_id: prospect.id, nom: nomFichier, type: ext, categorie: 'Envoyé par le client', url: chemin, recu: true, taille: String(octets.length) })
    }
    await admin.from('interactions').insert({ prospect_id: prospect.id, type: 'note', contenu: `Document déposé par le client sur son espace : ${piece?.nom || nomFichier}`, auteur: `${prospect.prenom || ''} ${prospect.nom || ''}`.trim(), meta: { canal: 'portail_client' } })
    await notifier('Document reçu', `${`${prospect.prenom || ''} ${prospect.nom || ''}`.trim()} a déposé : ${piece?.nom || nomFichier}.`)
    return json({ ok: true })
  }

  if (action === 'code') {
    if (!devis || devis.statut !== 'envoye') return json({ error: 'Aucun devis à signer.' }, 400)
    if (!prospect.email) return json({ error: 'Aucune adresse e-mail : contactez votre conseiller.' }, 400)
    const depuis = new Date(Date.now() - 3600 * 1000).toISOString()
    const { count } = await admin.from('portail_codes').select('id', { count: 'exact', head: true }).eq('acces_id', acces.id).gte('cree_le', depuis)
    if ((count || 0) >= 5) return json({ error: 'Trop de demandes : réessayez dans une heure.' }, 429)
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
    await admin.from('portail_codes').insert({ acces_id: acces.id, code_hash: await sha256(`${acces.id}:${code}`), expire_le: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
    const resendApiKey = Deno.env.get('RESEND_API_KEY'), mailFrom = Deno.env.get('MAIL_FROM')
    if (!resendApiKey || !mailFrom) return json({ error: 'Envoi d’e-mail non configuré.' }, 503)
    const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#F6F8F7;font-family:Arial,Helvetica,sans-serif;color:#1F2A24"><div style="max-width:520px;margin:0 auto;padding:28px 16px"><div style="background:#fff;border:1px solid #E3E9E5;border-radius:16px;padding:28px">
<p style="font-size:16px;margin:0 0 12px">Bonjour ${echapper(prospect.prenom || '')},</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 18px">Voici votre code pour signer le devis ${echapper(devis.numero || '')} :</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;text-align:center;margin:0 0 18px;font-family:monospace">${code}</p>
<p style="font-size:13px;color:#6B7A72;line-height:1.5;margin:0">Ce code est valable 10 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p></div></div></body></html>`
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: await expediteurClient(admin, prospect.organisation_id, mailFrom), to: [prospect.email], subject: `Votre code de signature : ${code}`, html, text: `Votre code de signature : ${code} (valable 10 minutes).` }) })
    if (!r.ok) return json({ error: 'L’e-mail n’a pas pu être envoyé.' }, 502)
    return json({ ok: true, email: prospect.email.replace(/^(.{2}).*(@.*)$/, '$1•••$2') })
  }

  if (action === 'signer') {
    if (!devis || devis.statut !== 'envoye') return json({ error: 'Ce devis n’est plus à signer.' }, 400)
    const nom = String(b.nom || '').trim().slice(0, 120)
    const signature = String(b.signature || '')
    const consent = (b.consentements || {}) as Record<string, boolean>
    if (nom.length < 2 || !signature.startsWith('data:image/png;base64,') || signature.length > 600000) return json({ error: 'Nom ou signature manquant.' }, 400)
    if (!consent.cgv_acceptees) return json({ error: 'Acceptez le devis et les conditions générales.' }, 400)
    const meta = (devis.conformite_devis || {}) as Record<string, any>
    if (meta.venteHorsEtablissement && !consent.bordereau_remis) return json({ error: 'Confirmez avoir reçu l’information sur le droit de rétractation.' }, 400)
    const { data: codeLigne } = await admin.from('portail_codes').select('*').eq('acces_id', acces.id).eq('utilise', false).order('cree_le', { ascending: false }).limit(1).maybeSingle()
    if (!codeLigne || new Date(codeLigne.expire_le) < new Date()) return json({ error: 'Code expiré : demandez un nouveau code.' }, 400)
    if (codeLigne.tentatives >= 5) return json({ error: 'Trop d’essais : demandez un nouveau code.' }, 429)
    if (await sha256(`${acces.id}:${String(b.code || '').trim()}`) !== codeLigne.code_hash) {
      await admin.from('portail_codes').update({ tentatives: codeLigne.tentatives + 1 }).eq('id', codeLigne.id)
      return json({ error: 'Code incorrect.' }, 400)
    }
    await admin.from('portail_codes').update({ utilise: true }).eq('id', codeLigne.id)
    const date = new Date().toISOString()
    const empreinte = await sha256(JSON.stringify({ devis: devis.id, numero: devis.numero, ttc: devis.montant_ttc, reste: devis.reste_a_charge, nom, date }))
    const { error: majErr } = await admin.from('devis').update({
      statut: 'signe', signature_statut: 'signe', signature_provider: 'portail_client', signature_date: date,
      signature_image_data: signature, signature_nom_signataire: nom,
      signature_audit: {
        hash_document: empreinte, adresse_ip: ip, user_agent: userAgent, email_verifie: prospect.email, code_envoye_le: codeLigne.cree_le,
        consentements: { cgv_acceptees: true, bordereau_retractation_remis: !!consent.bordereau_remis, execution_avant_fin_retractation: !!consent.execution_anticipee, vente_hors_etablissement: !!meta.venteHorsEtablissement },
        note_juridique: 'Signature électronique simple à distance : identité vérifiée par code à usage unique envoyé sur l’adresse e-mail du client, horodatage serveur, adresse IP et empreinte du contenu signé conservés.',
      },
    }).eq('id', devis.id).eq('statut', 'envoye')
    if (majErr) return json({ error: 'La signature n’a pas pu être enregistrée.' }, 500)
    await admin.from('prospects').update({ statut: 'Signé' }).eq('id', prospect.id)
    if (!devis.dossier_id) {
      const { data: dossier } = await admin.from('dossiers').insert({
        prospect_id: prospect.id, visite_id: devis.visite_id || null, devis_id: devis.id, reference: `DOS-${String(devis.numero || '').replace('DEV-', '')}`,
        statut: 'signe', montant_total: devis.montant_ttc, aides_montant: devis.montant_aides, reste_a_charge: devis.reste_a_charge, organisation_id: prospect.organisation_id,
      }).select('id').single()
      if (dossier) { await admin.from('devis').update({ dossier_id: dossier.id }).eq('id', devis.id); dossierId = dossier.id; await admin.from('portail_acces').update({ dossier_id: dossier.id }).eq('id', acces.id) }
    }
    await admin.from('interactions').insert({ prospect_id: prospect.id, type: 'devis', contenu: `Devis ${devis.numero} signé à distance par ${nom} depuis son espace client.`, auteur: nom, meta: { canal: 'portail_client', ip } })
    await notifier('Devis signé à distance 🎉', `${nom} a signé le devis ${devis.numero} (${Math.round(Number(devis.montant_ttc) || 0).toLocaleString('fr-FR')} € TTC). Ouvrez-le pour générer le PDF signé.`, 'evolution_dossier')
    return json({ ok: true, date })
  }

  return json({ error: 'Action inconnue.' }, 400)
})
