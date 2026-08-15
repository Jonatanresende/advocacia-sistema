import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative bg-[var(--bg-card)] border border-[var(--border-card)] rounded-modal w-full max-w-lg animate-scaleIn"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-card)]">
          {title && (
            <h3 className="text-[17px] font-bold text-[var(--text-main)] font-display tracking-tight">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-[8px] hover:bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 max-h-[80vh] overflow-y-auto text-[var(--text-main)]">
          {children}
        </div>
      </div>
    </div>
  )
}
