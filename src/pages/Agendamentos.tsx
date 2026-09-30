import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import NovoAgendamentoModal from '../components/agendamentos/NovoAgendamentoModal'
import { useAgendamentos } from '../hooks/useAgendamentos'
import { useToast } from '../contexts/ToastContext'
import type { AgendamentoAdv, AgendamentoStatus } from '../types'
import { format } from 'date-fns'
import {
  CalendarDays, Inbox, Video, MapPin, Plus, ExternalLink,
  Pencil, Trash2, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'

import { useEffect } from 'react'

interface EditarAgendamentoModalProps {
  isOpen: boolean
  agendamento: AgendamentoAdv | null
  onClose: () => void
  onSave: (id: string, fields: Record<string, unknown>) => Promise<boolean>
}

function EditarAgendamentoModal({ isOpen, agendamento, onClose, onSave }: EditarAgendamentoModalProps) {
  const [isSaving, setIsSaving] = useState(false)

  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(30)
  const [modalidade, setModalidade] = useState<'presencial' | 'online'>('presencial')
  const [observacoes, setObservacoes] = useState('')

  // Inicializa os campos toda vez que o modal abre com um agendamento
  useEffect(() => {
    if (!isOpen || !agendamento) return
    const d = new Date(agendamento.data_hora_inicio)
    const pad = (n: number) => String(n).padStart(2, '0')
    setData(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`)
    setHora(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    setDuracaoMinutos(agendamento.duracao_minutos ?? 30)
    setModalidade((agendamento.modalidade ?? 'presencial') as 'presencial' | 'online')
    setObservacoes(agendamento.observacoes ?? '')
  }, [isOpen, agendamento])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agendamento) return
    setIsSaving(true)
    const startIso = new Date(`${data}T${hora}:00`).toISOString()
    const endIso = new Date(new Date(`${data}T${hora}:00`).getTime() + duracaoMinutos * 60000).toISOString()
    const ok = await onSave(agendamento.id, {
      data_hora_inicio: startIso,
      data_hora_fim: endIso,
      duracao_minutos: duracaoMinutos,
      modalidade,
      observacoes: observacoes || null,
    })
    setIsSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Agendamento">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data *" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          <Input label="Hora *" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
        </div>

        {/* Duração */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-main)]">Duração</label>
          <select
            value={duracaoMinutos}
            onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
            className="w-full p-2.5 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)]"
          >
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>1 hora</option>
            <option value={90}>1h 30min</option>
            <option value={120}>2 horas</option>
          </select>
        </div>

        {/* Modalidade */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-main)]">Modalidade</label>
          <div className="flex items-center gap-2 h-10">
            <button
              type="button"
              onClick={() => setModalidade('presencial')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 h-full rounded-[10px] text-[12px] font-semibold border transition-all',
                modalidade === 'presencial'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                  : 'border-[var(--border-card)] text-[var(--text-muted)] hover:bg-[var(--bg-base)]'
              )}
            >
              <MapPin size={14} /> Presencial
            </button>
            <button
              type="button"
              onClick={() => setModalidade('online')}
              className={clsx(
                'flex-1 flex items-center justify-center gap-1.5 h-full rounded-[10px] text-[12px] font-semibold border transition-all',
                modalidade === 'online'
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]'
                  : 'border-[var(--border-card)] text-[var(--text-muted)] hover:bg-[var(--bg-base)]'
              )}
            >
              <Video size={14} /> Online
            </button>
          </div>
        </div>

        {/* Observações */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[var(--text-main)]">Observações</label>
          <textarea
            rows={2}
            placeholder="Detalhes adicionais..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full p-2.5 text-[13px] rounded-[10px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-main)] focus:outline-none focus:border-[var(--primary)] resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-card)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" isLoading={isSaving}>Salvar Alterações</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Agendamentos() {
  const navigate = useNavigate()
  const { agendamentos, isLoading, updateStatus, updateAgendamento, deleteAgendamento, refetch } = useAgendamentos()
  const { success } = useToast()

  // Modal promover a cliente
  const [isConfirmCompareceuOpen, setIsConfirmCompareceuOpen] = useState(false)
  const [selectedStatusChange, setSelectedStatusChange] = useState<{ id: string; status: AgendamentoStatus } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Modal editar
  const [editTarget, setEditTarget] = useState<AgendamentoAdv | null>(null)

  // Modal excluir
  const [deleteTarget, setDeleteTarget] = useState<AgendamentoAdv | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modal novo agendamento
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false)

  const handleStatusChange = (id: string, newStatus: AgendamentoStatus) => {
    if (newStatus === 'compareceu') {
      setSelectedStatusChange({ id, status: newStatus })
      setIsConfirmCompareceuOpen(true)
    } else {
      updateStatus(id, newStatus)
    }
  }

  const confirmStatusUpdate = async () => {
    if (!selectedStatusChange) return
    setIsUpdating(true)
    await updateStatus(selectedStatusChange.id, selectedStatusChange.status)
    setIsUpdating(false)
    setIsConfirmCompareceuOpen(false)
    setSelectedStatusChange(null)
  }

  const handleEditSave = async (id: string, fields: Record<string, unknown>) => {
    const ok = await updateAgendamento(id, fields as Parameters<typeof updateAgendamento>[1])
    if (ok) success('Agendamento atualizado!')
    return ok
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    const ok = await deleteAgendamento(deleteTarget.id)
    setIsDeleting(false)
    if (ok) {
      success('Agendamento excluído!')
      setDeleteTarget(null)
    }
  }

  const statusColorClass = (status: AgendamentoStatus) => {
    switch (status) {
      case 'agendado':    return 'bg-blue-500/10 border-blue-500/30 text-blue-400'
      case 'confirmado':  return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'compareceu':  return 'bg-green-500/10 border-green-500/30 text-green-400'
      case 'faltou':      return 'bg-rose-500/10 border-rose-500/30 text-rose-400'
      case 'cancelado':   return 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
      default:            return 'bg-[var(--bg-base)] border-[var(--border-card)] text-[var(--text-muted)]'
    }
  }

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        description="Gerencie todas as consultas marcadas no escritório. Atualize o status de cada agendamento — ao confirmar o comparecimento, o lead é promovido a cliente automaticamente."
        action={
          <Button onClick={() => setIsNovoAgendamentoOpen(true)} className="gap-2">
            <Plus size={16} /> Novo Agendamento
          </Button>
        }
      />

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-[var(--bg-base)] rounded-[12px] flex items-center justify-center mb-4 border border-[var(--border-card)]">
              <Inbox size={22} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[15px] font-bold text-[var(--text-main)] font-display mb-1">
              Nenhum agendamento encontrado
            </h3>
            <p className="text-[var(--text-muted)] text-[13px] mb-4">Os agendamentos aparecerão aqui quando forem marcados.</p>
            <Button onClick={() => setIsNovoAgendamentoOpen(true)} variant="outline" className="gap-2">
              <Plus size={16} /> Criar Primeiro Agendamento
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]/60">
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Data do Agendamento</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Modalidade</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Advogado</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Google Calendar</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {agendamentos.map((agendamento) => {
                  const lead = agendamento.lead
                  const adv = agendamento.advogado
                  const leadId = agendamento.lead_id || lead?.id

                  return (
                    <tr
                      key={agendamento.id}
                      onClick={() => leadId && navigate(`/leads/${leadId}`)}
                      className={clsx(
                        'hover:bg-[var(--bg-base)] transition-colors group',
                        leadId && 'cursor-pointer'
                      )}
                    >
                      {/* Data */}
                      <td className="p-4 text-[13px] text-[var(--text-main)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={14} className="text-[var(--primary)]" />
                          <span className="font-semibold">
                            {format(new Date(agendamento.data_hora_inicio), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                        {agendamento.duracao_minutos && (
                          <div className="text-[10px] text-[var(--text-muted)] mt-0.5 ml-5">
                            {agendamento.duracao_minutos} min
                          </div>
                        )}
                      </td>

                      {/* Modalidade */}
                      <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          {agendamento.modalidade === 'online' ? (
                            <><Video size={13} className="text-[var(--primary)]" /> Online</>
                          ) : (
                            <><MapPin size={13} className="text-amber-500" /> Presencial</>
                          )}
                        </div>
                      </td>

                      {/* Nome */}
                      <td className="p-4 text-[13px] font-semibold text-[var(--text-main)]">
                        {lead?.nome_lead || 'Cliente Direto'}
                        {lead?.whatsapp_lead && (
                          <div className="text-[11px] font-normal text-[var(--text-muted)]">{lead.whatsapp_lead}</div>
                        )}
                      </td>

                      {/* Advogado */}
                      <td className="p-4 text-[13px] text-[var(--text-muted)] font-medium">
                        {adv?.nome ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: adv.cor || 'var(--primary)' }} />
                            {adv.nome}
                          </span>
                        ) : '-'}
                      </td>

                      {/* Google Calendar */}
                      <td className="p-4 text-[13px]" onClick={(e) => e.stopPropagation()}>
                        {agendamento.google_event_url ? (
                          <a
                            href={agendamento.google_event_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--primary)] hover:underline"
                          >
                            <ExternalLink size={13} /> Ver no Calendar
                          </a>
                        ) : (
                          <span className="text-[11px] text-[var(--text-muted)]">Local</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={agendamento.status}
                          onChange={(e) => handleStatusChange(agendamento.id, e.target.value as AgendamentoStatus)}
                          className={clsx(
                            'text-[12px] font-semibold rounded-[8px] px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer transition-all',
                            statusColorClass(agendamento.status as AgendamentoStatus)
                          )}
                        >
                          <option value="agendado">Agendado</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="compareceu">Compareceu</option>
                          <option value="faltou">Faltou</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>

                      {/* Ações */}
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botão Editar */}
                          <button
                            type="button"
                            onClick={() => setEditTarget(agendamento)}
                            title="Editar agendamento"
                            className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-all"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Botão Excluir */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(agendamento)}
                            title="Excluir agendamento"
                            className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[var(--border-card)] bg-[var(--bg-base)] text-[var(--text-muted)] hover:border-rose-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal: Promover a Cliente ── */}
      <Modal isOpen={isConfirmCompareceuOpen} onClose={() => setIsConfirmCompareceuOpen(false)} title="Promover a Cliente">
        <p className="text-[var(--text-muted)] text-[14px] mb-6 leading-relaxed">
          Ao confirmar o comparecimento, este lead será promovido a{' '}
          <strong className="text-[var(--primary)] font-bold">cliente</strong> automaticamente no sistema.
          Deseja prosseguir?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsConfirmCompareceuOpen(false)} disabled={isUpdating}>Cancelar</Button>
          <Button variant="primary" onClick={confirmStatusUpdate} isLoading={isUpdating}>Confirmar</Button>
        </div>
      </Modal>

      {/* ── Modal: Editar Agendamento ── */}
      <EditarAgendamentoModal
        isOpen={!!editTarget}
        agendamento={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
      />

      {/* ── Modal: Confirmar Exclusão ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir Agendamento">
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertTriangle size={24} className="text-rose-500" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-bold text-[var(--text-main)] mb-1">Tem certeza?</p>
            <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
              O agendamento de{' '}
              <strong className="text-[var(--text-main)]">
                {deleteTarget?.lead?.nome_lead || 'Cliente Direto'}
              </strong>{' '}
              em{' '}
              <strong className="text-[var(--text-main)]">
                {deleteTarget ? format(new Date(deleteTarget.data_hora_inicio), 'dd/MM/yyyy HH:mm') : ''}
              </strong>{' '}
              será removido permanentemente.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancelar</Button>
          <Button
            onClick={handleDelete}
            isLoading={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 text-white"
          >
            <Trash2 size={14} /> Excluir
          </Button>
        </div>
      </Modal>

      {/* ── Modal: Novo Agendamento ── */}
      <NovoAgendamentoModal
        isOpen={isNovoAgendamentoOpen}
        onClose={() => setIsNovoAgendamentoOpen(false)}
        onSuccess={refetch}
      />
    </div>
  )
}
