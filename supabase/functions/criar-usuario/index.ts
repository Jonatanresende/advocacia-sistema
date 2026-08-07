import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  // Admin client (service role)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify caller
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autorizado' }, 401)

  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Não autorizado' }, 401)

  const { data: perfilCaller } = await supabaseAdmin
    .from('perfis')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (perfilCaller?.role !== 'admin') return json({ error: 'Acesso negado' }, 403)

  // ─── GET — listar usuários ────────────────────────────────
  if (req.method === 'GET') {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (error) return json({ error: error.message }, 400)

    const { data: perfis } = await supabaseAdmin.from('perfis').select('*')

    const result = users
      .map((u) => {
        const perfil = perfis?.find((p) => p.id === u.id)
        if (!perfil) return null
        return { ...perfil, email: u.email ?? '' }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a!.created_at).getTime() - new Date(b!.created_at).getTime())

    return json(result)
  }

  // ─── POST — criar usuário ─────────────────────────────────
  if (req.method === 'POST') {
    const { nome, email, senha, role, advogado_id: input_advogado_id, telefone, criar_cadastro_advogado, cor } = await req.json()

    if (!nome || !email || !senha || !role) {
      return json({ error: 'Campos obrigatórios: nome, email, senha, role' }, 400)
    }

    // 1. Cria a conta de login no Auth primeiro
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, role },
    })

    if (createError) return json({ error: createError.message }, 400)

    let advogado_id = input_advogado_id

    // 2. Se a conta de login foi criada com sucesso, cria o cadastro na tabela advogados se necessário
    if (role === 'advogado' && criar_cadastro_advogado && newUser.user) {
      const { data: newAdv, error: advError } = await supabaseAdmin
        .from('advogados')
        .insert({ nome, cor: cor || '#3b82f6', ativo: true })
        .select('id')
        .single()
      
      if (advError) {
        // Rollback: se falhar a criação do advogado, exclui o usuário criado no Auth para manter a consistência
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return json({ error: 'Erro ao criar cadastro de advogado: ' + advError.message }, 400)
      }
      advogado_id = newAdv.id
    }

    // 3. Atualiza os campos extras do perfil
    if (newUser.user) {
      await supabaseAdmin
        .from('perfis')
        .update({
          advogado_id: advogado_id || null,
          telefone: telefone || null,
        })
        .eq('id', newUser.user.id)
    }

    return json({ user_id: newUser.user?.id, advogado_id })
  }

  // ─── PUT — atualizar usuário ──────────────────────────────
  if (req.method === 'PUT') {
    const { id, nome, role, ativo, advogado_id, telefone, senha } = await req.json()
    if (!id) return json({ error: 'ID obrigatório' }, 400)

    const perfilUpdate: Record<string, unknown> = {}
    if (nome !== undefined) perfilUpdate.nome = nome
    if (role !== undefined) perfilUpdate.role = role
    if (ativo !== undefined) perfilUpdate.ativo = ativo
    if (advogado_id !== undefined) perfilUpdate.advogado_id = advogado_id || null
    if (telefone !== undefined) perfilUpdate.telefone = telefone || null

    if (Object.keys(perfilUpdate).length > 0) {
      const { error } = await supabaseAdmin.from('perfis').update(perfilUpdate).eq('id', id)
      if (error) return json({ error: error.message }, 400)
    }

    if (senha) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: senha })
      if (error) return json({ error: error.message }, 400)
    }

    if (nome || role) {
      await supabaseAdmin.auth.admin.updateUserById(id, {
        user_metadata: {
          ...(nome && { nome }),
          ...(role && { role }),
        },
      })
    }

    return json({ success: true })
  }

  // ─── DELETE — excluir usuário ──────────────────────────────
  if (req.method === 'DELETE') {
    const url = new URL(req.url)
    const idFromQuery = url.searchParams.get('id')
    let id = idFromQuery
    if (!id) {
      try { const body = await req.json(); id = body.id } catch { /* ignore */ }
    }
    if (!id) return json({ error: 'ID do usuário é obrigatório' }, 400)

    // 1. Busca o perfil para saber nome e advogado_id antes de excluir
    const { data: perfil } = await supabaseAdmin
      .from('perfis')
      .select('advogado_id, nome')
      .eq('id', id)
      .maybeSingle()

    // 2. Exclui o usuário no Auth (o cascade apagará a linha de perfis automaticamente)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (deleteAuthError) return json({ error: 'Erro ao excluir usuário: ' + deleteAuthError.message }, 400)

    // 3. Determina qual registro de advogados deve ser excluído
    let advogadoIdToDelete: string | null = perfil?.advogado_id ?? null

    // 4. Se não tem advogado_id no perfil, tenta achar o advogados pelo nome exato (limpeza de órfãos)
    if (!advogadoIdToDelete && perfil?.nome) {
      const { data: advByName } = await supabaseAdmin
        .from('advogados')
        .select('id')
        .eq('nome', perfil.nome)
        .limit(1)
        .maybeSingle()
      if (advByName) advogadoIdToDelete = advByName.id
    }

    // 5. Exclui o registro de advogados se encontrado
    if (advogadoIdToDelete) {
      // 5a. Remove a referência em agendamentos (não apaga os agendamentos — apenas desvincula o advogado)
      await supabaseAdmin
        .from('agendamentos_adv')
        .update({ advogado_id: null })
        .eq('advogado_id', advogadoIdToDelete)

      // 5b. Remove horários de atendimento vinculados
      await supabaseAdmin
        .from('advogado_hours')
        .delete()
        .eq('advogado_id', advogadoIdToDelete)

      // 5c. Remove o registro principal de advogados
      const { error: deleteAdvError } = await supabaseAdmin
        .from('advogados')
        .delete()
        .eq('id', advogadoIdToDelete)

      if (deleteAdvError) {
        console.warn('Não foi possível excluir o registro de advogado:', deleteAdvError.message)
      }
    }

    return json({ success: true })
  }

  return json({ error: 'Method not allowed' }, 405)
})
