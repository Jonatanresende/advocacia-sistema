import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CHATWOOT_BASE_URL = (Deno.env.get('CHATWOOT_BASE_URL') ?? '').replace(/\/$/, '')
const CHATWOOT_API_TOKEN = Deno.env.get('CHATWOOT_API_TOKEN') ?? ''

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // Admin client (service role) — único lugar que sabe o token do Chatwoot
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ─── Verifica quem está chamando ────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autorizado' }, 401)

  // Client "na pele" de quem chamou — respeita RLS igual o navegador respeitaria.
  // É essa checagem que garante que um advogado só acesse conversas dos leads
  // que ele realmente tem permissão de ver (mesma regra do resto do CRM).
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
    .select('nome')
    .eq('id', caller.id)
    .single()

  const nomeAtendente = perfilCaller?.nome || 'Atendente'

  // ─── Corpo da requisição ─────────────────────────────────────
  const { action, lead_id, texto } = await req.json()
  if (!action || !lead_id) {
    return json({ error: 'Campos obrigatórios: action, lead_id' }, 400)
  }

  // Busca o lead usando o client do PRÓPRIO usuário (não o admin) — se o RLS
  // não deixar esse usuário ver esse lead, a consulta volta vazia aqui,
  // e a ação é negada antes de qualquer chamada ao Chatwoot.
  const { data: lead, error: leadError } = await callerClient
    .from('leads_adv')
    .select('id, nome_lead, id_conta_chatwoot, id_conversa_chatwoot, atendimento_humano_ativo')
    .eq('id', lead_id)
    .single()

  if (leadError || !lead) {
    return json({ error: 'Lead não encontrado ou sem permissão de acesso' }, 403)
  }

  if (!lead.id_conta_chatwoot || !lead.id_conversa_chatwoot) {
    return json({ error: 'Esse lead ainda não tem conversa vinculada no Chatwoot' }, 400)
  }

  const conversationUrl = `${CHATWOOT_BASE_URL}/api/v1/accounts/${lead.id_conta_chatwoot}/conversations/${lead.id_conversa_chatwoot}`

  // ─── Ação: buscar mensagens da conversa ───────────────────────
  if (action === 'buscar_mensagens') {
    const resp = await fetch(`${conversationUrl}/messages`, {
      headers: { api_access_token: CHATWOOT_API_TOKEN },
    })
    const data = await resp.json()
    if (!resp.ok) return json({ error: 'Erro ao buscar mensagens no Chatwoot', detalhe: data }, 400)
    return json(data)
  }

  // ─── Ação: enviar mensagem manual ─────────────────────────────
  if (action === 'enviar_mensagem') {
    if (!texto) return json({ error: 'Campo texto é obrigatório' }, 400)

    const conteudoFinal = `**${nomeAtendente}**: ${texto}`

    const resp = await fetch(`${conversationUrl}/messages`, {
      method: 'POST',
      headers: { api_access_token: CHATWOOT_API_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: conteudoFinal, message_type: 'outgoing' }),
    })
    const data = await resp.json()
    if (!resp.ok) return json({ error: 'Erro ao enviar mensagem no Chatwoot', detalhe: data }, 400)

    // Assume o atendimento automaticamente (cenário: humano manda mensagem
    // sem precisar clicar em "Assumir" antes). Preserva a data original de
    // início do atendimento humano se já estava ativo, pra não "resetar o
    // relógio" a cada mensagem nova.
    const updateFields: Record<string, unknown> = { atendido_por: caller.id }
    if (!lead.atendimento_humano_ativo) {
      updateFields.atendimento_humano_ativo = true
      updateFields.atendimento_humano_desde = new Date().toISOString()
    }
    await supabaseAdmin.from('leads_adv').update(updateFields).eq('id', lead.id)

    return json(data)
  }

  // ─── Ação: assumir atendimento (sem mandar mensagem ainda) ────
  if (action === 'assumir_atendimento') {
    await supabaseAdmin
      .from('leads_adv')
      .update({
        atendimento_humano_ativo: true,
        atendido_por: caller.id,
        atendimento_humano_desde: new Date().toISOString(),
      })
      .eq('id', lead.id)
    return json({ success: true })
  }

  // ─── Ação: devolver o controle pra IA ──────────────────────────
  if (action === 'devolver_para_ia') {
    await supabaseAdmin
      .from('leads_adv')
      .update({
        atendimento_humano_ativo: false,
        atendido_por: null,
        atendimento_humano_desde: null,
      })
      .eq('id', lead.id)
    return json({ success: true })
  }

  return json({ error: 'Ação inválida' }, 400)
})
