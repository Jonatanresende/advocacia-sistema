import { useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useAgendamentos } from '../hooks/useAgendamentos'
import type { DateFilter, AgendamentoStatus } from '../types'
import { format } from 'date-fns'
import { CalendarDays, Inbox } from 'lucide-react'

export default function Agendamentos() {
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_mes', startDate: '', endDate: '' })
  const { agendamentos, isLoading, updateStatus } = useAgendamentos(filter)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAgendamento, setSelectedAgendamento] = useState<{ id: string; status: AgendamentoStatus } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = (id: string, newStatus: AgendamentoStatus) => {
    if (newStatus === 'compareceu') {
      setSelectedAgendamento({ id, status: newStatus })
      setIsModalOpen(true)
    } else {
      updateStatus(id, newStatus)
    }
  }

  const confirmStatusUpdate = async () => {
    if (!selectedAgendamento) return
    setIsUpdating(true)
    await updateStatus(selectedAgendamento.id, selectedAgendamento.status)
    setIsUpdating(false)
    setIsModalOpen(false)
    setSelectedAgendamento(null)
  }

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        description="Gerencie todas as consultas marcadas no escritório. Atualize o status de cada agendamento diretamente por aqui — ao confirmar o comparecimento, o lead é promovido a cliente automaticamente."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      <Card noPadding>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[var(--bg-base)] rounded-full flex items-center justify-center mb-4">
              <Inbox size={24} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-main)] font-display mb-1">Nenhum agendamento encontrado</h3>
            <p className="text-[var(--text-muted)] text-sm">Tente ajustar o filtro de datas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]">
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Data do Agendamento</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Motivo do Contato</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {agendamentos.map((agendamento) => {
                  const lead = agendamento.lead
                  return (
                    <tr key={agendamento.id} className="hover:bg-[var(--bg-base)] transition-colors">
                      <td className="p-4 text-sm text-[var(--text-main)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={16} className="text-[var(--accent)]" />
                          <span className="font-medium">{format(new Date(agendamento.data_hora_inicio), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-[var(--text-main)]">
                        {lead?.nome_lead || 'Desconhecido'}
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)]">{lead?.whatsapp_lead}</td>
                      <td className="p-4 text-sm text-[var(--text-muted)] max-w-[200px] truncate">
                        {lead?.motivo_contato || '-'}
                      </td>
                      <td className="p-4">
                        <select
                          value={agendamento.status}
                          onChange={(e) => handleStatusChange(agendamento.id, e.target.value as AgendamentoStatus)}
                          className="text-sm font-medium rounded-[8px] px-3 py-1.5 border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
                        >
                          <option value="agendado">Agendado</option>
                          <option value="confirmado">Confirmado</option>
                          <option value="compareceu">Compareceu (Cliente)</option>
                          <option value="faltou">Faltou</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Promover a Cliente"
      >
        <p className="text-[var(--text-main)] mb-6 leading-relaxed">
          Ao confirmar o comparecimento, este lead será promovido a <strong>cliente</strong> automaticamente no sistema.
          Deseja prosseguir com esta ação?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isUpdating}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmStatusUpdate} isLoading={isUpdating}>
            Confirmar
          </Button>
        </div>
      </Modal>
    </div>
  )
}
