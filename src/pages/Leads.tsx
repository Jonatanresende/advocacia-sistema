import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useLeads } from '../hooks/useLeads'
import type { DateFilter } from '../types'
import { format } from 'date-fns'
import { Inbox } from 'lucide-react'

export default function Leads() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_mes', startDate: '', endDate: '' })
  const { leads, isLoading } = useLeads(filter, undefined, true)

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Lista completa de todas as pessoas que entraram em contato com o escritório e ainda não compareceram a uma consulta."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-[var(--bg-base)] rounded-[12px] flex items-center justify-center mb-4 border border-[var(--border-card)]">
              <Inbox size={22} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[15px] font-bold text-[var(--text-main)] font-display mb-1">
              Nenhum lead encontrado
            </h3>
            <p className="text-[var(--text-muted)] text-[13px]">Tente ajustar o filtro de datas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]/60">
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Motivo do Contato</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {leads.map((lead) => (
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
                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 text-[11px] font-bold">
                          {lead.nome_lead ? lead.nome_lead[0].toUpperCase() : '?'}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
