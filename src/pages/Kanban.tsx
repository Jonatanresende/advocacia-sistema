import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import type {
  DragEndEvent,
  DragStartEvent,
  DropAnimation
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Badge, { areaPrevidenciariaLabels } from '../components/ui/Badge'
import { useLeads } from '../hooks/useLeads'
import type { LeadAdv, LeadStatus } from '../types'
import { format } from 'date-fns'

const COLUNAS: { id: LeadStatus; title: string; desc: string; color: string }[] = [
  { id: 'novo_contato',      title: 'Novo Contato',    desc: 'Acabou de entrar',       color: '#3B82F6' },
  { id: 'conversando',       title: 'Conversando',      desc: 'Em atendimento',          color: '#F59E0B' },
  { id: 'consulta_agendada', title: 'Agendada',         desc: 'Consulta marcada',        color: '#8B5CF6' },
  { id: 'confirmado',        title: 'Confirmado',       desc: 'Presença confirmada',     color: '#10B981' },
  { id: 'compareceu',        title: 'Compareceu',       desc: 'Virou cliente',           color: '#06B6D4' },
  { id: 'follow_up',         title: 'Follow Up',        desc: 'Aguardando',             color: '#F97316' },
  { id: 'fechado',           title: 'Fechado',          desc: 'Contrato fechado',        color: '#22C55E' },
  { id: 'perdido',           title: 'Perdido',          desc: 'Desistiu',               color: '#EF4444' },
]

// Dias parado em 'compareceu' sem decisão (fechado/perdido) até disparar o alerta visual
const DIAS_ALERTA_DECISAO = 5

function diasParadoNoStatus(lead: LeadAdv): number {
  if (!lead.status_atualizado_em) return 0
  const diffMs = Date.now() - new Date(lead.status_atualizado_em).getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function SortableItem({ lead }: { lead: LeadAdv }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: lead })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const dias = diasParadoNoStatus(lead)
  const precisaDecisao = lead.status === 'compareceu' && dias >= DIAS_ALERTA_DECISAO

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group bg-[var(--bg-card)] rounded-[10px] p-3.5 cursor-grab active:cursor-grabbing mb-2.5
        border transition-all duration-150
        hover:shadow-[var(--shadow-elevated)] hover:-translate-y-px
        ${precisaDecisao
          ? 'border-[var(--danger)] shadow-[0_0_0_2px_rgba(239,68,68,0.15)]'
          : 'border-[var(--border-card)] shadow-[var(--shadow-card)]'
        }
      `}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <span className="font-semibold text-[13px] text-[var(--text-main)] truncate">
          {lead.nome_lead || lead.whatsapp_lead}
        </span>
        <Badge status={lead.status} />
      </div>

      <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 mb-2 leading-relaxed">
        {lead.motivo_contato || 'Sem motivo informado'}
      </p>

      {lead.area_previdenciaria && lead.area_previdenciaria !== 'nao_identificada' && (
        <span className="inline-block text-[10.5px] px-2 py-0.5 rounded-full bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-muted)] mb-2">
          {areaPrevidenciariaLabels[lead.area_previdenciaria]}
        </span>
      )}

      {precisaDecisao && (
        <p className="text-[11px] text-[var(--danger)] font-semibold mb-1 flex items-center gap-1">
          ⚠️ {dias} dias sem decisão
        </p>
      )}

      <span className="text-[10.5px] text-[var(--text-muted)] block text-right mt-1">
        {lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM HH:mm') : ''}
      </span>
    </div>
  )
}

function Column({
  id,
  title,
  desc,
  leads,
  color,
}: {
  id: LeadStatus
  title: string
  desc: string
  leads: LeadAdv[]
  color: string
}) {
  const { setNodeRef } = useSortable({ id: `col-${id}`, data: { type: 'Column', id } })

  return (
    <div
      className="bg-[var(--bg-base)] rounded-[12px] border border-[var(--border-card)] flex flex-col w-[280px] shrink-0 max-h-full"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* Cabeçalho da coluna */}
      <div className="px-3 pt-3 pb-2.5 border-b border-[var(--border-card)]">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-2">
            {/* Indicador de cor da coluna */}
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <h3 className="font-bold text-[13px] text-[var(--text-main)] font-display">{title}</h3>
          </div>
          <span
            className="text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${color}18`,
              color: color,
            }}
          >
            {leads.length}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] ml-4">{desc}</p>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2 overflow-y-auto" ref={setNodeRef}>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableItem key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="min-h-[80px] flex items-center justify-center p-4 border-2 border-dashed border-[var(--border-card)] rounded-[10px] text-[var(--text-muted)] text-[11px] text-center mt-1">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  )
}

export default function Kanban() {
  const { leads, isLoading, refetch, updateLeadStatus } = useLeads()
  const [localLeads, setLocalLeads] = useState<LeadAdv[]>([])

  const [activeLead, setActiveLead] = useState<LeadAdv | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; newStatus: LeadStatus } | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setLocalLeads(leads)
    }
  }, [leads, isLoading])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const found = localLeads.find(l => l.id === event.active.id)
    if (found) setActiveLead(found)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveLead(null)

    if (!over) return

    const found = localLeads.find(l => l.id === active.id)
    if (!found) return

    let overStatus: LeadStatus | null = null
    if (String(over.id).startsWith('col-')) {
      overStatus = String(over.id).replace('col-', '') as LeadStatus
    } else {
      const overLead = localLeads.find(l => l.id === over.id)
      if (overLead) overStatus = overLead.status
    }

    if (overStatus && overStatus !== found.status) {
      setLocalLeads(prev => prev.map(l => l.id === found.id ? { ...l, status: overStatus as LeadStatus } : l))

      if (overStatus === 'compareceu') {
        setPendingUpdate({ id: found.id, newStatus: overStatus })
        setIsModalOpen(true)
      } else {
        await updateLeadStatus(found.id, overStatus)
      }
    }
  }

  const confirmUpdate = async () => {
    if (!pendingUpdate) return
    setIsUpdating(true)
    await updateLeadStatus(pendingUpdate.id, pendingUpdate.newStatus)
    setIsUpdating(false)
    setIsModalOpen(false)
    setPendingUpdate(null)
    refetch()
  }

  const cancelUpdate = () => {
    setIsModalOpen(false)
    setPendingUpdate(null)
    setLocalLeads(leads)
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Kanban"
          description="Visualize e gerencie o avanço de cada lead pelo funil de atendimento. Arraste os cards entre as etapas."
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]" />
        </div>
      ) : (
        // Wrapper com scroll horizontal e fading masks nos lados
        <div className="relative flex-1 overflow-hidden">
          {/* Fading esquerdo */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-[var(--bg-base)] to-transparent" />
          {/* Fading direito */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-l from-[var(--bg-base)] to-transparent" />

          <div className="h-full overflow-x-auto overflow-y-hidden pb-4">
            <div className="flex gap-3 h-full px-2 min-w-max">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                {COLUNAS.map(col => (
                  <Column
                    key={col.id}
                    id={col.id}
                    title={col.title}
                    desc={col.desc}
                    color={col.color}
                    leads={localLeads.filter(l => l.status === col.id)}
                  />
                ))}

                <DragOverlay dropAnimation={dropAnimation}>
                  {activeLead ? (
                    <div className="bg-[var(--bg-card)] border border-[var(--primary)]/40 rounded-[10px] p-3.5 shadow-[var(--shadow-modal)] w-[260px] opacity-95">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <span className="font-semibold text-[13px] text-[var(--text-main)] truncate">
                          {activeLead.nome_lead || activeLead.whatsapp_lead}
                        </span>
                        <Badge status={activeLead.status} />
                      </div>
                      <p className="text-[12px] text-[var(--text-muted)] line-clamp-2">
                        {activeLead.motivo_contato}
                      </p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={cancelUpdate} title="Promover a Cliente">
        <p className="text-[var(--text-main)] text-[14px] mb-6 leading-relaxed">
          Ao confirmar, este lead será promovido a <strong>cliente</strong> automaticamente. Essa ação pode ser revertida movendo o card para outro status.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={cancelUpdate} disabled={isUpdating}>Cancelar</Button>
          <Button variant="primary" onClick={confirmUpdate} isLoading={isUpdating}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  )
}
