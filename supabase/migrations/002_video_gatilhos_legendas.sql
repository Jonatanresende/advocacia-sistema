-- ============================================================
-- MIGRATION 002 — Gatilhos, Vídeos e Legendas de Anúncio
-- Executar no Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. COLUNAS NOVAS EM LEADS_ADV E CONSTRAINT UNIQUE
-- ────────────────────────────────────────────────────────────
ALTER TABLE leads_adv
  ADD COLUMN IF NOT EXISTS video_enviado BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS categoria_video_enviado TEXT,
  ADD COLUMN IF NOT EXISTS legenda_enviada TEXT;

-- Garante que whatsapp_lead é única (necessário para o upsert do node em marcarVideoEnviado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_adv_whatsapp_lead_key'
  ) THEN
    ALTER TABLE leads_adv ADD CONSTRAINT leads_adv_whatsapp_lead_key UNIQUE (whatsapp_lead);
  END IF;
END $$;

COMMENT ON COLUMN leads_adv.video_enviado IS 'Indica se o vídeo explicativo do anúncio foi enviado ao lead';
COMMENT ON COLUMN leads_adv.categoria_video_enviado IS 'Categoria do vídeo enviado ao lead (ex: auxilio_acidente)';
COMMENT ON COLUMN leads_adv.legenda_enviada IS 'Texto da legenda enviada ao lead junto com o vídeo';


-- ────────────────────────────────────────────────────────────
-- 2. TABELA DE GATILHOS POR ANÚNCIO
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gatilhos_anuncio (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trecho_chave TEXT NOT NULL,
  categoria    TEXT NOT NULL,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE gatilhos_anuncio IS 'Gatilhos de texto para identificação automática da categoria do anúncio.';


-- ────────────────────────────────────────────────────────────
-- 3. TABELA DE VÍDEOS POR CATEGORIA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos_categoria (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria        TEXT NOT NULL,
  video_url        TEXT NOT NULL,
  duracao_segundos INT,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE videos_categoria IS 'Cadastro dos vídeos explicativos organizados por categoria.';


-- ────────────────────────────────────────────────────────────
-- 4. TABELA DE LEGENDAS POR CATEGORIA
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS legendas_categoria (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria  TEXT NOT NULL,
  texto      TEXT NOT NULL,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE legendas_categoria IS 'Opções de legendas/textos explicativos organizados por categoria.';


-- ────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ────────────────────────────────────────────────────────────

-- 5.1 GATILHOS_ANUNCIO
ALTER TABLE gatilhos_anuncio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gatilhos_anuncio: leitura autenticada" ON gatilhos_anuncio;
DROP POLICY IF EXISTS "gatilhos_anuncio: admin edita" ON gatilhos_anuncio;

CREATE POLICY "gatilhos_anuncio: leitura autenticada"
  ON gatilhos_anuncio FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "gatilhos_anuncio: admin edita"
  ON gatilhos_anuncio FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- 5.2 VIDEOS_CATEGORIA
ALTER TABLE videos_categoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_categoria: leitura autenticada" ON videos_categoria;
DROP POLICY IF EXISTS "videos_categoria: admin edita" ON videos_categoria;

CREATE POLICY "videos_categoria: leitura autenticada"
  ON videos_categoria FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "videos_categoria: admin edita"
  ON videos_categoria FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- 5.3 LEGENDAS_CATEGORIA
ALTER TABLE legendas_categoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legendas_categoria: leitura autenticada" ON legendas_categoria;
DROP POLICY IF EXISTS "legendas_categoria: admin edita" ON legendas_categoria;

CREATE POLICY "legendas_categoria: leitura autenticada"
  ON legendas_categoria FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "legendas_categoria: admin edita"
  ON legendas_categoria FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- ────────────────────────────────────────────────────────────
-- 6. DADOS INICIAIS (SEED DATA)
-- ────────────────────────────────────────────────────────────

-- 6.1 Gatilho de auxílio-acidente
INSERT INTO gatilhos_anuncio (trecho_chave, categoria, ativo)
VALUES (
  'Olá! Quero entender melhor como funciona o auxílio-acidente, por favor.',
  'auxilio_acidente',
  TRUE
);

-- 6.2 Vídeo da categoria auxílio-acidente
INSERT INTO videos_categoria (categoria, video_url, duracao_segundos, ativo)
VALUES (
  'auxilio_acidente',
  'https://ljmmtacgbmpbbolobrnx.supabase.co/storage/v1/object/public/videos-categorias/video-ax-doenca.mp4',
  24,
  TRUE
);

-- 6.3 Legendas da categoria auxílio-acidente
INSERT INTO legendas_categoria (categoria, texto, ativo)
VALUES
  (
    'auxilio_acidente',
    'Se você assistiu ao vídeo e se identificou com a situação, vale entender como funciona o Auxílio-Acidente.
Esse é um benefício previdenciário pago quando a pessoa fica com sequela de acidente que reduz sua capacidade para o trabalho que exercia. Diferente do auxílio-doença, ele não exige afastamento — pode ser pago em paralelo ao salário, desde que a perícia do INSS reconheça a redução da capacidade laborativa.
A análise envolve a qualidade de segurado na data do acidente, o nexo causal entre o acidente e a sequela e o impacto na capacidade de trabalho.
Toque em ''Converse no WhatsApp'' e tire suas dúvidas sobre os requisitos do benefício.',
    TRUE
  ),
  (
    'auxilio_acidente',
    '"Se eu continuar trabalhando, o INSS corta meu benefício?"
Essa é uma das dúvidas mais comuns sobre o Auxílio-Acidente. Diferente do auxílio-doença, esse benefício não exige afastamento do trabalho. Ele é pago justamente para quem permaneceu trabalhando, mas ficou com sequela que reduziu a capacidade de exercer a mesma atividade de antes.
A análise considera fatores como o tipo de acidente (de trabalho, de trânsito, doméstico), a natureza da sequela, a comprovação por perícia da redução da capacidade laborativa e a qualidade de segurado na data do acidente.
Cada um desses pontos compõe a documentação que entra na análise.
Toque em ''Converse no WhatsApp'' e receba a explicação completa sobre o benefício.',
    TRUE
  ),
  (
    'auxilio_acidente',
    'Quem sofreu acidente e ficou com sequelas permanentes — colocação de pinos, placas, perda parcial de movimento, lesão na coluna — pode ter direito ao Auxílio-Acidente, a depender da análise do INSS.
Esse benefício tem uma particularidade que confunde muita gente: ele não exige afastamento do trabalho. É pago em paralelo ao salário quando a perícia reconhece a redução da capacidade para a atividade que a pessoa exercia antes do acidente.
Os pontos que costumam impactar a análise são a documentação médica detalhada da sequela, a comprovação do nexo causal com o acidente e da qualidade de segurado na época do ocorrido.
Para entender como cada requisito é avaliado, toque em ''Converse no WhatsApp'' e receba os principais esclarecimentos sobre o tema.',
    TRUE
  ),
  (
    'auxilio_acidente',
    '"Meu acidente foi há anos, ainda tenho direito?"
Não importa a época do acidente. O que conta é: você tinha carteira assinada (ou recebeu auxílio-doença do INSS) na ocasião, e hoje convive com sequelas que reduzem sua capacidade de trabalho.
O Auxílio-Acidente é uma indenização do INSS para quem ficou com essa redução — e pode ser pago mesmo com o tempo passado, desde que haja laudo médico da época e laudo atual comprovando a sequela.
Toque em ''Saiba Mais'' e fale com a nossa equipe.',
    TRUE
  );
