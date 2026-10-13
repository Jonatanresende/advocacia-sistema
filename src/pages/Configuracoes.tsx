import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { OfficeConfig, OfficeHours, DiaSemana, PermissaoRole } from '../types'
import { useToast } from '../contexts/ToastContext'
import { Building2, Clock, Shield, Bot, Calendar, CheckCircle2, AlertCircle, ExternalLink, Volume2 } from 'lucide-react'
import clsx from 'clsx'

const DIAS_ORDEM: DiaSemana[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

export default function Configuracoes() {
  const { success, error } = useToast()

  const [config, setConfig] = useState<OfficeConfig | null>(null)
  const [hours, setHours] = useState<Partial<Record<DiaSemana, OfficeHours>>>({})
  const [permissions, setPermissions] = useState<PermissaoRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [isSavingGoogle, setIsSavingGoogle] = useState(false)
  const [isSavingHours, setIsSavingHours] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false)
  const [googleCalendars, setGoogleCalendars] = useState<Array<{ id: string; summary: string; primary: boolean }>>([])

  const fetchGoogleCalendars = async () => {
    setIsLoadingCalendars(true)
    try {
      const { data: resData, error: err } = await supabase.functions.invoke('criar-agendamento', {
        body: { action: 'listar_calendarios_google' },
      })
      if (!err && resData?.calendars && resData.calendars.length > 0) {
        setGoogleCalendars(resData.calendars)
        success(`${resData.calendars.length} agenda(s) encontrada(s) na sua conta Google!`)
      } else if (resData?.error) {
        error(resData.error)
      }
    } catch (err) {
      console.error(err)
      error('Erro ao buscar agendas do Google')
    } finally {
      setIsLoadingCalendars(false)
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [configRes, hoursRes, permissionsRes] = await Promise.all([
        supabase.from('office_config').select('*').eq('id', 1).maybeSingle(),
        supabase.from('office_hours').select('*'),
        supabase.from('permissoes_role').select('*')
      ])

      if (configRes.error) throw configRes.error
      if (hoursRes.error) throw hoursRes.error
      if (permissionsRes.error) throw permissionsRes.error

      setConfig((configRes.data as OfficeConfig | null) ?? {
        id: 1,
        nome: '',
        logo_url: null,
        favicon_url: null,
        ia_pausada_global: false,
        pausar_horario_comercial_ativo: false,
        google_client_id: '',
        google_client_secret: '',
        google_calendar_id: 'primary',
        google_calendar_enabled: false,
        updated_at: new Date().toISOString(),
      })

      const hoursMap: Partial<Record<DiaSemana, OfficeHours>> = {}
        ; (hoursRes.data as OfficeHours[]).forEach(h => { hoursMap[h.dia] = h })
      setHours(hoursMap)

      setPermissions((permissionsRes.data as PermissaoRole[]) || [])
    } catch (err) {
      console.error(err)
      error('Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Verifica parâmetros de retorno do OAuth do Google
    const params = new URLSearchParams(window.location.search)
    const googleStatus = params.get('google')
    const msg = params.get('msg')

    if (googleStatus === 'conectado') {
      success('Google Calendar conectado com sucesso!')
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (googleStatus === 'erro') {
      error(`Erro ao conectar ao Google Calendar: ${msg || 'Autorização falhou'}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (config?.google_refresh_token) {
      fetchGoogleCalendars()
    }
  }, [config?.google_refresh_token])

  const handleConnectGoogle = async () => {
    if (!config?.google_client_id) {
      error('Preencha o Client ID antes de conectar.')
      return
    }

    // Primeiro salva as credenciais no banco
    await saveGoogleConfig(false)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ljmmtacgbmpbbolobrnx.supabase.co'
    const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-callback`
    const scope = 'https://www.googleapis.com/auth/calendar'
    const currentOrigin = window.location.origin

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(config.google_client_id)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=${encodeURIComponent('consent select_account')}` +
      `&state=${encodeURIComponent(currentOrigin)}`

    window.location.href = authUrl
  }

  const handleDisconnectGoogle = async () => {
    if (!config) return
    try {
      const { error: err } = await supabase
        .from('office_config')
        .update({
          google_refresh_token: null,
          google_calendar_enabled: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)

      if (err) throw err

      setConfig(prev => prev ? { ...prev, google_refresh_token: null, google_calendar_enabled: false } : null)
      setGoogleCalendars([])
      success('Google Calendar desconectado')
    } catch (err) {
      console.error(err)
      error('Erro ao desconectar Google Calendar')
    }
  }

  const saveGoogleConfig = async (showNotification = true) => {
    if (!config) return
    setIsSavingGoogle(true)
    try {
      const { error: err } = await supabase
        .from('office_config')
        .update({
          google_client_id: config.google_client_id || null,
          google_client_secret: config.google_client_secret || null,
          google_calendar_id: config.google_calendar_id || 'primary',
          google_calendar_enabled: config.google_calendar_enabled ?? false,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)

      if (err) throw err
      if (showNotification) success('Configurações do Google Calendar salvas')
    } catch (err) {
      console.error(err)
      if (showNotification) error('Erro ao salvar configurações do Google Calendar')
    } finally {
      setIsSavingGoogle(false)
    }
  }

  const handleHourChange = (dia: DiaSemana, field: keyof OfficeHours, value: string | boolean) => {
    setHours(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [field]: value }
    }))
  }

  const handlePermissionChange = (id: number, checked: boolean) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, ativo: checked } : p))
  }

  const saveConfig = async () => {
    if (!config) return
    setIsSavingConfig(true)
    try {
      const { error: err } = await supabase
        .from('office_config')
        .update({
          nome: config.nome,
          logo_url: config.logo_url,
          favicon_url: config.favicon_url,
          ia_pausada_global: config.ia_pausada_global,
          pausar_horario_comercial_ativo: config.pausar_horario_comercial_ativo,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
      if (err) throw err
      success('Informações do escritório salvas')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar informações')
    } finally {
      setIsSavingConfig(false)
    }
  }

  const saveHours = async () => {
    setIsSavingHours(true)
    try {
      const updates = Object.values(hours).filter(Boolean).map(h => ({
        id: h!.id,
        dia: h!.dia,
        aberto: h!.aberto,
        hora_inicio: h!.hora_inicio || null,
        hora_fim: h!.hora_fim || null
      }))
      const { error: err } = await supabase.from('office_hours').upsert(updates)
      if (err) throw err
      success('Horários salvos com sucesso')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar horários')
    } finally {
      setIsSavingHours(false)
    }
  }

  const savePermissions = async () => {
    setIsSavingPermissions(true)
    try {
      const updates = permissions.map(p => ({
        id: p.id,
        role: p.role,
        rota: p.rota,
        label: p.label,
        ativo: p.ativo
      }))
      const { error: err } = await supabase.from('permissoes_role').upsert(updates)
      if (err) throw err
      success('Permissões de acesso salvas com sucesso!')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar permissões')
    } finally {
      setIsSavingPermissions(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>
  }

  // Agrupar permissões por rota para exibição mais limpa
  const rotasUnicas = Array.from(new Set(permissions.map(p => p.rota)))
  const getPermissionObject = (rota: string, role: 'advogado' | 'funcionario') => {
    return permissions.find(p => p.rota === rota && p.role === role)
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Configurações"
        description="Personalize as informações do seu escritório — nome, logo, favicon e horário de funcionamento. O horário configurado aqui reflete automaticamente nos relatórios do dashboard."
      />

      <div className="flex flex-col gap-6">
        {/* Seção 1 */}
        <Card className="flex flex-col gap-6 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5 border-b border-[var(--border-card)] pb-4">
            <Building2 size={18} className="text-[var(--primary)]" />
            Informações do Escritório
          </h3>

          {config && (
            <div className="flex flex-col gap-5 max-w-lg">
              <Input
                label="Nome do Escritório"
                value={config.nome || ''}
                onChange={(e) => setConfig({ ...config, nome: e.target.value })}
              />
              <Input
                label="URL do Logo"
                placeholder="https://..."
                value={config.logo_url || ''}
                onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
              />
              <Input
                label="URL do Favicon"
                placeholder="https://..."
                value={config.favicon_url || ''}
                onChange={(e) => setConfig({ ...config, favicon_url: e.target.value })}
              />
              <div className="pt-2">
                <Button onClick={saveConfig} isLoading={isSavingConfig}>Salvar Informações</Button>
              </div>
            </div>
          )}
        </Card>
        {/* Seção - Atendimento com IA */}
        <Card className="flex flex-col gap-6 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5 border-b border-[var(--border-card)] pb-4">
            <Bot size={18} className="text-[var(--primary)]" />
            Atendimento com IA
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
            Controle quando a secretária IA responde automaticamente no WhatsApp. Essas opções afetam todos os leads em tempo real.
          </p>

          {config && (
            <div className="flex flex-col gap-4 max-w-lg">
              {/* Toggle 1 - Pausa global */}
              <div className="flex items-center justify-between bg-[var(--bg-base)]/50 p-4 rounded-[12px] border border-[var(--border-card)]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[13px] text-[var(--text-main)]">Pausar IA para todos os leads</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Desliga a IA completamente, independente do horário ou do lead</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.ia_pausada_global}
                    onChange={(e) => setConfig({ ...config, ia_pausada_global: e.target.checked })}
                  />
                  <div className={clsx(
                    "w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-card)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white",
                    config.ia_pausada_global ? "bg-[var(--primary)]" : "bg-[var(--border-card)]"
                  )}></div>
                </label>
              </div>

              {/* Toggle 2 - Regra de horário comercial */}
              <div className="flex items-center justify-between bg-[var(--bg-base)]/50 p-4 rounded-[12px] border border-[var(--border-card)]">
                <div className="flex flex-col">
                  <span className="font-semibold text-[13px] text-[var(--text-main)]">Pausar IA em horário comercial</span>
                  <span className="text-[11px] text-[var(--text-muted)]">Usa os dias e horários definidos na seção "Horário de Funcionamento" abaixo</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={config.pausar_horario_comercial_ativo}
                    onChange={(e) => setConfig({ ...config, pausar_horario_comercial_ativo: e.target.checked })}
                  />
                  <div className={clsx(
                    "w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-card)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white",
                    config.pausar_horario_comercial_ativo ? "bg-[var(--primary)]" : "bg-[var(--border-card)]"
                  )}></div>
                </label>
              </div>

              <div className="pt-2">
                <Button onClick={saveConfig} isLoading={isSavingConfig}>Salvar Configurações</Button>
              </div>
            </div>
          )}
        </Card>

        {/* Seção - Google Calendar (OAuth2) */}
        <Card className="flex flex-col gap-6 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-4">
            <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5">
              <Calendar size={18} className="text-[var(--primary)]" />
              Integração Google Calendar
            </h3>
            {config?.google_calendar_enabled && config?.google_refresh_token ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={14} /> Conectado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertCircle size={14} /> Desconectado
              </span>
            )}
          </div>

          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
            Conecte a conta Google do escritório (OAuth 2.0) para que os agendamentos feitos no CRM sejam sincronizados automaticamente com o Google Agenda.
          </p>

          {config && (
            <div className="flex flex-col gap-5 max-w-lg">
              <Input
                label="Client ID (Google OAuth)"
                placeholder="Ex: 123456789-abc...apps.googleusercontent.com"
                value={config.google_client_id || ''}
                onChange={(e) => setConfig({ ...config, google_client_id: e.target.value })}
              />
              <Input
                label="Client Secret (Google OAuth)"
                type="password"
                placeholder="Ex: GOCSPX-..."
                value={config.google_client_secret || ''}
                onChange={(e) => setConfig({ ...config, google_client_secret: e.target.value })}
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[13px] font-medium text-[var(--text-main)]">
                  <span>ID da Agenda (Calendário)</span>
                  {config.google_refresh_token && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        fetchGoogleCalendars()
                      }}
                      disabled={isLoadingCalendars}
                      className="text-[11px] text-[var(--primary)] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {isLoadingCalendars ? 'Buscando agendas...' : '🔄 Carregar minhas agendas do Google'}
                    </button>
                  )}
                </div>

                {googleCalendars.length > 0 && (
                  <div className="flex flex-col gap-1 bg-[var(--bg-base)]/60 p-2.5 rounded-[10px] border border-[var(--border-card)] mb-1">
                    <span className="text-[11px] font-semibold text-[var(--text-main)]">
                      Agendas encontradas na sua conta Google ({googleCalendars.length}):
                    </span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) setConfig({ ...config, google_calendar_id: e.target.value })
                      }}
                      value={config.google_calendar_id || 'primary'}
                      className="w-full p-2 text-[12px] rounded-[8px] border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] cursor-pointer"
                    >
                      <option value="primary">Agenda Principal (primary)</option>
                      {googleCalendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary} — {cal.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <Input
                  placeholder="primary ou e-mail da agenda ou ID compartilhado"
                  value={config.google_calendar_id || 'primary'}
                  onChange={(e) => setConfig({ ...config, google_calendar_id: e.target.value })}
                />
                <span className="text-[11px] text-[var(--text-muted)]">
                  Use "primary" para a agenda padrão da conta conectada ou selecione a agenda específica do seu escritório na lista.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button onClick={() => saveGoogleConfig(true)} isLoading={isSavingGoogle} variant="secondary">
                  Salvar Credenciais
                </Button>

                {config.google_refresh_token ? (
                  <Button onClick={handleDisconnectGoogle} variant="danger">
                    Desconectar Google Calendar
                  </Button>
                ) : (
                  <Button onClick={handleConnectGoogle} className="gap-2">
                    <ExternalLink size={16} /> Conectar com Google
                  </Button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Seção 2 - Permissões de Acesso */}
        <Card className="flex flex-col gap-6 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5 border-b border-[var(--border-card)] pb-4">
            <Shield size={18} className="text-[var(--primary)]" />
            Permissões de Acesso
          </h3>
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
            Configure quais páginas cada papel (Advogado e Funcionário) possui acesso padrão ao logar no CRM.
            Apenas administradores podem gerenciar essas permissões.
          </p>

          <div className="flex flex-col gap-3">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              <div className="col-span-6">Página / Rota</div>
              <div className="col-span-3 text-center">Advogado</div>
              <div className="col-span-3 text-center">Funcionário</div>
            </div>

            {rotasUnicas.map(rota => {
              const permAdv = getPermissionObject(rota, 'advogado')
              const permFunc = getPermissionObject(rota, 'funcionario')
              const label = permAdv?.label || permFunc?.label || rota

              return (
                <div key={rota} className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center bg-[var(--bg-base)]/50 p-4 rounded-[12px] border border-[var(--border-card)] hover:bg-[var(--bg-base)] transition-colors">
                  <div className="col-span-6 w-full flex flex-col">
                    <span className="font-semibold text-[13px] text-[var(--text-main)]">{label}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">{rota}</span>
                  </div>

                  {/* Toggle Advogado */}
                  <div className="col-span-3 w-full flex items-center justify-center">
                    {permAdv && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={permAdv.ativo}
                          onChange={(e) => handlePermissionChange(permAdv.id, e.target.checked)}
                        />
                        <div className={clsx(
                          "w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-card)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white",
                          permAdv.ativo ? "bg-[var(--primary)]" : "bg-[var(--border-card)]"
                        )}></div>
                      </label>
                    )}
                  </div>

                  {/* Toggle Funcionário */}
                  <div className="col-span-3 w-full flex items-center justify-center">
                    {permFunc && (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={permFunc.ativo}
                          onChange={(e) => handlePermissionChange(permFunc.id, e.target.checked)}
                        />
                        <div className={clsx(
                          "w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-card)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white",
                          permFunc.ativo ? "bg-[var(--primary)]" : "bg-[var(--border-card)]"
                        )}></div>
                      </label>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="pt-4 flex justify-end">
              <Button onClick={savePermissions} isLoading={isSavingPermissions}>Salvar Permissões</Button>
            </div>
          </div>
        </Card>

        {/* Seção 3 */}
        <Card className="flex flex-col gap-6 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5 border-b border-[var(--border-card)] pb-4">
            <Clock size={18} className="text-[var(--primary)]" />
            Horário de Funcionamento
          </h3>

          <div className="flex flex-col gap-3">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              <div className="col-span-3">Dia da Semana</div>
              <div className="col-span-3">Status</div>
              <div className="col-span-3">Abertura</div>
              <div className="col-span-3">Fechamento</div>
            </div>

            {DIAS_ORDEM.map(dia => {
              const row = hours[dia]
              if (!row) return null
              return (
                <div key={dia} className="flex flex-col sm:grid sm:grid-cols-12 gap-4 items-center bg-[var(--bg-base)]/50 p-4 rounded-[12px] border border-[var(--border-card)] hover:bg-[var(--bg-base)] transition-colors">
                  <div className="col-span-3 w-full capitalize font-semibold text-[13px] text-[var(--text-main)]">{dia}</div>
                  <div className="col-span-3 w-full flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={row.aberto}
                        onChange={(e) => handleHourChange(dia, 'aberto', e.target.checked)}
                      />
                      <div className={clsx(
                        "w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-card)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white",
                        row.aberto ? "bg-[var(--primary)]" : "bg-[var(--border-card)]"
                      )}></div>
                      <span className="ml-3 text-[13px] font-medium text-[var(--text-main)]">
                        {row.aberto ? 'Aberto' : 'Fechado'}
                      </span>
                    </label>
                  </div>
                  <div className="col-span-3 w-full">
                    {row.aberto && (
                      <Input type="time" value={row.hora_inicio || ''} onChange={(e) => handleHourChange(dia, 'hora_inicio', e.target.value)} />
                    )}
                  </div>
                  <div className="col-span-3 w-full">
                    {row.aberto && (
                      <Input type="time" value={row.hora_fim || ''} onChange={(e) => handleHourChange(dia, 'hora_fim', e.target.value)} />
                    )}
                  </div>
                </div>
              )
            })}

            <div className="pt-4 flex justify-end">
              <Button onClick={saveHours} isLoading={isSavingHours}>Salvar Horários</Button>
            </div>
          </div>
        </Card>

        {/* Notificações Sonoras (Aviso aos Administradores) */}
        <Card className="flex flex-col gap-4 shadow-none !border-[var(--border-card)] rounded-[14px] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-card)] pb-4">
            <div>
              <h3 className="font-semibold text-[16px] text-[var(--text-main)] font-display flex items-center gap-2.5">
                <Volume2 size={18} className="text-[var(--primary)]" />
                Sons de Notificação (Chat, Atendimento Manual e Mensagens)
              </h3>
              <p className="text-[12px] text-[var(--text-muted)] mt-1">
                Controle individual dos alertas sonoros para cada membro do escritório.
              </p>
            </div>
            <Link
              to="/meu-perfil"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white transition-all text-[12.5px] font-semibold self-start sm:self-auto"
            >
              Configurar em Meu Perfil
              <ExternalLink size={13} />
            </Link>
          </div>
          <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
            As notificações sonoras são <strong>individuais por usuário</strong> e ficam disponíveis em <strong>Meu Perfil</strong>. Dessa forma, todos os usuários (administradores, advogados e funcionários) podem ativar ou pausar o som de notificação de cada uma das 3 páginas de mensagens independentemente, sem misturar preferências.
          </p>
        </Card>
      </div>
    </div>
  )
}

