import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useFollowUp } from '../hooks/useFollowUp'
import { differenceInMinutes, format } from 'date-fns'
import { Bell, Inbox } from 'lucide-react'

const COLUMNS = [
  'Início do Atendimento',
  'Nome',
  'WhatsApp',
  'Motivo do Contato',
  'Status',
  'Última Mensagem',
  'Minutos sem resposta',
] as const

export default function FollowUp() {
  const navigate = useNavigate()
  const { leads, isLoading } = useFollowUp()
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 60_000)
    return () => clearInterval(interval)
  }, [])

  const minutosSemResposta = (ultimaMensagem: string | null) => {
    if (!ultimaMensagem) return null
    return differenceInMinutes(new Date(), new Date(ultimaMensagem))
  }

  return (
    <div>
      <PageHeader
        title="Follow Up"
        description="Leads que precisam de acompanhamento para avançar no funil. O Agente de IA realiza os follow ups automaticamente, garantindo que nenhuma oportunidade seja perdida."
      />

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]">
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-card)]">
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]" />
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-[var(--bg-base)] rounded-full flex items-center justify-center mb-4">
                        <Inbox size={24} className="text-[var(--text-muted)]" />
                      </div>
                      <h3 className="text-lg font-medium text-[var(--text-main)] font-display mb-1">
                        Nenhum follow up pendente
                      </h3>
                      <p className="text-[var(--text-muted)] text-sm">
                        Ótimo trabalho! Todos os leads estão atualizados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="hover:bg-[var(--bg-base)] cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-sm text-[var(--text-main)] whitespace-nowrap">
                      {lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="p-4 text-sm font-medium text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--warning)]/10 text-[var(--warning)] flex items-center justify-center shrink-0">
                          <Bell size={16} />
                        </div>
                        {lead.nome_lead || 'Desconhecido'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">{lead.whatsapp_lead}</td>
                    <td className="p-4 text-sm text-[var(--text-muted)] max-w-[200px] truncate">
                      {lead.motivo_contato || '-'}
                    </td>
                    <td className="p-4">
                      <Badge status={lead.status} />
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)] whitespace-nowrap">
                      {lead.ultima_mensagem ? format(new Date(lead.ultima_mensagem), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="p-4 text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                      {lead.ultima_mensagem
                        ? `${minutosSemResposta(lead.ultima_mensagem)} min`
                        : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
