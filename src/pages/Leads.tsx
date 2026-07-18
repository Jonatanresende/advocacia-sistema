import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useLeads } from '../hooks/useLeads'
import type { DateFilter } from '../types'
import { format } from 'date-fns'
import { Users, Inbox } from 'lucide-react'

export default function Leads() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_mes', startDate: '', endDate: '' })
  const { leads, isLoading } = useLeads(filter, undefined, true)

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Lista completa de todas as pessoas que entraram em contato com o escritório e ainda não compareceram a uma consulta. Clique em qualquer lead para ver o histórico completo da conversa."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      <Card noPadding>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[var(--bg-base)] rounded-full flex items-center justify-center mb-4">
              <Inbox size={24} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-main)] font-display mb-1">Nenhum lead encontrado</h3>
            <p className="text-[var(--text-muted)] text-sm">Tente ajustar o filtro de datas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]">
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Motivo do Contato</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {leads.map((lead) => (
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
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          <Users size={16} />
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
