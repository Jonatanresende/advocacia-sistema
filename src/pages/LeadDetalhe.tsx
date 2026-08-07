import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Badge, { statusConfig, areaPrevidenciariaLabels } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { LeadAdv, LeadStatus, DocumentoLead, Perfil } from '../types'
import { ArrowLeft, Clock, MessageSquare, Edit3, Calendar, ShieldCheck, FileText, Image as ImageIcon, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'

export default function LeadDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const { isAdmin, isFuncionario } = useAuth()

  const [lead, setLead] = useState<LeadAdv | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [anotacoes, setAnotacoes] = useState('')
  const [documentos, setDocumentos] = useState<DocumentoLead[]>([])
  const [usuarios, setUsuarios] = useState<Perfil[]>([])

  const fetchLead = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const { data, error: err } = await supabase.from('leads_adv').select('*').eq('id', id).single()
      if (err) throw err
      setLead(data as LeadAdv)
      setAnotacoes(data.anotacoes || '')
    } catch (err) {
      console.error(err)
      error('Erro ao buscar detalhes do lead')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDocumentos = async () => {
    if (!id) return
    try {
      const { data, error: err } = await supabase
        .from('documentos_lead')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
      if (err) throw err
      setDocumentos(data || [])
    } catch (err) {
      console.error('Erro ao buscar documentos:', err)
    }
  }

  const fetchUsuarios = async () => {
    try {
      const { data, error: err } = await supabase
        .from('perfis')
        .select('id, nome, role')
        .eq('ativo', true)
      if (err) throw err
      setUsuarios(data as Perfil[])
    } catch (err) {
      console.error('Erro ao buscar perfis:', err)
    }
  }

  useEffect(() => { 
    fetchLead()
    fetchDocumentos()
    fetchUsuarios()
  }, [id])

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return
    try {
      const { error: err } = await supabase.from('leads_adv').update({ status: newStatus }).eq('id', lead.id)
      if (err) throw err
      setLead({ ...lead, status: newStatus })
      success('Status atualizado com sucesso')
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar status')
    }
  }

  const handleOwnerChange = async (newOwnerId: string) => {
    if (!lead) return
    try {
      const val = newOwnerId === '' ? null : newOwnerId
      const { error: err } = await supabase
        .from('leads_adv')
        .update({ owner_id: val })
        .eq('id', lead.id)
      if (err) throw err
      setLead({ ...lead, owner_id: val })
      success('Responsável pelo lead atualizado')
    } catch (err) {
      console.error(err)
      error('Erro ao atualizar responsável')
    }
  }

  const handleSaveAnotacoes = async () => {
    if (!lead) return
    setIsSaving(true)
    try {
      const { error: err } = await supabase.from('leads_adv').update({ anotacoes }).eq('id', lead.id)
      if (err) throw err
      setLead({ ...lead, anotacoes })
      success('Anotações salvas com sucesso')
    } catch (err) {
      console.error(err)
      error('Erro ao salvar anotações')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div></div>
  }

  if (!lead) {
    return <div className="text-center p-12 text-[var(--text-muted)]">Lead não encontrado</div>
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <h1 className="text-2xl font-bold font-display text-[var(--text-main)] m-0">
            {lead.nome_lead || lead.whatsapp_lead}
          </h1>
          <select
            value={lead.status}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className="text-sm font-medium rounded-full px-3 py-1 border cursor-pointer bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            style={{
              backgroundColor: statusConfig[lead.status]?.bg,
              color: statusConfig[lead.status]?.text,
              borderColor: statusConfig[lead.status]?.border,
            }}
          >
            {Object.entries(statusConfig)
              .filter(([k]) => !['agendado', 'confirmado', 'faltou', 'cancelado'].includes(k))
              .map(([key, cfg]) => (
                <option key={key} value={key} style={{ background: '#fff', color: '#000' }}>
                  {cfg.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <MessageSquare size={18} className="text-[var(--accent)]" />
              Resumo do Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">WhatsApp</p>
                <p className="font-medium text-[var(--text-main)]">{lead.whatsapp_lead}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Motivo do Contato</p>
                <p className="font-medium text-[var(--text-main)]">{lead.motivo_contato || 'Não informado'}</p>
              </div>
              <div className="sm:col-span-2 border-t border-[var(--border-card)] pt-3 mt-1 flex flex-col gap-1">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Responsável pelo Lead</p>
                {isAdmin || isFuncionario ? (
                  <select
                    value={lead.owner_id || ''}
                    onChange={(e) => handleOwnerChange(e.target.value)}
                    className="w-full sm:max-w-xs text-[13px] font-semibold rounded-[8px] px-3 py-2 border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
                  >
                    <option value="">Sem responsável (Fila Geral)</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nome} ({u.role === 'admin' ? 'Admin' : u.role === 'advogado' ? 'Advogado' : 'Funcionário'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="font-semibold text-[13px] text-[var(--text-main)]">
                    {usuarios.find((u) => u.id === lead.owner_id)?.nome || 'Sem responsável'}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Resumo da Conversa (Agente IA)</p>
                <div className="bg-[var(--bg-base)] p-3 rounded-[8px] text-sm text-[var(--text-main)] whitespace-pre-wrap mt-1">
                  {lead.resumo_conversa || 'Nenhum resumo disponível.'}
                </div>
              </div>
            </div>
          </Card>

          {lead.area_previdenciaria && lead.area_previdenciaria !== 'nao_identificada' && (
            <Card className="flex flex-col gap-4">
              <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
                <ShieldCheck size={18} className="text-[var(--accent)]" />
                Qualificação Previdenciária
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Área Identificada</p>
                  <p className="font-medium text-[var(--text-main)]">{areaPrevidenciariaLabels[lead.area_previdenciaria]}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Veredito da Triagem</p>
                  <Badge status={lead.status_qualificacao} />
                </div>
                {lead.respostas_qualificacao?.texto && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Respostas Coletadas pela IA</p>
                    <div className="bg-[var(--bg-base)] p-3 rounded-[8px] text-sm text-[var(--text-main)] whitespace-pre-wrap mt-1">
                      {lead.respostas_qualificacao.texto}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] italic">
                Triagem feita por IA — a confirmação final do direito ao benefício é sempre do advogado.
              </p>
            </Card>
          )}

          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <Clock size={18} className="text-[var(--accent)]" />
              Linha do Tempo
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                <span className="text-[var(--text-muted)]">Início do Atendimento</span>
                <span className="font-medium">{lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                <span className="text-[var(--text-muted)]">Última Mensagem</span>
                <span className="font-medium">{lead.ultima_mensagem ? format(new Date(lead.ultima_mensagem), 'dd/MM/yyyy HH:mm') : '-'}</span>
              </div>
              {lead.data_agendamento && (
                <div className="flex justify-between items-center py-2 border-b border-[var(--border-card)] border-dashed">
                  <span className="text-[var(--text-muted)] flex items-center gap-1"><Calendar size={14} /> Data do Agendamento</span>
                  <span className="font-medium">{format(new Date(lead.data_agendamento), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
              {lead.follow_up_1 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)] text-xs">Follow Up 1 realizado em</span>
                  <span className="font-medium text-xs text-[var(--success)]">{format(new Date(lead.follow_up_1), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
              {lead.follow_up_2 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--text-muted)] text-xs">Follow Up 2 realizado em</span>
                  <span className="font-medium text-xs text-[var(--success)]">{format(new Date(lead.follow_up_2), 'dd/MM/yyyy HH:mm')}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <FileText size={18} className="text-[var(--accent)]" />
              Documentos Anexados
            </h3>
            <div className="flex flex-col gap-3">
              {documentos.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhum documento recebido.</p>
              ) : (
                documentos.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-3 p-3 rounded-[8px] bg-[var(--bg-base)] border border-[var(--border-card)]">
                    <div className="mt-1 text-[var(--accent)]">
                      {doc.tipo?.toLowerCase().includes('imagem') ? <ImageIcon size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--text-main)] font-medium mb-1">
                        {doc.tipo
                          ? doc.tipo
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase())
                          : doc.url?.toLowerCase().includes('imagem') || doc.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                            ? 'Imagem'
                            : 'Documento'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {format(new Date(doc.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-[var(--bg-card)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                      title="Abrir arquivo"
                    >
                      <Download size={18} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col gap-4">
            <h3 className="font-semibold text-lg font-display flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
              <Edit3 size={18} className="text-[var(--accent)]" />
              Anotações Internas
            </h3>
            <div className="flex-1 flex flex-col min-h-[300px]">
              <textarea
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
                placeholder="Adicione notas visíveis apenas para a equipe do escritório..."
                className="flex-1 w-full bg-[var(--bg-base)] border border-[var(--border-card)] rounded-[8px] p-3 text-sm text-[var(--text-main)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] mb-4"
              />
              <Button onClick={handleSaveAnotacoes} isLoading={isSaving} className="w-full">
                Salvar Anotações
              </Button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}
