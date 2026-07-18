import type { LeadStatus, AgendamentoStatus } from '../../types'

interface BadgeProps {
  status: LeadStatus | AgendamentoStatus
  label?: string
}

export const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  // leads_adv
  novo_contato: { bg: '#EBF4FF', text: '#1C5EA8', border: '#BFDBFE', label: 'Novo Contato' },
  conversando: { bg: '#FEF9E7', text: '#92600A', border: '#FDE68A', label: 'Conversando' },
  consulta_agendada: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', label: 'Consulta Agendada' },
  compareceu: { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', label: 'Compareceu' },
  follow_up: { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA', label: 'Follow Up' },
  fechado: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', label: 'Fechado' },
  perdido: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Perdido' },
  // agendamentos_adv exclusivos
  agendado: { bg: '#EBF4FF', text: '#1C5EA8', border: '#BFDBFE', label: 'Agendado' },
  confirmado: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', label: 'Confirmado' },
  faltou: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', label: 'Faltou' },
  cancelado: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Cancelado' },
}

export default function Badge({ status, label }: BadgeProps) {
  const config = statusConfig[status] || { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: status }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      {label || config.label}
    </span>
  )
}
