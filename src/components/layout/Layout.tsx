import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { X } from 'lucide-react'

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-base)]">
      {/* Sidebar — desktop */}
      <Sidebar className="hidden md:flex" />

      {/* Gaveta mobile */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Painel da gaveta */}
          <div className="relative z-10 h-full flex flex-col animate-slideInLeft">
            {/* Botão fechar */}
            <button
              type="button"
              aria-label="Fechar menu"
              className="absolute top-4 -right-10 p-2 bg-[var(--bg-sidebar)] text-white rounded-r-[8px] border border-[var(--sidebar-border)] border-l-0"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={18} />
            </button>

            <Sidebar
              className="flex border-r-0"
              onNavigate={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
