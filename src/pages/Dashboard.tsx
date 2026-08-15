import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
import FilterBar from '../components/ui/FilterBar'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useLeads } from '../hooks/useLeads'
import type { DateFilter } from '../types'
import { format } from 'date-fns'
import { Users, UserCheck, CalendarDays, PieChart as PieChartIcon, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
  accent?: boolean
}

function StatCard({ label, value, sub, icon: Icon, iconColor, iconBg, accent }: StatCardProps) {
  return (
    <Card noPadding className={`p-5 ${accent ? 'ring-1 ring-[var(--primary)]/20' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon size={18} />
        </div>
        {accent && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-full">
            <TrendingUp size={9} /> Hoje
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className="text-[36px] font-extrabold font-display text-[var(--text-main)] leading-none tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[11.5px] text-[var(--text-muted)] mt-1.5">{sub}</p>
      )}
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_mes', startDate: '', endDate: '' })

  const { stats, isLoading } = useDashboardStats(filter)
  const { leads, isLoading: leadsLoading } = useLeads(filter)

  const PIE_COLORS = ['var(--primary)', 'var(--brand)']

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Acompanhe os principais indicadores de atendimento do seu escritório no período selecionado."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
        </div>
      ) : (
        <div className="flex flex-col gap-5 mb-8">

          {/* ── KPI Cards ────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total de Leads"
              value={stats.totalLeads}
              sub="No período selecionado"
              icon={Users}
              iconColor="var(--primary)"
              iconBg="var(--primary-light)"
            />
            <StatCard
              label="Total de Clientes"
              value={stats.totalClientes}
              sub="No período selecionado"
              icon={UserCheck}
              iconColor="var(--success)"
              iconBg="var(--success-bg)"
            />
            <StatCard
              label="Consultas Hoje"
              value={stats.consultasHoje}
              sub="Agendadas para hoje"
              icon={CalendarDays}
              iconColor="var(--primary)"
              iconBg="var(--primary-light)"
              accent
            />
          </div>

          {/* ── Gráfico Linha — Volume de Leads por Dia ─────────── */}
          <Card noPadding className="p-5">
            <div className="mb-5">
              <h3 className="font-bold text-[15px] font-display text-[var(--text-main)] mb-1 tracking-tight">
                Volume de Leads por Dia
              </h3>
              <p className="text-[12px] text-[var(--text-muted)]">
                Quantidade de leads que entraram em contato a cada dia no período.
              </p>
            </div>
            <div className="h-[220px] w-full">
              {stats.leadsPorDia.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.leadsPorDia} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-card)" strokeOpacity={0.6} />
                    <XAxis dataKey="data" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} tickMargin={12} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '10px', fontSize: '12px', boxShadow: 'var(--shadow-elevated)' }}
                      itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                      cursor={{ stroke: 'var(--border-card)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="quantidade"
                      stroke="var(--primary)"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: 'var(--primary)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">
                  Nenhum dado no período
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── Gráfico Barras ─────────────────────────────────── */}
            <Card noPadding className="p-5 flex flex-col">
              <div className="mb-5">
                <h3 className="font-bold text-[15px] font-display text-[var(--text-main)] mb-1 tracking-tight">
                  Leads por Dia da Semana
                </h3>
                <p className="text-[12px] text-[var(--text-muted)]">
                  Quais dias da semana concentram mais novos contatos.
                </p>
              </div>
              <div className="h-[180px] w-full mt-auto">
                {stats.leadsPorSemana.some(d => d.quantidade > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.leadsPorSemana} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-card)" strokeOpacity={0.6} />
                      <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} tickMargin={12} />
                      <RechartsTooltip
                        cursor={{ fill: 'var(--text-muted)', opacity: 0.04 }}
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '10px', fontSize: '12px', boxShadow: 'var(--shadow-elevated)' }}
                        itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                      />
                      <Bar dataKey="quantidade" fill="var(--primary)" radius={[5, 5, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">
                    Nenhum dado no período
                  </div>
                )}
              </div>
            </Card>

            {/* ── Gráfico Pizza — IA vs Humano ───────────────────── */}
            <Card noPadding className="p-5 flex flex-col">
              <div className="mb-3">
                <h3 className="font-bold text-[15px] font-display text-[var(--text-main)] mb-1 tracking-tight">
                  Atendimentos por Horário
                </h3>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                  Impacto do Agente de IA fora do expediente.
                </p>
                <div className="inline-flex bg-[var(--bg-base)] text-[var(--text-muted)] text-[11px] py-1 px-2.5 rounded-[6px] border border-[var(--border-card)]">
                  {stats.officeHoursText}
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center mt-2">
                <div className="h-[130px] w-full sm:w-[150px] shrink-0">
                  {stats.atendimentosHorario.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.atendimentosHorario}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {stats.atendimentosHorario.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '10px', fontSize: '12px', boxShadow: 'var(--shadow-elevated)' }}
                          itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                      <PieChartIcon size={36} className="opacity-10" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 flex-1 px-4 mt-4 sm:mt-0">
                  {stats.atendimentosHorario.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index] }} />
                        <span className="text-[12px] text-[var(--text-muted)]">{entry.name}</span>
                      </div>
                      <span className="font-bold text-[13px] text-[var(--text-main)]">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-[var(--brand-light)] rounded-[8px] text-[11.5px] text-[var(--text-muted)] leading-relaxed border border-[var(--brand)]/20">
                <strong className="text-[var(--brand)] font-semibold">Nota:</strong> Atendimentos fora do horário comercial foram realizados pelo Agente de IA — sem ele, esses leads poderiam ter sido perdidos.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tabela de Leads ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[18px] font-display text-[var(--text-main)] tracking-tight">
          Leads no Período
        </h3>
      </div>

      <Card noPadding>
        {leadsLoading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
          </div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center text-[var(--text-muted)] text-[13px]">
            Nenhum lead encontrado no período selecionado.
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
                    className="hover:bg-[var(--bg-base)] cursor-pointer transition-colors"
                  >
                    <td className="p-4 text-[13px] text-[var(--text-muted)] whitespace-nowrap">
                      {lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="p-4 text-[13px] font-semibold text-[var(--text-main)]">
                      {lead.nome_lead || 'Desconhecido'}
                    </td>
                    <td className="p-4 text-[13px] text-[var(--text-muted)]">{lead.whatsapp_lead}</td>
                    <td className="p-4 text-[13px] text-[var(--text-muted)] max-w-[200px] truncate">
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
