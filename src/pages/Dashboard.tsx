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
import { Users, UserCheck, CalendarDays, PieChart as PieChartIcon } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts'

export default function Dashboard() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<DateFilter>({ preset: 'este_mes', startDate: '', endDate: '' })

  const { stats, isLoading } = useDashboardStats(filter)
  const { leads, isLoading: leadsLoading } = useLeads(filter)

  const PIE_COLORS = ['#C9A84C', '#1C2B3A']

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Acompanhe os principais indicadores de atendimento do seu escritório no período selecionado — volume de leads, consultas agendadas e o desempenho do Agente de IA nos atendimentos realizados."
      />

      <FilterBar filter={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div></div>
      ) : (
        <div className="flex flex-col gap-6 mb-8">
          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card noPadding className="flex items-center p-4 shadow-none !border-[#E4E7EC] rounded-[14px]">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 mr-4">
                <Users size={18} />
              </div>
              <div className="flex flex-col">
                <p className="text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider mb-1">Total de Leads</p>
                <h3 className="text-3xl font-bold font-display text-[var(--text-main)] leading-none">{stats.totalLeads}</h3>
                <p className="text-[var(--text-muted)] opacity-80 text-[10px] mt-1.5">No período selecionado</p>
              </div>
            </Card>

            <Card noPadding className="flex items-center p-4 shadow-none !border-[#E4E7EC] rounded-[14px]">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center shrink-0 mr-4">
                <UserCheck size={18} />
              </div>
              <div className="flex flex-col">
                <p className="text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider mb-1">Total de Clientes</p>
                <h3 className="text-3xl font-bold font-display text-[var(--text-main)] leading-none">{stats.totalClientes}</h3>
                <p className="text-[var(--text-muted)] opacity-80 text-[10px] mt-1.5">No período selecionado</p>
              </div>
            </Card>

            <Card noPadding className="flex items-center p-4 shadow-none !border-[#E4E7EC] rounded-[14px] border-l-[4px] !border-l-[var(--primary)]">
              <div className="w-10 h-10 rounded-[10px] bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 mr-4">
                <CalendarDays size={18} />
              </div>
              <div className="flex flex-col">
                <p className="text-[var(--text-muted)] text-[11px] font-semibold uppercase tracking-wider mb-1">Consultas Hoje</p>
                <h3 className="text-3xl font-bold font-display text-[var(--text-main)] leading-none">{stats.consultasHoje}</h3>
                <p className="text-[var(--text-muted)] opacity-80 text-[10px] mt-1.5">Agendadas para hoje</p>
              </div>
            </Card>
          </div>

          {/* Gráfico 1 - Linha */}
          <Card noPadding className="p-5 shadow-none !border-[#E4E7EC] rounded-[14px]">
            <div className="mb-5">
              <h3 className="font-semibold text-[15px] font-display text-[var(--text-main)] mb-1">Volume de Leads por Dia</h3>
              <p className="text-[12px] text-[var(--text-muted)]">Acompanhe a quantidade de leads que entraram em contato com o escritório a cada dia no período selecionado.</p>
            </div>
            <div className="h-[220px] w-full">
              {stats.leadsPorDia.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.leadsPorDia} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-card)" strokeOpacity={0.5} />
                    <XAxis dataKey="data" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} tickMargin={12} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                      itemStyle={{ color: 'var(--accent)', fontWeight: 600 }} 
                      cursor={{ stroke: 'var(--border-card)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Line type="monotone" dataKey="quantidade" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">Nenhum dado no período</div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 2 - Barras */}
            <Card noPadding className="p-5 shadow-none !border-[#E4E7EC] rounded-[14px] flex flex-col">
              <div className="mb-5">
                <h3 className="font-semibold text-[15px] font-display text-[var(--text-main)] mb-1">Leads por Dia da Semana</h3>
                <p className="text-[12px] text-[var(--text-muted)]">Descubra quais dias da semana concentram o maior volume de novos contatos.</p>
              </div>
              <div className="h-[180px] w-full mt-auto">
                {stats.leadsPorSemana.some(d => d.quantidade > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.leadsPorSemana} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border-card)" strokeOpacity={0.5} />
                      <XAxis dataKey="dia" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickMargin={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} tickMargin={12} />
                      <RechartsTooltip 
                        cursor={{ fill: 'var(--text-muted)', opacity: 0.04 }} 
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                        itemStyle={{ color: 'var(--accent)', fontWeight: 600 }}
                      />
                      <Bar dataKey="quantidade" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">Nenhum dado no período</div>
                )}
              </div>
            </Card>

            {/* Gráfico 3 - Pizza */}
            <Card noPadding className="p-5 shadow-none !border-[#E4E7EC] rounded-[14px] flex flex-col">
              <div className="mb-3">
                <h3 className="font-semibold text-[15px] font-display text-[var(--text-main)] mb-1">Atendimentos por Horário</h3>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">Veja o impacto direto do Agente de IA na captação de leads fora do expediente.</p>
                <div className="inline-flex bg-[var(--bg-base)] text-[var(--text-muted)] text-[11px] py-1 px-2.5 rounded-md border border-[var(--border-card)]">
                  {stats.officeHoursText}
                </div>
              </div>

              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center mt-1">
                <div className="h-[140px] w-full sm:w-[160px] shrink-0">
                  {stats.atendimentosHorario.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.atendimentosHorario} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                          {stats.atendimentosHorario.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }} 
                          itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                      <PieChartIcon size={40} className="opacity-10" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 flex-1 px-3 mt-4 sm:mt-0">
                  {stats.atendimentosHorario.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index] }}></div>
                        <span className="text-[12px] text-[var(--text-muted)]">{entry.name}</span>
                      </div>
                      <span className="font-semibold text-[13px] text-[var(--text-main)]">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-[var(--bg-base)] rounded-lg text-[11px] text-[var(--text-muted)] leading-relaxed border border-[var(--border-card)]">
                <strong className="text-[var(--accent)] font-semibold">Nota:</strong> Os atendimentos fora do horário comercial foram realizados pelo Agente de IA. Sem ele, esses leads poderiam ter sido perdidos para a concorrência.
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tabela de Leads */}
      <h3 className="font-semibold text-xl font-display text-[var(--text-main)] mb-4">Leads no Período</h3>
      <Card noPadding>
        {leadsLoading ? (
          <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div></div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Nenhum lead encontrado no período selecionado.</div>
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
                    <td className="p-4 text-sm font-medium text-[var(--text-main)]">{lead.nome_lead || 'Desconhecido'}</td>
                    <td className="p-4 text-sm text-[var(--text-muted)]">{lead.whatsapp_lead}</td>
                    <td className="p-4 text-sm text-[var(--text-muted)] max-w-[200px] truncate">{lead.motivo_contato || '-'}</td>
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
