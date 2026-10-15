import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function normalizarNumero(raw: string): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  if (raw.includes('@g.us') || digits.length > 14) return digits
  if (digits.length === 10) {
    const ddd = digits.slice(0, 2)
    const rest = digits.slice(2)
    return ['6', '7', '8', '9'].includes(rest[0]) ? `55${ddd}9${rest}` : `55${ddd}${rest}`
  }
  if (digits.length === 11) {
    return `55${digits}`
  }
  if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4)
    const rest = digits.slice(4)
    return ['6', '7', '8', '9'].includes(rest[0]) ? `55${ddd}9${rest}` : digits
  }
  return digits
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

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verifica autenticação de quem chama
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Não autorizado' }, 401)

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user: caller } } = await callerClient.auth.getUser()
  if (!caller) return json({ error: 'Não autorizado' }, 401)

  try {
    const body = await req.json()
    const { contato_id, whatsapp, texto, midia_url, tipo_midia, metadata } = body

    if (!contato_id || !whatsapp) {
      return json({ error: 'Campos obrigatórios: contato_id, whatsapp' }, 400)
    }

    const numLimpo = normalizarNumero(String(whatsapp))

    // Variáveis de ambiente da Evolution API para o 2º número
    const evoUrl = (Deno.env.get('EVOLUTION_API_URL_2') || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '')
    const evoKey = Deno.env.get('EVOLUTION_API_KEY_2') || Deno.env.get('EVOLUTION_API_KEY') || ''
    const evoInstance = Deno.env.get('EVOLUTION_INSTANCE_2') || Deno.env.get('EVOLUTION_INSTANCE_NAME') || ''

    let envioApiSucesso = false

    // Se as variáveis da Evolution API estiverem configuradas, dispara o envio real
    if (evoUrl && evoKey && evoInstance) {
      console.log(`Disparando envio para Evolution API (${evoInstance}): ${evoUrl}`)
      const headersEvo = {
        'Content-Type': 'application/json',
        'apikey': evoKey,
      }

      let endpoint = ''
      let bodyData: Record<string, unknown> = {}

      if (midia_url) {
        endpoint = tipo_midia === 'audio'
          ? `${evoUrl}/message/sendWhatsAppAudio/${evoInstance}`
          : `${evoUrl}/message/sendMedia/${evoInstance}`

        bodyData = tipo_midia === 'audio'
          ? { number: numLimpo, audio: midia_url }
          : {
              number: numLimpo,
              media: midia_url,
              mediatype: tipo_midia === 'imagem' ? 'image' : tipo_midia === 'video' ? 'video' : 'document',
              caption: texto || '',
              fileName: metadata?.nomeOriginal || 'arquivo',
            }
      } else if (texto) {
        endpoint = `${evoUrl}/message/sendText/${evoInstance}`
        bodyData = {
          number: numLimpo,
          text: texto,
        }
      }

      if (endpoint) {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: headersEvo,
          body: JSON.stringify(bodyData),
        })

        const resText = await res.text()
        console.log(`Resposta Evolution API [Status ${res.status}]:`, resText)

        if (res.ok) {
          envioApiSucesso = true
        } else {
          console.error(`Erro ao disparar Evolution API [${res.status}]: ${resText}`)
        }
      }
    } else {
      console.warn('Variáveis da Evolution API (EVOLUTION_API_URL_2, EVOLUTION_API_KEY_2, EVOLUTION_INSTANCE_2) não configuradas no Supabase.')
    }

    // Insere o registro na tabela do Supabase (mensagens_whatsapp_manual)
    const { data: novaMensagem, error: insertErr } = await supabaseAdmin
      .from('mensagens_whatsapp_manual')
      .insert({
        contato_id,
        usuario_id: caller.id,
        tipo_remetente: 'atendente',
        conteudo: texto || null,
        tipo_midia: tipo_midia || 'texto',
        midia_url: midia_url || null,
        metadata: metadata || {},
        lida: true,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Atualiza ultima_mensagem no contato
    await supabaseAdmin
      .from('contatos_whatsapp_manual')
      .update({ ultima_mensagem: new Date().toISOString() })
      .eq('id', contato_id)

    return json({
      success: true,
      mensagem: novaMensagem,
      envio_api: envioApiSucesso,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro interno'
    return json({ error: errorMsg }, 500)
  }
})
