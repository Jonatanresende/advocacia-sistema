-- ============================================================
-- MIGRATION 008 — Chat de Atendimento Manual (2º WhatsApp)
-- Executar no Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABELA DE CONTATOS DO 2º WHATSAPP MANUAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contatos_whatsapp_manual (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT,
  whatsapp         TEXT NOT NULL UNIQUE,
  observacoes      TEXT,
  ultima_mensagem  TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contatos_whatsapp_manual IS 'Lista de contatos do 2º WhatsApp (atendimento manual fora da automação).';

CREATE INDEX IF NOT EXISTS idx_contatos_whatsapp_manual_whatsapp ON contatos_whatsapp_manual (whatsapp);
CREATE INDEX IF NOT EXISTS idx_contatos_whatsapp_manual_ultima_msg ON contatos_whatsapp_manual (ultima_mensagem DESC);

-- ────────────────────────────────────────────────────────────
-- 2. TABELA DE MENSAGENS DO 2º WHATSAPP MANUAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens_whatsapp_manual (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_id     UUID NOT NULL REFERENCES contatos_whatsapp_manual(id) ON DELETE CASCADE,
  usuario_id     UUID REFERENCES perfis(id) ON DELETE SET NULL,
  tipo_remetente TEXT NOT NULL CHECK (tipo_remetente IN ('cliente', 'atendente')),
  conteudo       TEXT,
  tipo_midia     TEXT NOT NULL DEFAULT 'texto' CHECK (tipo_midia IN ('texto', 'imagem', 'pdf', 'video', 'audio', 'arquivo')),
  midia_url      TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  lida           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mensagens_whatsapp_manual IS 'Histórico de conversas do 2º WhatsApp (atendimento manual).';

CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_manual_contato ON mensagens_whatsapp_manual (contato_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_mensagens_whatsapp_manual_nao_lidas ON mensagens_whatsapp_manual (contato_id, lida) WHERE lida = FALSE;

-- ────────────────────────────────────────────────────────────
-- 3. SEGURANÇA RLS (LIBERADO PARA TODOS OS USUÁRIOS AUTENTICADOS)
-- ────────────────────────────────────────────────────────────
ALTER TABLE contatos_whatsapp_manual ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens_whatsapp_manual ENABLE ROW LEVEL SECURITY;

-- Politicas para contatos_whatsapp_manual
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contatos_whatsapp_manual: autenticados leem') THEN
    CREATE POLICY "contatos_whatsapp_manual: autenticados leem" ON contatos_whatsapp_manual FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contatos_whatsapp_manual: autenticados inserem') THEN
    CREATE POLICY "contatos_whatsapp_manual: autenticados inserem" ON contatos_whatsapp_manual FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contatos_whatsapp_manual: autenticados atualizam') THEN
    CREATE POLICY "contatos_whatsapp_manual: autenticados atualizam" ON contatos_whatsapp_manual FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contatos_whatsapp_manual: autenticados deletam') THEN
    CREATE POLICY "contatos_whatsapp_manual: autenticados deletam" ON contatos_whatsapp_manual FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Politicas para mensagens_whatsapp_manual
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mensagens_whatsapp_manual: autenticados leem') THEN
    CREATE POLICY "mensagens_whatsapp_manual: autenticados leem" ON mensagens_whatsapp_manual FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mensagens_whatsapp_manual: autenticados inserem') THEN
    CREATE POLICY "mensagens_whatsapp_manual: autenticados inserem" ON mensagens_whatsapp_manual FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mensagens_whatsapp_manual: autenticados atualizam') THEN
    CREATE POLICY "mensagens_whatsapp_manual: autenticados atualizam" ON mensagens_whatsapp_manual FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mensagens_whatsapp_manual: autenticados deletam') THEN
    CREATE POLICY "mensagens_whatsapp_manual: autenticados deletam" ON mensagens_whatsapp_manual FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 4. HABILITAR SUPABASE REALTIME
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE contatos_whatsapp_manual;
    ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp_manual;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. BUCKET DE ARMAZENAMENTO PARA MÍDIAS (IMAGENS, PDF, VÍDEO, ÁUDIO)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-manual-midias', 'whatsapp-manual-midias', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leitura publica whatsapp-manual-midias') THEN
    CREATE POLICY "Leitura publica whatsapp-manual-midias" ON storage.objects FOR SELECT TO public USING (bucket_id = 'whatsapp-manual-midias');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Upload autenticado whatsapp-manual-midias') THEN
    CREATE POLICY "Upload autenticado whatsapp-manual-midias" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'whatsapp-manual-midias');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Update autenticado whatsapp-manual-midias') THEN
    CREATE POLICY "Update autenticado whatsapp-manual-midias" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'whatsapp-manual-midias');
  END IF;
END $$;
