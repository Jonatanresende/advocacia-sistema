import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import { useClientes } from '../hooks/useClientes'
import type { DateFilter } from '../types'
import { format } from 'date-fns'
import { UserCheck, Inbox } from 'lucide-react'

export default function Clientes() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_ano', startDate: '', endDate: '' })
  const { clientes, isLoading } = useClientes(filter)

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Todos os contatos que já compareceram a uma consulta presencial ou online. A promoção de lead para cliente acontece automaticamente quando a consulta é confirmada."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      <Card noPadding>
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-[var(--bg-base)] rounded-full flex items-center justify-center mb-4">
              <Inbox size={24} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-main)] font-display mb-1">Nenhum cliente encontrado</h3>
            <p className="text-[var(--text-muted)] text-sm">Tente ajustar o filtro de datas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]">
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Primeira Visita</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Motivo Inicial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="hover:bg-[var(--bg-base)] cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-sm font-medium text-[var(--text-main)] whitespace-nowrap">
                      {format(new Date(cliente.data_primeira_visita), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)] whitespace-nowrap">
                      {cliente.lead?.inicio_atendimento ? format(new Date(cliente.lead.inicio_atendimento), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="p-4 text-sm font-medium text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center shrink-0">
                          <UserCheck size={16} />
                        </div>
                        {cliente.lead?.nome_lead || 'Desconhecido'}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">{cliente.lead?.whatsapp_lead}</td>
                    <td className="p-4 text-sm text-[var(--text-muted)] max-w-[200px] truncate">
                      {cliente.lead?.motivo_contato || '-'}
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
