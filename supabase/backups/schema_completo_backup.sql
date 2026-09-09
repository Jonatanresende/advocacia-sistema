-- ============================================================
-- SCRIPT DE BACKUP COMPLETO DAS TABELAS E CONFIGURAÇÕES SUPABASE
-- Sistema: Sistema Advocacia (sistema-adv)
-- Data do Backup: 2026-09-08
-- ============================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. TIPOS / ENUMS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'advogado', 'funcionario');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'novo_contato',
        'conversando',
        'consulta_agendada',
        'confirmado',
        'compareceu',
        'follow_up',
        'fechado',
        'perdido'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agendamento_status AS ENUM (
        'agendado',
        'confirmado',
        'compareceu',
        'faltou',
        'cancelado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dia_semana AS ENUM (
        'domingo',
        'segunda',
        'terca',
        'quarta',
        'quinta',
        'sexta',
        'sabado'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE area_previdenciaria AS ENUM (
        'aposentadoria_idade',
        'aposentadoria_tempo_contribuicao',
        'aposentadoria_especial',
        'aposentadoria_invalidez',
        'auxilio_doenca',
        'bpc_loas',
        'pensao_morte',
        'auxilio_acidente',
        'salario_maternidade',
        'revisao_beneficio',
        'nao_identificada'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE status_qualificacao AS ENUM (
        'pendente',
        'provavel_direito',
        'duvidoso',
        'sem_direito_aparente'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE modalidade_atendimento AS ENUM ('online', 'presencial');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. TABELA ADVOGADOS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advogados (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome         TEXT NOT NULL,
  cor          TEXT NOT NULL DEFAULT '#3b82f6',
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE advogados IS 'Cadastro dos advogados do escritório.';


-- ────────────────────────────────────────────────────────────
-- 3. TABELA PERFIS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS perfis (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'funcionario'
                 CHECK (role IN ('admin', 'advogado', 'funcionario')),
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  avatar_url   TEXT,
  telefone     TEXT,
  advogado_id  UUID REFERENCES advogados(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE perfis IS 'Dados de perfil vinculados a auth.users. Um registro por usuário logado.';


-- ────────────────────────────────────────────────────────────
-- 4. TABELA PERMISSOES_ROLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissoes_role (
  id     SERIAL PRIMARY KEY,
  role   TEXT NOT NULL CHECK (role IN ('advogado', 'funcionario')),
  rota   TEXT NOT NULL,
  label  TEXT NOT NULL,
  ativo  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (role, rota)
);

COMMENT ON TABLE permissoes_role IS 'Controla quais rotas cada papel pode acessar. Admin sempre tem acesso total.';


-- ────────────────────────────────────────────────────────────
-- 5. TABELA OFFICE_CONFIG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS office_config (
  id           INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  nome         TEXT NOT NULL DEFAULT 'Escritório de Advocacia',
  logo_url     TEXT,
  favicon_url  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE office_config IS 'Configurações gerais do escritório (Logotipo, nome, etc). Registro único id=1.';


-- ────────────────────────────────────────────────────────────
-- 6. TABELA OFFICE_HOURS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS office_hours (
  id           TEXT PRIMARY KEY,
  dia          TEXT NOT NULL,
  aberto       BOOLEAN NOT NULL DEFAULT TRUE,
  hora_inicio  TIME,
  hora_fim     TIME
);

COMMENT ON TABLE office_hours IS 'Horário de funcionamento geral do escritório por dia da semana.';


-- ────────────────────────────────────────────────────────────
-- 7. TABELA ADVOGADO_HOURS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advogado_hours (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id  UUID NOT NULL REFERENCES advogados(id) ON DELETE CASCADE,
  dia          TEXT NOT NULL,
  aberto       BOOLEAN NOT NULL DEFAULT TRUE,
  hora_inicio  TIME,
  hora_fim     TIME
);

COMMENT ON TABLE advogado_hours IS 'Horários específicos de atendimento de cada advogado.';


-- ────────────────────────────────────────────────────────────
-- 8. TABELA LEADS_ADV
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leads_adv (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_lead                TEXT,
  whatsapp_lead            TEXT NOT NULL,
  motivo_contato           TEXT,
  resumo_conversa          TEXT,
  status                   TEXT NOT NULL DEFAULT 'novo_contato',
  inicio_atendimento       TIMESTAMPTZ DEFAULT NOW(),
  ultima_mensagem          TEXT,
  minutos_ultima_mensagem  INT,
  follow_up_1              TIMESTAMPTZ,
  follow_up_2              TIMESTAMPTZ,
  follow_up_3              TIMESTAMPTZ,
  data_agendamento         TIMESTAMPTZ,
  id_agendamento           UUID,
  anotacoes                TEXT,
  area_previdenciaria      TEXT DEFAULT 'nao_identificada',
  status_qualificacao      TEXT DEFAULT 'pendente',
  respostas_qualificacao   JSONB,
  status_atualizado_em     TIMESTAMPTZ DEFAULT NOW(),
  owner_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  atendimento_humano_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  atendido_por             TEXT,
  atendimento_humano_desde TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leads_adv IS 'Tabela principal de atendimento e triagem de leads.';


-- ────────────────────────────────────────────────────────────
-- 9. TABELA CLIENTES_ADV
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes_adv (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id              UUID NOT NULL REFERENCES leads_adv(id) ON DELETE CASCADE,
  data_primeira_visita TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE clientes_adv IS 'Leads convertidos em clientes do escritório.';


-- ────────────────────────────────────────────────────────────
-- 10. TABELA AGENDAMENTOS_ADV
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos_adv (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advogado_id      UUID NOT NULL REFERENCES advogados(id) ON DELETE CASCADE,
  lead_id          UUID REFERENCES leads_adv(id) ON DELETE SET NULL,
  cliente_id       UUID REFERENCES clientes_adv(id) ON DELETE SET NULL,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim    TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'agendado',
  modalidade       TEXT NOT NULL DEFAULT 'presencial',
  observacoes      TEXT,
  owner_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE agendamentos_adv IS 'Agendamentos e consultas marcadas na agenda.';


-- ────────────────────────────────────────────────────────────
-- 11. TABELA DOCUMENTOS_LEAD
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos_lead (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads_adv(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  tipo         TEXT,
  descricao    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE documentos_lead IS 'Documentos anexados às conversas/fichas dos leads.';


-- ────────────────────────────────────────────────────────────
-- 12. FUNÇÕES E TRIGGERS AUTOMÁTICOS
-- ────────────────────────────────────────────────────────────

-- Criar perfil automaticamente no cadastro de auth.users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO perfis (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'funcionario')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Helper function: retorna a role do usuário logado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM perfis WHERE id = auth.uid();
$$;


-- ────────────────────────────────────────────────────────────
-- 13. POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ────────────────────────────────────────────────────────────

-- PERFIS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfis: admin acesso total" ON perfis;
DROP POLICY IF EXISTS "perfis: usuario vê o próprio" ON perfis;
DROP POLICY IF EXISTS "perfis: usuario edita o próprio" ON perfis;

CREATE POLICY "perfis: admin acesso total" ON perfis FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "perfis: usuario vê o próprio" ON perfis FOR SELECT USING (id = auth.uid());
CREATE POLICY "perfis: usuario edita o próprio" ON perfis FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- PERMISSOES_ROLE
ALTER TABLE permissoes_role ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "permissoes_role: leitura autenticada" ON permissoes_role;
DROP POLICY IF EXISTS "permissoes_role: admin edita" ON permissoes_role;

CREATE POLICY "permissoes_role: leitura autenticada" ON permissoes_role FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "permissoes_role: admin edita" ON permissoes_role FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- OFFICE_CONFIG
ALTER TABLE office_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "office_config: leitura autenticada" ON office_config;
DROP POLICY IF EXISTS "office_config: admin edita" ON office_config;

CREATE POLICY "office_config: leitura autenticada" ON office_config FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "office_config: admin edita" ON office_config FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- OFFICE_HOURS
ALTER TABLE office_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "office_hours: leitura autenticada" ON office_hours;
DROP POLICY IF EXISTS "office_hours: admin edita" ON office_hours;

CREATE POLICY "office_hours: leitura autenticada" ON office_hours FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "office_hours: admin edita" ON office_hours FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- ADVOGADOS & ADVOGADO_HOURS
ALTER TABLE advogados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advogados: leitura autenticada" ON advogados;
DROP POLICY IF EXISTS "advogados: admin edita" ON advogados;

CREATE POLICY "advogados: leitura autenticada" ON advogados FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "advogados: admin edita" ON advogados FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

ALTER TABLE advogado_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "advogado_hours: leitura autenticada" ON advogado_hours;
DROP POLICY IF EXISTS "advogado_hours: admin edita" ON advogado_hours;

CREATE POLICY "advogado_hours: leitura autenticada" ON advogado_hours FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "advogado_hours: admin edita" ON advogado_hours FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');

-- LEADS_ADV
ALTER TABLE leads_adv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leads: admin acesso total" ON leads_adv;
DROP POLICY IF EXISTS "leads: funcionario acesso total" ON leads_adv;
DROP POLICY IF EXISTS "leads: advogado vê os próprios" ON leads_adv;

CREATE POLICY "leads: admin acesso total" ON leads_adv FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "leads: funcionario acesso total" ON leads_adv FOR ALL USING (get_my_role() = 'funcionario') WITH CHECK (get_my_role() = 'funcionario');
CREATE POLICY "leads: advogado vê os próprios" ON leads_adv FOR ALL USING (get_my_role() = 'advogado' AND owner_id = auth.uid()) WITH CHECK (get_my_role() = 'advogado' AND owner_id = auth.uid());

-- AGENDAMENTOS_ADV
ALTER TABLE agendamentos_adv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agendamentos: admin acesso total" ON agendamentos_adv;
DROP POLICY IF EXISTS "agendamentos: funcionario acesso total" ON agendamentos_adv;
DROP POLICY IF EXISTS "agendamentos: advogado vê os próprios" ON agendamentos_adv;

CREATE POLICY "agendamentos: admin acesso total" ON agendamentos_adv FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "agendamentos: funcionario acesso total" ON agendamentos_adv FOR ALL USING (get_my_role() = 'funcionario') WITH CHECK (get_my_role() = 'funcionario');
CREATE POLICY "agendamentos: advogado vê os próprios" ON agendamentos_adv FOR ALL USING (get_my_role() = 'advogado' AND owner_id = auth.uid()) WITH CHECK (get_my_role() = 'advogado' AND owner_id = auth.uid());

-- CLIENTES_ADV
ALTER TABLE clientes_adv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes: admin acesso total" ON clientes_adv;
DROP POLICY IF EXISTS "clientes: funcionario acesso total" ON clientes_adv;
DROP POLICY IF EXISTS "clientes: advogado vê os próprios" ON clientes_adv;

CREATE POLICY "clientes: admin acesso total" ON clientes_adv FOR ALL USING (get_my_role() = 'admin') WITH CHECK (get_my_role() = 'admin');
CREATE POLICY "clientes: funcionario acesso total" ON clientes_adv FOR ALL USING (get_my_role() = 'funcionario') WITH CHECK (get_my_role() = 'funcionario');
CREATE POLICY "clientes: advogado vê os próprios" ON clientes_adv FOR ALL USING (
  get_my_role() = 'advogado' AND lead_id IN (SELECT id FROM leads_adv WHERE owner_id = auth.uid())
) WITH CHECK (
  get_my_role() = 'advogado' AND lead_id IN (SELECT id FROM leads_adv WHERE owner_id = auth.uid())
);

-- DOCUMENTOS_LEAD
ALTER TABLE documentos_lead ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documentos: acesso autenticado" ON documentos_lead;

CREATE POLICY "documentos: acesso autenticado" ON documentos_lead FOR ALL USING (auth.uid() IS NOT NULL);


-- ────────────────────────────────────────────────────────────
-- 14. INSERÇÕES INICIAIS (SEED DATA)
-- ────────────────────────────────────────────────────────────

-- Dados iniciais office_config
INSERT INTO office_config (id, nome)
VALUES (1, 'Escritório de Advocacia')
ON CONFLICT (id) DO NOTHING;

-- Permissões Padrão para Advogado
INSERT INTO permissoes_role (role, rota, label, ativo) VALUES
  ('advogado', '/dashboard',    'Dashboard',     TRUE),
  ('advogado', '/kanban',       'Kanban',         TRUE),
  ('advogado', '/leads',        'Leads',          TRUE),
  ('advogado', '/clientes',     'Clientes',       TRUE),
  ('advogado', '/follow-up',    'Follow Up',      TRUE),
  ('advogado', '/agendamentos', 'Agendamentos',   TRUE)
ON CONFLICT (role, rota) DO NOTHING;

-- Permissões Padrão para Funcionário
INSERT INTO permissoes_role (role, rota, label, ativo) VALUES
  ('funcionario', '/dashboard',    'Dashboard',     FALSE),
  ('funcionario', '/kanban',       'Kanban',         TRUE),
  ('funcionario', '/leads',        'Leads',          TRUE),
  ('funcionario', '/clientes',     'Clientes',       FALSE),
  ('funcionario', '/follow-up',    'Follow Up',      FALSE),
  ('funcionario', '/agendamentos', 'Agendamentos',   TRUE)
ON CONFLICT (role, rota) DO NOTHING;

-- Horários Padrão do Escritório
INSERT INTO office_hours (id, dia, aberto, hora_inicio, hora_fim) VALUES
  ('segunda', 'Segunda-feira', TRUE, '08:00', '18:00'),
  ('terca',   'Terça-feira',   TRUE, '08:00', '18:00'),
  ('quarta',  'Quarta-feira',  TRUE, '08:00', '18:00'),
  ('quinta',  'Quinta-feira',  TRUE, '08:00', '18:00'),
  ('sexta',   'Sexta-feira',   TRUE, '08:00', '18:00'),
  ('sabado',  'Sábado',        FALSE, NULL, NULL),
  ('domingo', 'Domingo',       FALSE, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- Sincronizar perfis para usuários já existentes
INSERT INTO perfis (id, nome, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) AS nome,
  'admin' AS role
FROM auth.users
WHERE id NOT IN (SELECT id FROM perfis)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM DO SCRIPT DE BACKUP
-- ============================================================
