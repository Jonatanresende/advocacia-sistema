-- ---------------------------------------------------------
-- Migração 003: Adiciona coluna visto_em à tabela leads_adv
--
-- Objetivo: persistir o estado de "lido" no banco para que
-- a notificação de nova mensagem não reapareça em outros
-- navegadores/sessões após o usuário abrir o contato.
-- ---------------------------------------------------------

ALTER TABLE leads_adv
  ADD COLUMN IF NOT EXISTS visto_em TIMESTAMPTZ DEFAULT NULL;
