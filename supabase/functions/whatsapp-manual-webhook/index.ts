import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Extensões por tipo MIME mais comuns do WhatsApp
function extPorMime(mime: string, fallback = 'bin'): string {
  const map: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/ogg; codecs=opus': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/webm': 'webm',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gpp': '3gp',
    'application/pdf': 'pdf',
  }
  return map[mime] ?? fallback
}

/**
 * Normaliza o número de telefone para o padrão brasileiro com 9 dígitos.
 * A Evolution API às vezes envia números no formato antigo (8 dígitos após DDD),
 * sem o nono dígito obrigatório para celulares brasileiros.
 *
 * Exemplos:
 *   558594517619  → 5585994517619  (BR, 8 dígitos → adiciona 9)
 *   5585994517619 → 5585994517619  (BR, 9 dígitos → sem alteração)
 *   14155551234   → 14155551234    (outros países → sem alteração)
 */
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

/**
 * Chama a Evolution API para baixar a mídia de uma mensagem
 * e retorna { buffer, mimetype } ou null em caso de falha.
 */
async function baixarMidiaEvolution(
  evoUrl: string,
  evoKey: string,
  evoInstance: string,
  messagePayload: Record<string, unknown>,
): Promise<{ buffer: Uint8Array; mimetype: string; ext: string } | null> {
  try {
    const endpoint = `${evoUrl}/chat/getBase64FromMediaMessage/${evoInstance}`
    console.log('Chamando Evolution API para baixar mídia:', endpoint)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: evoKey,
      },
      body: JSON.stringify({ message: messagePayload, convertToMp4: false }),
    })

    if (!res.ok) {
      const txt = await res.text()
      console.warn(`Evolution API retornou ${res.status} ao baixar mídia:`, txt)
      return null
    }

    const respJson = await res.json()
    // A Evolution API retorna { base64: "...", mimetype: "audio/ogg" }
    const base64: string = respJson?.base64 ?? respJson?.data?.base64 ?? ''
    const mimetype: string = respJson?.mimetype ?? respJson?.data?.mimetype ?? 'application/octet-stream'

    if (!base64) {
      console.warn('Evolution API não retornou base64. Resposta:', JSON.stringify(respJson))
      return null
    }

    // Decodifica base64 → Uint8Array
    const raw = atob(base64)
    const buffer = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i)

    const ext = extPorMime(mimetype, 'bin')
    return { buffer, mimetype, ext }
  } catch (e) {
    console.error('Erro ao baixar mídia da Evolution API:', e)
    return null
  }
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
  const evoUrl = (Deno.env.get('EVOLUTION_API_URL_2') || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '')
  const evoKey = Deno.env.get('EVOLUTION_API_KEY_2') || Deno.env.get('EVOLUTION_API_KEY') || ''
  const evoInstance = Deno.env.get('EVOLUTION_INSTANCE_2') || Deno.env.get('EVOLUTION_INSTANCE_NAME') || ''

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const payload = await req.json()
    console.log('Webhook recebido da Evolution API:', JSON.stringify(payload))

    // ── Normaliza o payload da Evolution API ────────────────────────────────
    // Formato 1 (v1/v2 padrão): { event, instance, data: { key, pushName, message } }
    // Formato 2 (legado):       { key, pushName, message, ... }
    const dataBlock = payload?.data ?? payload
    const key = dataBlock?.key ?? {}
    const fromMe = key?.fromMe === true

    // Mensagem enviada pelo próprio celular — ignora para não duplicar
    if (fromMe) {
      return json({ status: 'ignored_from_me' })
    }

    const remoteJid: string = key?.remoteJid ?? dataBlock?.remoteJid ?? payload?.remoteJid ?? ''
    const numLimpo = normalizarNumero(remoteJid)

    if (!numLimpo) {
      console.warn('remoteJid não encontrado. payload:', JSON.stringify(payload))
      return json({ status: 'no_remote_jid' })
    }

    console.log(`remoteJid original: ${remoteJid} → normalizado: ${numLimpo}`)

    const pushName: string | null = dataBlock?.pushName ?? payload?.pushName ?? null

    // ── Extrai conteúdo da mensagem ─────────────────────────────────────────
    const messageObj = dataBlock?.message ?? {}
    let texto: string | null = null
    let tipoMidia = 'texto'
    let midiaUrl: string | null = null
    const metadataObj: Record<string, unknown> = {}

    // Tipos de mídia que precisam ser baixados da Evolution API
    const ehMidiaComArquivo =
      messageObj?.imageMessage ||
      messageObj?.videoMessage ||
      messageObj?.audioMessage ||
      messageObj?.documentMessage ||
      messageObj?.stickerMessage

    if (messageObj?.conversation) {
      texto = messageObj.conversation
    } else if (messageObj?.extendedTextMessage?.text) {
      texto = messageObj.extendedTextMessage.text
    } else if (messageObj?.imageMessage) {
      tipoMidia = 'imagem'
      texto = messageObj.imageMessage.caption ?? null
      metadataObj.mimetype = messageObj.imageMessage.mimetype ?? 'image/jpeg'
    } else if (messageObj?.videoMessage) {
      tipoMidia = 'video'
      texto = messageObj.videoMessage.caption ?? null
      metadataObj.mimetype = messageObj.videoMessage.mimetype ?? 'video/mp4'
    } else if (messageObj?.audioMessage) {
      tipoMidia = 'audio'
      metadataObj.mimetype = messageObj.audioMessage.mimetype ?? 'audio/ogg'
    } else if (messageObj?.documentMessage) {
      tipoMidia = messageObj.documentMessage.mimetype?.includes('pdf') ? 'pdf' : 'arquivo'
      texto = messageObj.documentMessage.caption ?? null
      metadataObj.nomeOriginal = messageObj.documentMessage.fileName ?? 'documento'
      metadataObj.mimetype = messageObj.documentMessage.mimetype ?? 'application/octet-stream'
    } else if (messageObj?.stickerMessage) {
      tipoMidia = 'imagem'
      metadataObj.mimetype = messageObj.stickerMessage.mimetype ?? 'image/webp'
    } else {
      console.warn('Tipo de mensagem desconhecido:', JSON.stringify(messageObj))
    }

    // ── 1. Busca ou cria o contato ──────────────────────────────────────────
    let contatoId: string | null = null
    let { data: contatoExistente } = await supabaseAdmin
      .from('contatos_whatsapp_manual')
      .select('id, nome, whatsapp')
      .eq('whatsapp', numLimpo)
      .maybeSingle()

    // Fallback: se não encontrou com 55, busca pelo formato antigo sem o DDI 55
    if (!contatoExistente && numLimpo.startsWith('55')) {
      const semDdi = numLimpo.slice(2)
      const { data: contatoSemDdi } = await supabaseAdmin
        .from('contatos_whatsapp_manual')
        .select('id, nome, whatsapp')
        .eq('whatsapp', semDdi)
        .maybeSingle()

      if (contatoSemDdi) {
        contatoExistente = contatoSemDdi
        // Atualiza para o formato normalizado com 55
        await supabaseAdmin
          .from('contatos_whatsapp_manual')
          .update({ whatsapp: numLimpo, updated_at: new Date().toISOString() })
          .eq('id', contatoSemDdi.id)
      }
    }

    if (contatoExistente) {
      contatoId = contatoExistente.id
      if (!contatoExistente.nome && pushName) {
        await supabaseAdmin
          .from('contatos_whatsapp_manual')
          .update({ nome: pushName, updated_at: new Date().toISOString() })
          .eq('id', contatoId)
      }
    } else {
      const { data: novoContato, error: createErr } = await supabaseAdmin
        .from('contatos_whatsapp_manual')
        .insert({
          nome: pushName ?? null,
          whatsapp: numLimpo,
          ultima_mensagem: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (createErr) throw createErr
      contatoId = novoContato.id
    }

    // ── 2. Baixa e hospeda mídias no Supabase Storage ───────────────────────
    if (ehMidiaComArquivo && evoUrl && evoKey && evoInstance) {
      // Monta o objeto de mensagem que a Evolution API espera
      const messagePayload = { key, message: messageObj }

      const midia = await baixarMidiaEvolution(evoUrl, evoKey, evoInstance, messagePayload)

      if (midia) {
        const { buffer, mimetype, ext } = midia
        const nomeArquivo = `${contatoId}/${Date.now()}_recv.${ext}`

        const { error: uploadErr } = await supabaseAdmin.storage
          .from('whatsapp-manual-midias')
          .upload(nomeArquivo, buffer, {
            contentType: mimetype,
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadErr) {
          console.error('Erro ao fazer upload da mídia:', uploadErr.message)
          // Não lança — salva a mensagem sem URL de mídia
        } else {
          const { data: pubData } = supabaseAdmin.storage
            .from('whatsapp-manual-midias')
            .getPublicUrl(nomeArquivo)

          midiaUrl = pubData.publicUrl
          metadataObj.tamanhoBytes = buffer.byteLength
          if (!metadataObj.mimetype) metadataObj.mimetype = mimetype
          console.log('Mídia salva no Storage:', midiaUrl)
        }
      } else {
        console.warn('Não foi possível baixar a mídia — mensagem salva sem URL de mídia.')
      }
    } else if (ehMidiaComArquivo) {
      console.warn('Variáveis da Evolution API não configuradas — mídia não baixada.')
    }

    // ── 3. Insere a mensagem no banco ───────────────────────────────────────
    const { data: novaMensagem, error: msgErr } = await supabaseAdmin
      .from('mensagens_whatsapp_manual')
      .insert({
        contato_id: contatoId,
        tipo_remetente: 'cliente',
        conteudo: texto,
        tipo_midia: tipoMidia,
        midia_url: midiaUrl,
        metadata: metadataObj,
        lida: false,
      })
      .select()
      .single()

    if (msgErr) throw msgErr

    // ── 4. Atualiza ultima_mensagem no contato ──────────────────────────────
    await supabaseAdmin
      .from('contatos_whatsapp_manual')
      .update({ ultima_mensagem: new Date().toISOString() })
      .eq('id', contatoId)

    return json({ status: 'success', mensagem_id: novaMensagem?.id })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro no webhook'
    console.error('Erro no webhook:', errorMsg)
    return json({ error: errorMsg }, 500)
  }
})
