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

const COLUNAS: { id: LeadStatus; title: string; desc: string }[] = [
  { id: 'novo_contato', title: 'Novo Contato', desc: 'Acabou de entrar' },
  { id: 'conversando', title: 'Conversando', desc: 'Em atendimento' },
  { id: 'consulta_agendada', title: 'Agendada', desc: 'Consulta marcada' },
  { id: 'compareceu', title: 'Compareceu', desc: 'Virou cliente' },
  { id: 'follow_up', title: 'Follow Up', desc: 'Aguardando' },
  { id: 'fechado', title: 'Fechado', desc: 'Contrato fechado' },
  { id: 'perdido', title: 'Perdido', desc: 'Desistiu' },
]

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
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-[var(--bg-card)] border border-[var(--border-card)] rounded-[12px] p-3.5 shadow-sm hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-shadow cursor-grab active:cursor-grabbing mb-3 group"
    >
      <div className="flex justify-between items-start mb-2.5">
        <span className="font-semibold text-[13px] text-[var(--text-main)] truncate block mr-2 group-hover:text-[var(--accent)] transition-colors">
          {lead.nome_lead || lead.whatsapp_lead}
        </span>
        <Badge status={lead.status} />
      </div>
      <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
        {lead.motivo_contato || 'Sem motivo informado'}
      </p>
      
      <div className="flex items-center justify-between mt-auto pt-1">
        {lead.area_previdenciaria && lead.area_previdenciaria !== 'nao_identificada' ? (
          <span className="inline-block text-[10px] font-medium px-2 py-1 rounded-[6px] bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-muted)]">
            {areaPrevidenciariaLabels[lead.area_previdenciaria]}
          </span>
        ) : <span />}
        <span className="text-[10px] text-[var(--text-muted)] font-medium bg-[var(--bg-base)] border border-[var(--border-card)] px-1.5 py-0.5 rounded-[6px]">
          {lead.inicio_atendimento ? format(new Date(lead.inicio_atendimento), 'dd/MM HH:mm') : ''}
        </span>
      </div>
    </div>
  )
}

function Column({ id, title, desc, leads }: { id: LeadStatus; title: string; desc: string; leads: LeadAdv[] }) {
  const { setNodeRef } = useSortable({ id: `col-${id}`, data: { type: 'Column', id } })

  return (
    <div className="bg-[var(--bg-base)] rounded-[14px] border border-[var(--border-card)] flex flex-col w-[310px] shrink-0 max-h-full">
      <div className="p-4 border-b border-[var(--border-card)]">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="font-semibold text-[var(--text-main)] text-[15px] font-display">{title}</h3>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] bg-[var(--bg-card)] px-2.5 py-1 rounded-[8px] border border-[var(--border-card)]">
            {leads.length}
          </span>
        </div>
        <p className="text-[12px] text-[var(--text-muted)]">{desc}</p>
      </div>

      <div className="flex-1 p-3 overflow-y-auto" ref={setNodeRef}>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableItem key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="min-h-[100px] flex items-center justify-center p-4 border-2 border-dashed border-[var(--border-card)] rounded-[12px] text-[var(--text-muted)] text-[12px] font-medium text-center opacity-70">
            Arraste um lead para cá
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 flex gap-4">
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
                leads={localLeads.filter(l => l.status === col.id)}
              />
            ))}

            <DragOverlay dropAnimation={dropAnimation}>
              {activeLead ? (
                <div className="bg-[var(--bg-card)] border-[2px] border-[var(--accent)] rounded-[12px] p-3.5 shadow-2xl w-[310px] opacity-90 scale-105">
                  <div className="flex justify-between items-start mb-2.5">
                    <span className="font-semibold text-[13px] text-[var(--text-main)] truncate block mr-2">
                      {activeLead.nome_lead || activeLead.whatsapp_lead}
                    </span>
                    <Badge status={activeLead.status} />
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{activeLead.motivo_contato}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={cancelUpdate} title="Promover a Cliente">
        <p className="text-[var(--text-muted)] text-[14px] mb-6 leading-relaxed">
          Ao confirmar, este lead será promovido a <strong className="text-[var(--accent)] font-semibold">cliente</strong> automaticamente. Essa ação pode ser revertida movendo o card para outro status.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={cancelUpdate} disabled={isUpdating}>Cancelar</Button>
          <Button variant="primary" onClick={confirmUpdate} isLoading={isUpdating}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  )
}
