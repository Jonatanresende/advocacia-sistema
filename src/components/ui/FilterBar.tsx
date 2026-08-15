import { CalendarDays } from 'lucide-react'
import clsx from 'clsx'
import type { FilterPreset, DateFilter } from '../../types'

interface FilterBarProps {
  filter: DateFilter
  onChange: (filter: DateFilter) => void
}

const presets: { id: FilterPreset; label: string }[] = [
  { id: 'hoje',           label: 'Hoje' },
  { id: 'ontem',          label: 'Ontem' },
  { id: 'ultimos_7_dias', label: 'Últ. 7 dias' },
  { id: 'ultimos_14_dias',label: 'Últ. 14 dias' },
  { id: 'este_mes',       label: 'Este mês' },
  { id: 'mes_passado',    label: 'Mês passado' },
  { id: 'este_ano',       label: 'Este ano' },
]

export default function FilterBar({ filter, onChange }: FilterBarProps) {
  const handlePresetClick = (preset: FilterPreset) => {
    onChange({ preset, startDate: '', endDate: '' })
  }

  return (
    <div className="flex flex-wrap gap-1.5 mb-5 items-center">
      {presets.map((preset) => {
        const isActive = filter.preset === preset.id
        return (
          <button
            key={preset.id}
            onClick={() => handlePresetClick(preset.id)}
            className={clsx(
              'px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all duration-150',
              isActive
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] border border-transparent hover:border-[var(--border-card)]'
            )}
          >
            {preset.label}
          </button>
        )
      })}

      <div className="h-5 w-px bg-[var(--border-card)] mx-1 hidden sm:block" />

      <button
        onClick={() => handlePresetClick('personalizado')}
        className={clsx(
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-[8px] transition-all duration-150',
          filter.preset === 'personalizado'
            ? 'bg-[var(--primary)] text-white shadow-sm'
            : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] border border-transparent hover:border-[var(--border-card)]'
        )}
      >
        <CalendarDays size={14} />
        Personalizado
      </button>
    </div>
  )
}
