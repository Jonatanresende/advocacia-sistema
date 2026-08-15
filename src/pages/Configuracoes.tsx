import { useState, useEffect } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { OfficeConfig, OfficeHours, DiaSemana, PermissaoRole } from '../types'
import { useToast } from '../contexts/ToastContext'
import { Building2, Clock, Shield } from 'lucide-react'
import clsx from 'clsx'

const DIAS_ORDEM: DiaSemana[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

export default function Configuracoes() {
  const { success, error } = useToast()

  const [config, setConfig] = useState<OfficeConfig | null>(null)
  const [hours, setHours] = useState<Partial<Record<DiaSemana, OfficeHours>>>({})
  const [permissions, setPermissions] = useState<PermissaoRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [isSavingHours, setIsSavingHours] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)

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
        updated_at: new Date().toISOString(),
      })

      const hoursMap: Partial<Record<DiaSemana, OfficeHours>> = {}
      ;(hoursRes.data as OfficeHours[]).forEach(h => { hoursMap[h.dia] = h })
      setHours(hoursMap)

      setPermissions((permissionsRes.data as PermissaoRole[]) || [])
    } catch (err) {
      console.error(err)
      error('Erro ao carregar configurações')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

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
        .update({ nome: config.nome, logo_url: config.logo_url, favicon_url: config.favicon_url, updated_at: new Date().toISOString() })
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
      </div>
    </div>
  )
}

