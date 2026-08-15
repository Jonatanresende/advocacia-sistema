import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import Card from '../components/ui/Card'
import { useClientes } from '../hooks/useClientes'
import { format } from 'date-fns'
import { Inbox, UserCheck } from 'lucide-react'

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, isLoading } = useClientes()

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Todos os contatos que já compareceram a uma consulta presencial ou online. A promoção de lead para cliente acontece automaticamente quando o comparecimento é confirmado."
      />

      <Card noPadding className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 bg-[var(--bg-base)] rounded-[12px] flex items-center justify-center mb-4 border border-[var(--border-card)]">
              <Inbox size={22} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-[15px] font-bold text-[var(--text-main)] font-display mb-1">
              Nenhum cliente encontrado
            </h3>
            <p className="text-[var(--text-muted)] text-[13px]">
              Os clientes aparecerão aqui quando um lead for marcado como compareceu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-card)] bg-[var(--bg-base)]/60">
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Primeira Visita</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Início do Atendimento</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Nome</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">WhatsApp</th>
                  <th className="p-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Motivo Inicial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-card)]">
                {clientes.map((cliente) => (
                  <tr
                    key={cliente.id}
                    onClick={() => navigate(`/clientes/${cliente.id}`)}
                    className="hover:bg-[var(--bg-base)] cursor-pointer transition-colors group"
                  >
                    <td className="p-4 text-[13px] font-semibold text-[var(--text-main)] whitespace-nowrap">
                      {format(new Date(cliente.data_primeira_visita), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap font-medium">
                      {cliente.lead?.inicio_atendimento
                        ? format(new Date(cliente.lead.inicio_atendimento), 'dd/MM/yyyy')
                        : '-'}
                    </td>
                    <td className="p-4 text-[13px] font-semibold text-[var(--text-main)]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center shrink-0">
                          <UserCheck size={14} />
                        </div>
                        {cliente.lead?.nome_lead || 'Desconhecido'}
                      </div>
                    </td>
                    <td className="p-4 text-[13px] text-[var(--text-muted)] font-medium">{cliente.lead?.whatsapp_lead}</td>
                    <td className="p-4 text-[13px] text-[var(--text-muted)] max-w-[250px] truncate">
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
