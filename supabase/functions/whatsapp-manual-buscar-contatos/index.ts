import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  // Tenta obter as variáveis da instância 2 (Atendimento Manual) ou da principal
  const evoUrl = (Deno.env.get('EVOLUTION_API_URL_2') || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '')
  const evoKey = Deno.env.get('EVOLUTION_API_KEY_2') || Deno.env.get('EVOLUTION_API_KEY') || ''
  const evoInstance = Deno.env.get('EVOLUTION_INSTANCE_2') || Deno.env.get('EVOLUTION_INSTANCE_NAME') || ''

  // Autenticação do usuário no Supabase
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ erro: 'Usuário não autenticado.' })
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user } } = await callerClient.auth.getUser()
  if (!user) {
    return json({ erro: 'Sessão inválida ou expirada.' })
  }

  if (!evoUrl || !evoKey || !evoInstance) {
    console.error('Configurações da Evolution API ausentes:', { evoUrl: !!evoUrl, evoKey: !!evoKey, evoInstance: !!evoInstance })
    return json({
      erro: 'Configurações da Evolution API não encontradas. Verifique as Secrets EVOLUTION_API_URL_2, EVOLUTION_API_KEY_2 e EVOLUTION_INSTANCE_2 no Supabase.',
    })
  }

  try {
    console.log(`Buscando contatos da instância "${evoInstance}" na Evolution API: ${evoUrl}`)

    // Tentar múltiplos endpoints conhecidos da Evolution API (v1 e v2)
    const tentativas = [
      { url: `${evoUrl}/chat/findContacts/${evoInstance}`, method: 'POST', body: {} },
      { url: `${evoUrl}/contacts/fetchAllContacts/${evoInstance}`, method: 'GET' },
      { url: `${evoUrl}/chat/findContacts/${evoInstance}`, method: 'GET' },
      { url: `${evoUrl}/contact/find/${evoInstance}`, method: 'POST', body: {} },
      { url: `${evoUrl}/contact/fetchContacts/${evoInstance}`, method: 'POST', body: {} },
    ]

    let ultimoErro = ''
    let dadosBrutos: unknown = null

    for (const t of tentativas) {
      try {
        console.log(`Tentando endpoint: ${t.method} ${t.url}`)
        const options: RequestInit = {
          method: t.method,
          headers: {
            'Content-Type': 'application/json',
            apikey: evoKey,
          },
        }
        if (t.body) {
          options.body = JSON.stringify(t.body)
        }

        const res = await fetch(t.url, options)
        const text = await res.text()

        if (res.ok) {
          try {
            dadosBrutos = JSON.parse(text)
            console.log(`Sucesso no endpoint ${t.url}`)
            break
          } catch {
            console.warn(`Resposta não é JSON válido: ${text.substring(0, 100)}`)
          }
        } else {
          ultimoErro = `HTTP ${res.status}: ${text.substring(0, 150)}`
          console.warn(`Falha no endpoint ${t.url}: ${ultimoErro}`)
        }
      } catch (e: any) {
        ultimoErro = e.message || 'Erro de conexão'
        console.warn(`Erro na requisição ${t.url}:`, ultimoErro)
      }
    }

    if (!dadosBrutos) {
      return json({
        erro: `Não foi possível obter a lista de contatos da Evolution API. ${ultimoErro}`,
      })
    }

    const contatosNormalizados = normalizarContatos(dadosBrutos)
    console.log(`Total de contatos encontrados e normalizados: ${contatosNormalizados.length}`)

    return json({ contatos: contatosNormalizados })
  } catch (err: any) {
    console.error('Erro na Edge Function whatsapp-manual-buscar-contatos:', err)
    return json({ erro: err.message || 'Erro interno ao buscar contatos.' })
  }
})

interface ContatoEvolutionFormatado {
  remoteJid: string
  pushName: string
  name: string
  profilePicUrl?: string
  number: string
}

function normalizarContatos(data: unknown): ContatoEvolutionFormatado[] {
  let lista: any[] = []

  if (Array.isArray(data)) {
    lista = data
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, any>
    if (Array.isArray(obj.contacts)) lista = obj.contacts
    else if (Array.isArray(obj.data)) lista = obj.data
    else if (Array.isArray(obj.result)) lista = obj.result
    else if (Array.isArray(obj.response)) lista = obj.response
    else lista = [obj]
  }

  const resultado: ContatoEvolutionFormatado[] = []
  const vistos = new Set<string>()

  for (const c of lista) {
    if (!c || typeof c !== 'object') continue

    const jid = String(c.remoteJid || c.jid || c.id || c.phone || '')
    // Ignora grupos (@g.us) e status (@broadcast)
    if (!jid || jid.includes('@g.us') || jid.includes('@broadcast')) continue

    const numeros = jid.replace(/@.*/g, '').replace(/\D/g, '') || String(c.number || '').replace(/\D/g, '')
    if (!numeros || numeros.length < 8) continue

    let numLimpo = numeros
    if (numLimpo.startsWith('55') && numLimpo.length === 12) {
      numLimpo = numLimpo.slice(0, 4) + '9' + numLimpo.slice(4)
    }

    if (vistos.has(numLimpo)) continue
    vistos.add(numLimpo)

    const nomePush = (c.pushName || c.notify || '').trim()
    const nomeNormal = (c.name || c.formattedName || c.shortName || '').trim()
    const foto = (c.profilePicUrl || c.profilePictureUrl || c.imgUrl || c.picture || '').trim()

    resultado.push({
      remoteJid: jid.includes('@') ? jid : `${numLimpo}@s.whatsapp.net`,
      pushName: nomePush || nomeNormal || `Contato ${numLimpo}`,
      name: nomeNormal || nomePush || `Contato ${numLimpo}`,
      profilePicUrl: foto || undefined,
      number: numLimpo,
    })
  }

  return resultado
}
