-- Permite que qualquer usuário autenticado e ativo veja o diretório básico
-- de outros usuários ativos (só o necessário para montar a lista de conversas)
CREATE POLICY "perfis: leitura do diretório"
  ON perfis FOR SELECT
  TO authenticated
  USING ( ativo = TRUE );

-- Tabela de mensagens internas 1-para-1
CREATE TABLE IF NOT EXISTS mensagens_internas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id   UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  conteudo       TEXT,
  anexo_url      TEXT,
  anexo_tipo     TEXT,
  lida           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (remetente_id <> destinatario_id)
);

CREATE INDEX idx_mensagens_internas_conversa
  ON mensagens_internas (LEAST(remetente_id, destinatario_id), GREATEST(remetente_id, destinatario_id), created_at);

CREATE INDEX idx_mensagens_internas_nao_lidas
  ON mensagens_internas (destinatario_id, lida) WHERE lida = FALSE;

ALTER TABLE mensagens_internas ENABLE ROW LEVEL SECURITY;

-- Só vê mensagens onde é remetente ou destinatário
CREATE POLICY "mensagens_internas: participantes leem"
  ON mensagens_internas FOR SELECT
  USING (auth.uid() = remetente_id OR auth.uid() = destinatario_id);

-- Só pode enviar mensagens em próprio nome
CREATE POLICY "mensagens_internas: enviar em próprio nome"
  ON mensagens_internas FOR INSERT
  WITH CHECK (auth.uid() = remetente_id);

-- Só o destinatário pode marcar como lida
CREATE POLICY "mensagens_internas: destinatario marca lida"
  ON mensagens_internas FOR UPDATE
  USING (auth.uid() = destinatario_id)
  WITH CHECK (auth.uid() = destinatario_id);
