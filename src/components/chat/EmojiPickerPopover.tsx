import { useEffect, useRef } from 'react'
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react'

interface EmojiPickerPopoverProps {
  isOpen: boolean
  onClose: () => void
  onEmojiSelect: (emoji: string) => void
}

export default function EmojiPickerPopover({
  isOpen,
  onClose,
  onEmojiSelect,
}: EmojiPickerPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Delay curto para evitar que o clique de abertura feche o popover imediatamente
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }, 10)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Verifica tema escuro
  const isDarkMode =
    document.documentElement.classList.contains('dark') ||
    document.body.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches

  return (
    <div
      ref={containerRef}
      className="absolute bottom-14 left-2 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[var(--border-card)] animate-fadeIn bg-[var(--bg-card)]"
      style={{ maxHeight: '420px' }}
    >
      <EmojiPicker
        onEmojiClick={(emojiData) => {
          onEmojiSelect(emojiData.emoji)
        }}
        theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
        emojiStyle={EmojiStyle.NATIVE}
        searchPlaceHolder="Buscar emoji..."
        width={330}
        height={380}
        lazyLoadEmojis={true}
        previewConfig={{ showPreview: false }}
      />
    </div>
  )
}
