import type { LeadStatus, AgendamentoStatus, StatusQualificacao, AreaPrevidenciaria } from '../../types'

interface BadgeProps {
  status: LeadStatus | AgendamentoStatus | StatusQualificacao
  label?: string
}

export const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  // leads_adv
  novo_contato:        { bg: 'var(--primary-light)',  text: 'var(--primary)',  border: '#BFDBFE', label: 'Novo Contato' },
  conversando:         { bg: 'var(--warning-bg)',     text: 'var(--warning-text)', border: 'var(--warning-border)', label: 'Conversando' },
  consulta_agendada:   { bg: 'var(--success-bg)',     text: 'var(--success-text)', border: 'var(--success-border)', label: 'Consulta Agendada' },
  compareceu:          { bg: '#F5F3FF',               text: '#5B21B6',        border: '#DDD6FE', label: 'Compareceu' },
  follow_up:           { bg: 'var(--warning-bg)',     text: 'var(--warning-text)', border: 'var(--warning-border)', label: 'Follow Up' },
  fechado:             { bg: 'var(--success-bg)',     text: 'var(--success-text)', border: 'var(--success-border)', label: 'Fechado' },
  perdido:             { bg: 'var(--danger-bg)',      text: 'var(--danger-text)',  border: 'var(--danger-border)',  label: 'Perdido' },
  // agendamentos_adv exclusivos
  agendado:            { bg: 'var(--primary-light)',  text: 'var(--primary)',  border: '#BFDBFE', label: 'Agendado' },
  confirmado:          { bg: 'var(--success-bg)',     text: 'var(--success-text)', border: 'var(--success-border)', label: 'Confirmado' },
  faltou:              { bg: 'var(--danger-bg)',      text: 'var(--danger-text)',  border: 'var(--danger-border)',  label: 'Faltou' },
  cancelado:           { bg: 'var(--bg-base)',        text: 'var(--text-muted)', border: 'var(--border-card)', label: 'Cancelado' },
  // status_qualificacao
  pendente:            { bg: 'var(--bg-base)',        text: 'var(--text-muted)', border: 'var(--border-card)', label: 'Qualificação Pendente' },
  provavel_direito:    { bg: 'var(--success-bg)',     text: 'var(--success-text)', border: 'var(--success-border)', label: 'Provável Direito' },
  duvidoso:            { bg: 'var(--warning-bg)',     text: 'var(--warning-text)', border: 'var(--warning-border)', label: 'Duvidoso' },
  sem_direito_aparente:{ bg: 'var(--bg-base)',        text: 'var(--text-muted)', border: 'var(--border-card)', label: 'Sem Direito Aparente' },
}

export const areaPrevidenciariaLabels: Record<AreaPrevidenciaria, string> = {
  aposentadoria_idade:                'Aposentadoria por Idade',
  aposentadoria_tempo_contribuicao:   'Aposentadoria por Tempo de Contribuição',
  aposentadoria_especial:             'Aposentadoria Especial',
  aposentadoria_invalidez:            'Aposentadoria por Invalidez',
  auxilio_doenca:                     'Auxílio por Incapacidade (Doença)',
  bpc_loas:                           'BPC/LOAS',
  pensao_morte:                       'Pensão por Morte',
  auxilio_acidente:                   'Auxílio-Acidente',
  salario_maternidade:                'Salário-Maternidade',
  revisao_beneficio:                  'Revisão de Benefício',
  nao_identificada:                   'Área Não Identificada',
}

export default function Badge({ status, label }: BadgeProps) {
  const config = statusConfig[status] || {
    bg: 'var(--bg-base)',
    text: 'var(--text-muted)',
    border: 'var(--border-card)',
    label: status,
  }

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide"
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
