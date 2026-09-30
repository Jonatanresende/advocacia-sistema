import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  const state = url.searchParams.get('state')

  // Redireciona de volta para a origin enviada no state (ex: http://localhost:5173), ou env ou fallback
  const redirectOrigin = state || Deno.env.get('FRONTEND_URL') || 'http://localhost:5173'

  if (error || !code) {
    console.error('Erro no OAuth Callback:', error)
    return Response.redirect(`${redirectOrigin}/configuracoes?google=erro&msg=${encodeURIComponent(error || 'Codigo ausente')}`, 302)
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. Busca client_id e client_secret do banco
  const { data: config, error: configErr } = await supabaseAdmin
    .from('office_config')
    .select('google_client_id, google_client_secret')
    .limit(1)
    .single()

  if (configErr || !config?.google_client_id || !config?.google_client_secret) {
    return Response.redirect(`${redirectOrigin}/configuracoes?google=erro&msg=${encodeURIComponent('Credenciais nao encontradas na office_config')}`, 302)
  }

  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/google-calendar-callback`

  // 2. Troca code por refresh_token
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google_client_id,
        client_secret: config.google_client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('Erro ao trocar código por token:', tokenData)
      const msg = tokenData.error_description || tokenData.error || 'Falha ao obter refresh_token'
      return Response.redirect(`${redirectOrigin}/configuracoes?google=erro&msg=${encodeURIComponent(msg)}`, 302)
    }

    // 3. Atualiza office_config com o refresh_token
    const { error: updateErr } = await supabaseAdmin
      .from('office_config')
      .update({
        google_refresh_token: tokenData.refresh_token,
        google_calendar_enabled: true,
      })
      .eq('id', (await supabaseAdmin.from('office_config').select('id').single()).data?.id)

    if (updateErr) {
      console.error('Erro ao salvar refresh_token no banco:', updateErr)
      return Response.redirect(`${redirectOrigin}/configuracoes?google=erro&msg=${encodeURIComponent('Erro ao salvar no banco')}`, 302)
    }

    return Response.redirect(`${redirectOrigin}/configuracoes?google=conectado`, 302)
  } catch (err: any) {
    console.error('Exceção no callback Google Calendar:', err)
    return Response.redirect(`${redirectOrigin}/configuracoes?google=erro&msg=${encodeURIComponent(err.message || 'Erro interno')}`, 302)
  }
})
