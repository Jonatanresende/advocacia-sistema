import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useFollowUp, referenciaUltimaInteracao } from '../hooks/useFollowUp'
import { differenceInMinutes, format } from 'date-fns'
import { Bell, Inbox, Clock } from 'lucide-react'

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

  const minutosSemResposta = (referencia: string | null) => {
    if (!referencia) return null
    return differenceInMinutes(new Date(), new Date(referencia))
  }

  return (
    <div>
      <PageHeader
        title="Follow Up"
        description="Leads que precisam de acompanhamento para avançar no funil. O Agente de IA realiza os follow ups automaticamente."
      />

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]/60">
                {COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-card)]">
              {isLoading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-12">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="p-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 bg-[var(--success-bg)] rounded-[12px] flex items-center justify-center mb-4 border border-[var(--success-border)]">
                        <Inbox size={22} className="text-[var(--success)]" />
                      </div>
                      <h3 className="text-[15px] font-bold text-[var(--text-main)] font-display mb-1">
                        Nenhum follow up pendente
                      </h3>
                      <p className="text-[var(--text-muted)] text-[13px]">
                        Ótimo trabalho! Todos os leads estão atualizados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const referencia = referenciaUltimaInteracao(lead)
                  const mins = minutosSemResposta(referencia)
                  const urgente = mins !== null && mins > 120

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-[var(--bg-base)] cursor-pointer transition-colors group"
                    >
                      <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap">
                        {lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}
                      </td>
                      <td className="p-4 text-[13px] font-semibold text-[var(--text-main)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--warning-bg)] text-[var(--warning)] flex items-center justify-center shrink-0">
                            <Bell size={14} />
                          </div>
                          {lead.nome_lead || 'Desconhecido'}
                        </div>
                      </td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] font-medium">{lead.whatsapp_lead}</td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] max-w-[250px] truncate">
                        {lead.motivo_contato || '-'}
                      </td>
                      <td className="p-4">
                        <Badge status={lead.status} />
                      </td>
                      <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap font-medium">
                        {referencia ? format(new Date(referencia), 'dd/MM/yyyy HH:mm') : '-'}
                      </td>
                      <td className="p-4 text-[13px] whitespace-nowrap">
                        {referencia ? (
                          <span
                            className={`inline-flex items-center gap-1.5 font-bold ${
                              urgente ? 'text-[var(--danger)]' : 'text-[var(--text-main)]'
                            }`}
                          >
                            <Clock size={12} />
                            {mins} min
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
