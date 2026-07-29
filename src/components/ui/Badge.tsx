import type { LeadStatus, AgendamentoStatus, StatusQualificacao, AreaPrevidenciaria } from '../../types'

interface BadgeProps {
  status: LeadStatus | AgendamentoStatus | StatusQualificacao
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
  // status_qualificacao (qualificação previdenciária)
  pendente: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Qualificação Pendente' },
  provavel_direito: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0', label: 'Provável Direito' },
  duvidoso: { bg: '#FEF9E7', text: '#92600A', border: '#FDE68A', label: 'Duvidoso' },
  sem_direito_aparente: { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB', label: 'Sem Direito Aparente' },
}

export const areaPrevidenciariaLabels: Record<AreaPrevidenciaria, string> = {
  aposentadoria_idade: 'Aposentadoria por Idade',
  aposentadoria_tempo_contribuicao: 'Aposentadoria por Tempo de Contribuição',
  aposentadoria_especial: 'Aposentadoria Especial',
  aposentadoria_invalidez: 'Aposentadoria por Invalidez',
  auxilio_doenca: 'Auxílio por Incapacidade (Doença)',
  bpc_loas: 'BPC/LOAS',
  pensao_morte: 'Pensão por Morte',
  auxilio_acidente: 'Auxílio-Acidente',
  salario_maternidade: 'Salário-Maternidade',
  revisao_beneficio: 'Revisão de Benefício',
  nao_identificada: 'Área Não Identificada',
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
