import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { useAgendamentos } from '../hooks/useAgendamentos'
import type { AgendamentoStatus } from '../types'
import { format } from 'date-fns'
import { CalendarDays, Inbox, Video, MapPin } from 'lucide-react'

export default function Agendamentos() {
  const navigate = useNavigate()
  const { agendamentos, isLoading, updateStatus } = useAgendamentos()

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
        description="Gerencie todas as consultas marcadas no escritório. Clique em qualquer linha para ver o histórico do lead. Atualize o status de cada agendamento — ao confirmar o comparecimento, o lead é promovido a cliente automaticamente."
      />

      <Card noPadding className="shadow-none !border-[var(--border-card)] rounded-[14px] overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : agendamentos.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-[var(--bg-base)] rounded-[12px] flex items-center justify-center mb-4 border border-[var(--border-card)]">
              <Inbox size={22} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[15px] font-semibold text-[var(--text-main)] font-display mb-1">Nenhum agendamento encontrado</h3>
            <p className="text-[var(--text-muted)] text-[13px]">Os agendamentos aparecerão aqui quando forem marcados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]/50">
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Data do Agendamento</th>
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Modalidade</th>
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Motivo do Contato</th>
                  <th className="p-4 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Ação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {agendamentos.map((agendamento) => {
                  const lead = agendamento.lead
                  const leadId = agendamento.lead_id || lead?.id

                  return (
                    <tr
                      key={agendamento.id}
                      onClick={() => leadId && navigate(`/leads/${leadId}`)}
                      className={leadId ? 'hover:bg-[var(--bg-base)] cursor-pointer transition-colors group' : 'hover:bg-[var(--bg-base)] transition-colors group'}
                    >
                      <td className="p-4 text-[13px] text-[var(--text-main)] whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CalendarDays size={15} className="text-[var(--accent)]" />
                          <span className="font-semibold">{format(new Date(agendamento.data_hora_inicio), 'dd/MM/yyyy HH:mm')}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          {agendamento.modalidade === 'online' ? (
                            <><Video size={14} /> Online</>
                          ) : (
                            <><MapPin size={14} /> Presencial</>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-[13px] font-semibold text-[var(--text-main)]">
                        {lead?.nome_lead || 'Desconhecido'}
                      </td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] font-medium">{lead?.whatsapp_lead}</td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] max-w-[200px] truncate">
                        {lead?.motivo_contato || '-'}
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={agendamento.status}
                          onChange={(e) => handleStatusChange(agendamento.id, e.target.value as AgendamentoStatus)}
                          className="text-[12px] font-semibold rounded-[8px] px-3 py-1.5 border border-[var(--border-card)] bg-[var(--bg-card)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer hover:border-[var(--text-muted)] transition-colors"
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
        <p className="text-[var(--text-muted)] text-[14px] mb-6 leading-relaxed">
          Ao confirmar o comparecimento, este lead será promovido a <strong className="text-[var(--accent)] font-semibold">cliente</strong> automaticamente no sistema.
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
