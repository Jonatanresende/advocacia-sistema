-- ============================================================
-- MIGRATION 001 — Sistema Multi-Usuário
-- Executar no Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. LIMPAR DADOS DE TESTE
-- ────────────────────────────────────────────────────────────
TRUNCATE TABLE agendamentos_adv RESTART IDENTITY CASCADE;
TRUNCATE TABLE clientes_adv RESTART IDENTITY CASCADE;
TRUNCATE TABLE leads_adv RESTART IDENTITY CASCADE;


-- ────────────────────────────────────────────────────────────
-- 1. TABELA PERFIS
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
COMMENT ON COLUMN perfis.role IS 'admin = acesso total | advogado = dados próprios | funcionario = acesso restrito';
COMMENT ON COLUMN perfis.advogado_id IS 'Vínculo com a tabela advogados (cor, disponibilidade)';


-- ────────────────────────────────────────────────────────────
-- 2. TABELA PERMISSOES_ROLE (configuráveis pelo admin)
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

-- Defaults: advogado
INSERT INTO permissoes_role (role, rota, label, ativo) VALUES
  ('advogado', '/dashboard',    'Dashboard',     TRUE),
  ('advogado', '/kanban',       'Kanban',         TRUE),
  ('advogado', '/leads',        'Leads',          TRUE),
  ('advogado', '/clientes',     'Clientes',       TRUE),
  ('advogado', '/follow-up',    'Follow Up',      TRUE),
  ('advogado', '/agendamentos', 'Agendamentos',   TRUE)
ON CONFLICT (role, rota) DO NOTHING;

-- Defaults: funcionario
INSERT INTO permissoes_role (role, rota, label, ativo) VALUES
  ('funcionario', '/dashboard',    'Dashboard',     FALSE),
  ('funcionario', '/kanban',       'Kanban',         TRUE),
  ('funcionario', '/leads',        'Leads',          TRUE),
  ('funcionario', '/clientes',     'Clientes',       FALSE),
  ('funcionario', '/follow-up',    'Follow Up',      FALSE),
  ('funcionario', '/agendamentos', 'Agendamentos',   TRUE)
ON CONFLICT (role, rota) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 3. COLUNAS owner_id em leads e agendamentos
-- ────────────────────────────────────────────────────────────
ALTER TABLE leads_adv
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE agendamentos_adv
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN leads_adv.owner_id       IS 'Usuário que criou/é responsável pelo lead';
COMMENT ON COLUMN agendamentos_adv.owner_id IS 'Usuário que criou o agendamento';


-- ────────────────────────────────────────────────────────────
-- 4. TRIGGER — criar perfil automaticamente ao criar usuário
-- ────────────────────────────────────────────────────────────
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


-- ────────────────────────────────────────────────────────────
-- 5. HELPER FUNCTION — retorna o role do usuário atual
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM perfis WHERE id = auth.uid();
$$;


-- ────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- 6.1 PERFIS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfis: admin acesso total" ON perfis;
DROP POLICY IF EXISTS "perfis: usuario vê o próprio" ON perfis;
DROP POLICY IF EXISTS "perfis: usuario edita o próprio" ON perfis;

-- Admin vê e edita todos os perfis
CREATE POLICY "perfis: admin acesso total"
  ON perfis FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Qualquer usuário lê o próprio perfil
CREATE POLICY "perfis: usuario vê o próprio"
  ON perfis FOR SELECT
  USING (id = auth.uid());

-- Qualquer usuário edita o próprio perfil (exceto role e ativo)
CREATE POLICY "perfis: usuario edita o próprio"
  ON perfis FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- 6.2 PERMISSOES_ROLE
ALTER TABLE permissoes_role ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permissoes_role: leitura autenticada" ON permissoes_role;
DROP POLICY IF EXISTS "permissoes_role: admin edita" ON permissoes_role;

-- Todos os usuários autenticados podem LER (para montar o menu)
CREATE POLICY "permissoes_role: leitura autenticada"
  ON permissoes_role FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Somente admin pode alterar
CREATE POLICY "permissoes_role: admin edita"
  ON permissoes_role FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- 6.3 LEADS_ADV
ALTER TABLE leads_adv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads: admin acesso total" ON leads_adv;
DROP POLICY IF EXISTS "leads: funcionario acesso total" ON leads_adv;
DROP POLICY IF EXISTS "leads: advogado vê os próprios" ON leads_adv;

-- Admin: acesso total
CREATE POLICY "leads: admin acesso total"
  ON leads_adv FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Funcionario: lê e edita todos os leads
CREATE POLICY "leads: funcionario acesso total"
  ON leads_adv FOR ALL
  USING (get_my_role() = 'funcionario')
  WITH CHECK (get_my_role() = 'funcionario');

-- Advogado: vê e edita apenas os próprios leads
CREATE POLICY "leads: advogado vê os próprios"
  ON leads_adv FOR ALL
  USING (get_my_role() = 'advogado' AND owner_id = auth.uid())
  WITH CHECK (get_my_role() = 'advogado' AND owner_id = auth.uid());


-- 6.4 AGENDAMENTOS_ADV
ALTER TABLE agendamentos_adv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agendamentos: admin acesso total" ON agendamentos_adv;
DROP POLICY IF EXISTS "agendamentos: funcionario acesso total" ON agendamentos_adv;
DROP POLICY IF EXISTS "agendamentos: advogado vê os próprios" ON agendamentos_adv;

-- Admin: acesso total
CREATE POLICY "agendamentos: admin acesso total"
  ON agendamentos_adv FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

-- Funcionario: acesso total
CREATE POLICY "agendamentos: funcionario acesso total"
  ON agendamentos_adv FOR ALL
  USING (get_my_role() = 'funcionario')
  WITH CHECK (get_my_role() = 'funcionario');

-- Advogado: vê apenas os próprios agendamentos
CREATE POLICY "agendamentos: advogado vê os próprios"
  ON agendamentos_adv FOR ALL
  USING (get_my_role() = 'advogado' AND owner_id = auth.uid())
  WITH CHECK (get_my_role() = 'advogado' AND owner_id = auth.uid());


-- 6.5 CLIENTES_ADV
ALTER TABLE clientes_adv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clientes: admin acesso total" ON clientes_adv;
DROP POLICY IF EXISTS "clientes: funcionario acesso total" ON clientes_adv;
DROP POLICY IF EXISTS "clientes: advogado vê os próprios" ON clientes_adv;

CREATE POLICY "clientes: admin acesso total"
  ON clientes_adv FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "clientes: funcionario acesso total"
  ON clientes_adv FOR ALL
  USING (get_my_role() = 'funcionario')
  WITH CHECK (get_my_role() = 'funcionario');

-- Advogado: clientes derivados dos seus leads
CREATE POLICY "clientes: advogado vê os próprios"
  ON clientes_adv FOR ALL
  USING (
    get_my_role() = 'advogado'
    AND lead_id IN (
      SELECT id FROM leads_adv WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_my_role() = 'advogado'
    AND lead_id IN (
      SELECT id FROM leads_adv WHERE owner_id = auth.uid()
    )
  );


-- ────────────────────────────────────────────────────────────
-- 7. CRIAR PERFIL PARA USUÁRIOS EXISTENTES (usuário admin atual)
-- ────────────────────────────────────────────────────────────
INSERT INTO perfis (id, nome, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) AS nome,
  'admin' AS role
FROM auth.users
WHERE id NOT IN (SELECT id FROM perfis)
ON CONFLICT (id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- FIM DA MIGRATION 001
-- ────────────────────────────────────────────────────────────
