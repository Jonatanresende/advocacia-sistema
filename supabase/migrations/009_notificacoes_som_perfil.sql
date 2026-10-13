-- Migration 009: Preferências de sons de notificação por perfil
-- Permite que cada usuário controle os alertas sonoros para:
-- 1. Chat (Leads / WhatsApp IA)
-- 2. Atendimento Manual (2º WhatsApp)
-- 3. Mensagens Internas

ALTER TABLE perfis 
  ADD COLUMN IF NOT EXISTS notif_som_chat BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_som_manual BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notif_som_mensagens BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN perfis.notif_som_chat IS 'Ativa ou pausa o som de notificação para o Chat de Leads / Atendimento IA';
COMMENT ON COLUMN perfis.notif_som_manual IS 'Ativa ou pausa o som de notificação para o Atendimento Manual (2º WhatsApp)';
COMMENT ON COLUMN perfis.notif_som_mensagens IS 'Ativa ou pausa o som de notificação para as Mensagens Internas';
