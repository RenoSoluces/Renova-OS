-- Licences : nombre de comptes autorisés pour une entreprise cliente, et possibilité (ou non) pour son dirigeant d'inviter lui-même des collaborateurs.
-- Seul le Grand Admin modifie ces colonnes (politique organisations_admin_write).
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS licences_max integer CHECK (licences_max IS NULL OR licences_max >= 1);
ALTER TABLE public.organisations ADD COLUMN IF NOT EXISTS invitations_autorisees boolean NOT NULL DEFAULT true;
