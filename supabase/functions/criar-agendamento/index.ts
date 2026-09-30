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

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

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
  if (!caller) return json({ error: 'Sessão inválida' }, 401)

  try {
    const body = await req.json()

    // ─── AÇÃO DE EDITAR AGENDAMENTO (atualiza banco + Google Calendar) ───
    if (body.action === 'editar_agendamento') {
      const { agendamento_id, data_hora_inicio, data_hora_fim, duracao_minutos, modalidade, observacoes } = body

      if (!agendamento_id || !data_hora_inicio) {
        return json({ error: 'agendamento_id e data_hora_inicio são obrigatórios' }, 400)
      }

      // 1. Busca o agendamento atual para pegar google_event_id e lead_id
      const { data: agendamentoAtual, error: fetchErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .select('id, google_event_id, google_event_url, lead_id, leads_adv(nome_lead, whatsapp_lead)')
        .eq('id', agendamento_id)
        .maybeSingle()

      if (fetchErr || !agendamentoAtual) {
        return json({ error: 'Agendamento não encontrado' }, 404)
      }

      const startDateISO = new Date(data_hora_inicio).toISOString()
      const endDateISO = data_hora_fim
        ? new Date(data_hora_fim).toISOString()
        : new Date(new Date(data_hora_inicio).getTime() + (duracao_minutos ?? 30) * 60000).toISOString()

      // 2. Atualiza o banco local
      const { error: updateErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .update({
          data_hora_inicio: startDateISO,
          data_hora_fim: endDateISO,
          duracao_minutos: duracao_minutos ?? 30,
          modalidade: modalidade ?? 'presencial',
          observacoes: observacoes ?? null,
        })
        .eq('id', agendamento_id)

      if (updateErr) {
        return json({ error: 'Erro ao atualizar agendamento: ' + updateErr.message }, 500)
      }

      // 2.1 Atualiza data_agendamento na tabela leads_adv para manter sincronizado
      if (agendamentoAtual.lead_id) {
        const { error: updateLeadErr } = await supabaseAdmin
          .from('leads_adv')
          .update({ data_agendamento: startDateISO })
          .eq('id', agendamentoAtual.lead_id)

        if (updateLeadErr) {
          console.warn('Aviso: Agendamento atualizado, mas erro ao atualizar data_agendamento do lead:', updateLeadErr.message)
        }
      }

      // 3. Se tiver evento no Google Calendar, atualiza lá também
      let googleSyncError: string | null = null
      if (agendamentoAtual.google_event_id) {
        try {
          const { data: config } = await supabaseAdmin
            .from('office_config')
            .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_id, google_calendar_enabled')
            .limit(1)
            .maybeSingle()

          if (config?.google_calendar_enabled && config?.google_refresh_token) {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: config.google_client_id,
                client_secret: config.google_client_secret,
                refresh_token: config.google_refresh_token,
                grant_type: 'refresh_token',
              }),
            })

            const tokenData = await tokenRes.json()

            if (tokenRes.ok && tokenData.access_token) {
              const calendarId = encodeURIComponent(config.google_calendar_id || 'primary')
              const googleEventId = agendamentoAtual.google_event_id

              const leadInfo = agendamentoAtual.leads_adv as any
              const leadNome = leadInfo?.nome_lead || 'Cliente'
              const leadWhatsapp = leadInfo?.whatsapp_lead || ''

              const summaryText = modalidade === 'online' ? 'Atendimento online' : 'Atendimento presencial'
              let descriptionText = `Nome: ${leadNome}${leadWhatsapp ? ` | WhatsApp: ${leadWhatsapp}` : ''}`
              if (observacoes) descriptionText += `\nObservações: ${observacoes}`

              const patchPayload: Record<string, unknown> = {
                summary: summaryText,
                description: descriptionText,
                start: { dateTime: startDateISO },
                end: { dateTime: endDateISO },
              }

              const patchRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`,
                {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(patchPayload),
                }
              )

              if (!patchRes.ok) {
                const patchErr = await patchRes.json()
                console.error('Erro ao atualizar evento no Google Calendar:', patchErr)
                googleSyncError = patchErr.error?.message || 'Erro ao sincronizar com Google Calendar.'
              }
            }
          }
        } catch (gErr: any) {
          console.error('Exceção ao atualizar Google Calendar:', gErr)
          googleSyncError = gErr.message || 'Erro inesperado na sincronização.'
        }
      }

      return json({
        success: true,
        google_sync_warning: googleSyncError,
      })
    }

    // ─── AÇÃO DE EXCLUIR AGENDAMENTO (remove do banco + Google Calendar + reseta lead) ───
    if (body.action === 'excluir_agendamento') {
      const { agendamento_id } = body

      if (!agendamento_id) {
        return json({ error: 'agendamento_id é obrigatório' }, 400)
      }

      // 1. Busca o agendamento atual para pegar google_event_id e lead_id
      const { data: agendamentoAtual, error: fetchErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .select('id, google_event_id, lead_id')
        .eq('id', agendamento_id)
        .maybeSingle()

      if (fetchErr || !agendamentoAtual) {
        return json({ error: 'Agendamento não encontrado' }, 404)
      }

      // 2. Se tiver evento no Google Calendar, exclui lá também
      let googleSyncError: string | null = null
      if (agendamentoAtual.google_event_id) {
        try {
          const { data: config } = await supabaseAdmin
            .from('office_config')
            .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_id, google_calendar_enabled')
            .limit(1)
            .maybeSingle()

          if (config?.google_calendar_enabled && config?.google_refresh_token) {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: config.google_client_id,
                client_secret: config.google_client_secret,
                refresh_token: config.google_refresh_token,
                grant_type: 'refresh_token',
              }),
            })

            const tokenData = await tokenRes.json()

            if (tokenRes.ok && tokenData.access_token) {
              const calendarId = encodeURIComponent(config.google_calendar_id || 'primary')
              const googleEventId = agendamentoAtual.google_event_id

              const deleteRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                  },
                }
              )

              if (!deleteRes.ok && deleteRes.status !== 410) {
                const deleteErr = await deleteRes.json().catch(() => ({}))
                console.error('Erro ao excluir evento no Google Calendar:', deleteErr)
                googleSyncError = (deleteErr as any).error?.message || 'Erro ao excluir do Google Calendar.'
              }
            }
          }
        } catch (gErr: any) {
          console.error('Exceção ao excluir do Google Calendar:', gErr)
          googleSyncError = gErr.message || 'Erro inesperado na sincronização.'
        }
      }

      // 3. Exclui o agendamento do banco
      const { error: deleteErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .delete()
        .eq('id', agendamento_id)

      if (deleteErr) {
        return json({ error: 'Erro ao excluir agendamento: ' + deleteErr.message }, 500)
      }

      // 4. Reseta o lead para 'conversando' e limpa campos de agendamento
      if (agendamentoAtual.lead_id) {
        // Só reseta se o lead estava em 'consulta_agendada' ou 'confirmado'
        const { data: leadAtual } = await supabaseAdmin
          .from('leads_adv')
          .select('status')
          .eq('id', agendamentoAtual.lead_id)
          .maybeSingle()

        if (leadAtual && (leadAtual.status === 'consulta_agendada' || leadAtual.status === 'confirmado')) {
          const { error: updateLeadErr } = await supabaseAdmin
            .from('leads_adv')
            .update({
              status: 'conversando',
              data_agendamento: null,
              id_agendamento: null,
              status_atualizado_em: new Date().toISOString(),
            })
            .eq('id', agendamentoAtual.lead_id)

          if (updateLeadErr) {
            console.warn('Aviso: Agendamento excluído, mas erro ao resetar lead:', updateLeadErr.message)
          }
        }
      }

      return json({
        success: true,
        google_sync_warning: googleSyncError,
      })
    }

    // ─── AÇÃO DE CANCELAR AGENDAMENTO (marca cancelado + exclui do Google + reseta lead) ───
    if (body.action === 'cancelar_agendamento') {
      const { agendamento_id } = body

      if (!agendamento_id) {
        return json({ error: 'agendamento_id é obrigatório' }, 400)
      }

      // 1. Busca o agendamento atual
      const { data: agendamentoAtual, error: fetchErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .select('id, google_event_id, lead_id')
        .eq('id', agendamento_id)
        .maybeSingle()

      if (fetchErr || !agendamentoAtual) {
        return json({ error: 'Agendamento não encontrado' }, 404)
      }

      // 2. Atualiza status para cancelado no banco
      const { error: updateErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .update({ status: 'cancelado' })
        .eq('id', agendamento_id)

      if (updateErr) {
        return json({ error: 'Erro ao cancelar agendamento: ' + updateErr.message }, 500)
      }

      // 3. Se tiver evento no Google Calendar, exclui lá
      let googleSyncError: string | null = null
      if (agendamentoAtual.google_event_id) {
        try {
          const { data: config } = await supabaseAdmin
            .from('office_config')
            .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_id, google_calendar_enabled')
            .limit(1)
            .maybeSingle()

          if (config?.google_calendar_enabled && config?.google_refresh_token) {
            const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                client_id: config.google_client_id,
                client_secret: config.google_client_secret,
                refresh_token: config.google_refresh_token,
                grant_type: 'refresh_token',
              }),
            })

            const tokenData = await tokenRes.json()

            if (tokenRes.ok && tokenData.access_token) {
              const calendarId = encodeURIComponent(config.google_calendar_id || 'primary')
              const googleEventId = agendamentoAtual.google_event_id

              const deleteRes = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${googleEventId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                  },
                }
              )

              if (!deleteRes.ok && deleteRes.status !== 410) {
                const deleteErr = await deleteRes.json().catch(() => ({}))
                console.error('Erro ao excluir evento cancelado do Google Calendar:', deleteErr)
                googleSyncError = (deleteErr as any).error?.message || 'Erro ao excluir do Google Calendar.'
              }
            }
          }
        } catch (gErr: any) {
          console.error('Exceção ao excluir do Google Calendar (cancelamento):', gErr)
          googleSyncError = gErr.message || 'Erro inesperado na sincronização.'
        }
      }

      // 4. Reseta o lead para 'conversando' e limpa campos de agendamento
      if (agendamentoAtual.lead_id) {
        const { data: leadAtual } = await supabaseAdmin
          .from('leads_adv')
          .select('status')
          .eq('id', agendamentoAtual.lead_id)
          .maybeSingle()

        if (leadAtual && (leadAtual.status === 'consulta_agendada' || leadAtual.status === 'confirmado')) {
          const { error: updateLeadErr } = await supabaseAdmin
            .from('leads_adv')
            .update({
              status: 'conversando',
              data_agendamento: null,
              id_agendamento: null,
              status_atualizado_em: new Date().toISOString(),
            })
            .eq('id', agendamentoAtual.lead_id)

          if (updateLeadErr) {
            console.warn('Aviso: Agendamento cancelado, mas erro ao resetar lead:', updateLeadErr.message)
          }
        }
      }

      return json({
        success: true,
        google_sync_warning: googleSyncError,
      })
    }
    // ─── AÇÃO DE LISTAR AGENDAS DO USUÁRIO NO GOOGLE ─────────────────

    if (body.action === 'listar_calendarios_google') {
      const { data: config } = await supabaseAdmin
        .from('office_config')
        .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_enabled')
        .limit(1)
        .maybeSingle()

      if (!config?.google_calendar_enabled || !config?.google_refresh_token) {
        return json({ calendars: [] })
      }

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.google_client_id,
          client_secret: config.google_client_secret,
          refresh_token: config.google_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const tokenData = await tokenRes.json()
      if (!tokenRes.ok || !tokenData.access_token) {
        return json({ calendars: [], error: 'Falha ao autenticar no Google Calendar' })
      }

      const cUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList'
      const cRes = await fetch(cUrl, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })

      const cData = await cRes.json()
      if (!cRes.ok || !cData.items) {
        return json({ calendars: [] })
      }

      const calendars = cData.items.map((item: any) => ({
        id: item.id,
        summary: item.summary,
        primary: !!item.primary,
      }))

      return json({ calendars })
    }

    // ─── AÇÃO DE CONSULTAR COMPROMISSOS DO DIA NO GOOGLE CALENDAR ────
    if (body.action === 'checar_horarios_google') {
      const { data: dataData } = body
      if (!dataData) return json({ events: [] })

      const { data: config } = await supabaseAdmin
        .from('office_config')
        .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_id, google_calendar_enabled')
        .limit(1)
        .maybeSingle()

      if (
        !config?.google_calendar_enabled ||
        !config?.google_refresh_token ||
        !config?.google_client_id ||
        !config?.google_client_secret
      ) {
        return json({ events: [] })
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.google_client_id,
            client_secret: config.google_client_secret,
            refresh_token: config.google_refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        const tokenData = await tokenRes.json()
        if (!tokenRes.ok || !tokenData.access_token) {
          return json({ events: [], error: 'Falha ao autenticar no Google Calendar' })
        }

        const calendarId = encodeURIComponent(config.google_calendar_id || 'primary')

        const timeMin = new Date(`${dataData}T00:00:00-03:00`).toISOString()
        const timeMax = new Date(`${dataData}T23:59:59-03:00`).toISOString()

        const gUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true`
        const gRes = await fetch(gUrl, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })

        const gData = await gRes.json()
        if (!gRes.ok || !gData.items) {
          console.error('Erro no retorno do Google Calendar:', gData)
          return json({ events: [] })
        }

        const events = gData.items
          .filter((item: any) => item.status !== 'cancelled' && (item.start?.dateTime || item.start?.date))
          .map((item: any) => ({
            id: item.id,
            summary: item.summary || 'Compromisso Google Agenda',
            start: item.start.dateTime || `${item.start.date}T00:00:00-03:00`,
            end: item.end.dateTime || `${item.end.date}T23:59:59-03:00`,
          }))

        return json({ events })
      } catch (err: any) {
        console.error('Erro ao consultar Google Calendar:', err)
        return json({ events: [] })
      }
    }

    // ─── AÇÃO PRINCIPAL: CRIAR AGENDAMENTO ─────────────────────────
    const {
      lead_id,
      novo_lead,
      advogado_id,
      data_hora,
      duracao_minutos = 30,
      modalidade = 'presencial',
      observacoes,
      forcar_conflito = false,
    } = body

    if (!advogado_id || !data_hora) {
      return json({ error: 'Advogado e Data/Hora são obrigatórios' }, 400)
    }

    const startMs = new Date(data_hora).getTime()
    const duracaoMs = Number(duracao_minutos) * 60 * 1000
    const endMs = startMs + duracaoMs

    const startDateISO = new Date(startMs).toISOString()
    const endDateISO = new Date(endMs).toISOString()

    let finalLeadId: string | null = lead_id || null
    let leadNome = 'Cliente'
    let leadWhatsapp = ''

    if (!finalLeadId && novo_lead && (novo_lead.nome_lead || novo_lead.whatsapp_lead)) {
      const cleanPhone = (novo_lead.whatsapp_lead || '').replace(/\D/g, '')
      leadWhatsapp = novo_lead.whatsapp_lead || cleanPhone

      if (cleanPhone) {
        const { data: leadExistente } = await supabaseAdmin
          .from('leads_adv')
          .select('id, nome_lead, whatsapp_lead')
          .eq('whatsapp_lead', cleanPhone)
          .maybeSingle()

        if (leadExistente) {
          finalLeadId = leadExistente.id
          leadNome = leadExistente.nome_lead || novo_lead.nome_lead || 'Cliente'
          if (leadExistente.whatsapp_lead) leadWhatsapp = leadExistente.whatsapp_lead
        }
      }

      if (!finalLeadId) {
        // Inserimos com status 'novo' para NÃO disparar a trigger sync_lead_agendamento
        // que criaria um segundo insert em agendamentos_adv. O status será atualizado
        // para 'consulta_agendada' somente APÓS o agendamento ser criado.
        const { data: newLead, error: createLeadErr } = await supabaseAdmin
          .from('leads_adv')
          .insert({
            nome_lead: novo_lead.nome_lead || 'Cliente sem Nome',
            whatsapp_lead: cleanPhone || novo_lead.whatsapp_lead || '',
            status: 'novo_contato',
          })
          .select('id, nome_lead, whatsapp_lead')
          .single()

        if (createLeadErr) {
          return json({ error: 'Erro ao cadastrar novo lead: ' + createLeadErr.message }, 400)
        }
        finalLeadId = newLead.id
        leadNome = newLead.nome_lead || 'Cliente'
        if (newLead.whatsapp_lead) leadWhatsapp = newLead.whatsapp_lead
      }
    } else if (finalLeadId) {
      const { data: leadData } = await supabaseAdmin
        .from('leads_adv')
        .select('nome_lead, whatsapp_lead')
        .eq('id', finalLeadId)
        .maybeSingle()
      if (leadData?.nome_lead) leadNome = leadData.nome_lead
      if (leadData?.whatsapp_lead) leadWhatsapp = leadData.whatsapp_lead
    }

    if (!forcar_conflito) {
      const { data: existentes, error: confErr } = await supabaseAdmin
        .from('agendamentos_adv')
        .select('id, data_hora_inicio, data_hora_fim, status, leads_adv(nome_lead)')
        .eq('advogado_id', advogado_id)
        .neq('status', 'cancelado')

      if (confErr) {
        console.error('Erro ao verificar conflitos:', confErr)
      } else if (existentes && existentes.length > 0) {
        for (const item of existentes) {
          const itemStart = new Date(item.data_hora_inicio).getTime()
          const itemEnd = item.data_hora_fim
            ? new Date(item.data_hora_fim).getTime()
            : itemStart + 30 * 60 * 1000

          if (startMs < itemEnd && endMs > itemStart) {
            const leadNomeItem = (item.leads_adv as any)?.nome_lead || 'Outro cliente'
            const horaInicioStr = new Date(itemStart).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const horaFimStr = new Date(itemEnd).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

            return json(
              {
                conflict: true,
                error: `O advogado já possui agendamento das ${horaInicioStr} às ${horaFimStr} (${leadNomeItem}).`,
              },
              409
            )
          }
        }
      }
    }

    let advogadoNome = 'Advogado'
    const { data: advData } = await supabaseAdmin
      .from('advogados')
      .select('nome')
      .eq('id', advogado_id)
      .maybeSingle()
    if (advData?.nome) advogadoNome = advData.nome

    let googleEventId: string | null = null
    let googleEventUrl: string | null = null
    let googleSyncError: string | null = null

    const { data: config } = await supabaseAdmin
      .from('office_config')
      .select('google_client_id, google_client_secret, google_refresh_token, google_calendar_id, google_calendar_enabled')
      .limit(1)
      .maybeSingle()

    if (
      config?.google_calendar_enabled &&
      config?.google_refresh_token &&
      config?.google_client_id &&
      config?.google_client_secret
    ) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.google_client_id,
            client_secret: config.google_client_secret,
            refresh_token: config.google_refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        const tokenData = await tokenRes.json()

        if (!tokenRes.ok || !tokenData.access_token) {
          console.error('Falha ao renovar access_token do Google:', tokenData)
          googleSyncError = 'Falha ao renovar acesso ao Google Calendar.'
        } else {
          const accessToken = tokenData.access_token
          const calendarId = encodeURIComponent(config.google_calendar_id || 'primary')

          // FORMATO SOLICITADO:
          // Título: "Atendimento presencial" ou "Atendimento online"
          // Descrição: "Nome: [Nome] | WhatsApp: [WhatsApp]"
          const summaryText = modalidade === 'online' ? 'Atendimento online' : 'Atendimento presencial'
          let descriptionText = `Nome: ${leadNome}${leadWhatsapp ? ` | WhatsApp: ${leadWhatsapp}` : ''}`
          if (observacoes) {
            descriptionText += `\nObservações: ${observacoes}`
          }

          const eventPayload: Record<string, unknown> = {
            summary: summaryText,
            description: descriptionText,
            start: { dateTime: startDateISO },
            end: { dateTime: endDateISO },
          }

          if (modalidade === 'online') {
            eventPayload.conferenceData = {
              createRequest: {
                requestId: crypto.randomUUID(),
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            }
          }

          const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1`
          const eventRes = await fetch(calendarUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventPayload),
          })

          const eventData = await eventRes.json()

          if (!eventRes.ok) {
            console.error('Erro ao criar evento no Google Calendar:', eventData)
            googleSyncError = eventData.error?.message || 'Erro ao sincronizar com Google Calendar.'
          } else {
            googleEventId = eventData.id || null
            googleEventUrl = eventData.htmlLink || null
          }
        }
      } catch (gErr: any) {
        console.error('Exceção na integração com Google Calendar:', gErr)
        googleSyncError = gErr.message || 'Erro inesperado na sincronização.'
      }
    }

    const { data: novoAgendamento, error: insertErr } = await supabaseAdmin
      .from('agendamentos_adv')
      .insert({
        lead_id: finalLeadId,
        advogado_id,
        data_hora_inicio: startDateISO,
        data_hora_fim: endDateISO,
        duracao_minutos,
        modalidade,
        observacoes: observacoes || null,
        status: 'agendado',
        google_event_id: googleEventId,
        google_event_url: googleEventUrl,
      })
      .select('*')
      .single()

    if (insertErr) {
      console.error('Erro ao inserir agendamento:', insertErr)
      return json({ error: 'Erro ao salvar agendamento no banco: ' + insertErr.message }, 500)
    }

    if (finalLeadId) {
      // Aqui atualizamos o lead com o id_agendamento já preenchido.
      // A trigger sync_lead_agendamento vai encontrar o agendamento existente
      // (via lead_id) e fará UPDATE (não INSERT), evitando duplicação.
      const { error: updateLeadErr } = await supabaseAdmin
        .from('leads_adv')
        .update({
          status: 'consulta_agendada',
          data_agendamento: startDateISO,
          id_agendamento: novoAgendamento.id,
          status_atualizado_em: new Date().toISOString(),
        })
        .eq('id', finalLeadId)

      if (updateLeadErr) {
        console.warn('Aviso: Agendamento salvo, mas erro ao atualizar status do lead:', updateLeadErr.message)
      }
    }

    return json({
      success: true,
      agendamento: novoAgendamento,
      google_event_url: googleEventUrl,
      google_sync_warning: googleSyncError,
    })
  } catch (err: any) {
    console.error('Erro na Edge Function criar-agendamento:', err)
    return json({ error: err.message || 'Erro interno do servidor' }, 500)
  }
})
