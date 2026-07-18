import { CalendarDays } from 'lucide-react'
import clsx from 'clsx'
import type { FilterPreset, DateFilter } from '../../types'

interface FilterBarProps {
  filter: DateFilter
  onChange: (filter: DateFilter) => void
}

const presets: { id: FilterPreset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: 'ultimos_7_dias', label: 'Últimos 7 dias' },
  { id: 'ultimos_14_dias', label: 'Últimos 14 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'este_ano', label: 'Este ano' },
]

export default function FilterBar({ filter, onChange }: FilterBarProps) {
  const handlePresetClick = (preset: FilterPreset) => {
    onChange({ preset, startDate: '', endDate: '' })
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6 items-center p-2 bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[12px] shadow-sm">
      {presets.map((preset) => {
        const isActive = filter.preset === preset.id
        return (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors',
              isActive
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]'
            )}
          >
            {preset.label}
          </button>
        )
      })}

      <div className="h-6 w-px bg-[var(--border-card)] mx-2 hidden sm:block" />

      <button
        onClick={() => handlePresetClick('personalizado')}
        className={clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-[8px] transition-colors',
          filter.preset === 'personalizado'
            ? 'bg-[var(--accent)] text-white'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-base)] hover:text-[var(--text-main)]'
        )}
      >
        <CalendarDays size={16} />
        Personalizado
      </button>
    </div>
  )
}
