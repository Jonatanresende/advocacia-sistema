-- Permitir que todos os usuários autenticados vejam os advogados cadastrados
DROP POLICY IF EXISTS "admin_select" ON public.advogados;

CREATE POLICY "advogados_select_authenticated" ON public.advogados
  FOR SELECT TO authenticated USING (true);
