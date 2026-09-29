-- Migration: Adiciona permissão de acesso à rota /mensagens para os perfis
-- funcionario e advogado.
-- Anteriormente a rota estava acessível por URL direta (sem RestrictedRoute),
-- mas não aparecia no Sidebar para usuários não-admin pois a entrada estava
-- ausente na tabela permissoes_role.

INSERT INTO permissoes_role (role, rota, label, ativo)
VALUES
  ('funcionario', '/mensagens', 'Mensagens', true),
  ('advogado',    '/mensagens', 'Mensagens', true)
ON CONFLICT DO NOTHING;
