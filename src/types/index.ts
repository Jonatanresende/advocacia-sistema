// ─── ENUMs ────────────────────────────────────────────────────────────────────

export type LeadStatus =
  | 'novo_contato'
  | 'conversando'
  | 'consulta_agendada'
  | 'compareceu'
  | 'follow_up'
  | 'fechado'
  | 'perdido'

export type AgendamentoStatus =
  | 'agendado'
  | 'confirmado'
  | 'compareceu'
  | 'faltou'
  | 'cancelado'

export type DiaSemana =
  | 'domingo'
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'

export type AreaPrevidenciaria =
  | 'aposentadoria_idade'
  | 'aposentadoria_tempo_contribuicao'
  | 'aposentadoria_especial'
  | 'aposentadoria_invalidez'
  | 'auxilio_doenca'
  | 'bpc_loas'
  | 'pensao_morte'
  | 'auxilio_acidente'
  | 'salario_maternidade'
  | 'revisao_beneficio'
  | 'nao_identificada'

export type StatusQualificacao =
  | 'pendente'
  | 'provavel_direito'
  | 'duvidoso'
  | 'sem_direito_aparente'

export type ModalidadeAtendimento = 'online' | 'presencial'

// ─── TABELAS ──────────────────────────────────────────────────────────────────

export interface LeadAdv {
  id: string
  nome_lead: string | null
  whatsapp_lead: string
  motivo_contato: string | null
  resumo_conversa: string | null
  status: LeadStatus
  inicio_atendimento: string | null
  ultima_mensagem: string | null
  minutos_ultima_mensagem: number | null
  follow_up_1: string | null
  follow_up_2: string | null
  follow_up_3: string | null
  data_agendamento: string | null
  id_agendamento: string | null
  anotacoes: string | null
  created_at: string
  area_previdenciaria: AreaPrevidenciaria
  status_qualificacao: StatusQualificacao
  respostas_qualificacao: { texto: string } | null
  // Campos Chatwoot: existem no banco mas NUNCA usar no frontend
}

export interface ClienteAdv {
  id: string
  lead_id: string
  data_primeira_visita: string
  created_at: string
  // Join com leads_adv
  lead?: LeadAdv
}

export interface OfficeConfig {
  id: number
  nome: string
  logo_url: string | null
  favicon_url: string | null
  updated_at: string
}

export interface OfficeHours {
  id: string
  dia: DiaSemana
  aberto: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

export interface Advogado {
  id: string
  nome: string
  cor: string
  ativo: boolean
  created_at: string
}

export interface AdvogadoHours {
  id: string
  advogado_id: string
  dia: DiaSemana
  aberto: boolean
  hora_inicio: string | null
  hora_fim: string | null
}

export interface AgendamentoAdv {
  id: string
  advogado_id: string
  lead_id: string | null
  cliente_id: string | null
  data_hora_inicio: string
  data_hora_fim: string
  status: AgendamentoStatus
  modalidade: ModalidadeAtendimento
  observacoes: string | null
  created_at: string
  // Joins
  lead?: LeadAdv
  advogado?: Advogado
}

// ─── FILTROS ──────────────────────────────────────────────────────────────────

export type FilterPreset =
  | 'hoje'
  | 'ontem'
  | 'ultimos_7_dias'
  | 'ultimos_14_dias'
  | 'este_mes'
  | 'mes_passado'
  | 'este_ano'
  | 'personalizado'

export interface DateFilter {
  preset: FilterPreset
  startDate: string
  endDate: string
}
