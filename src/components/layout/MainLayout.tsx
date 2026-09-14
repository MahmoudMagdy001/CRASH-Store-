import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const MainLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false)
  const location = useLocation()
  const isPosPage = location.pathname === '/pos'

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false)
      }
    }
    if (mobileSidebarOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen])

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-x-hidden">
      {/* Desktop Sidebar (hidden on mobile, visible md+) */}
      <div className="hidden md:block shrink-0">
        <Sidebar className="sticky top-0 h-screen" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="قائمة التنقل الجانبية"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="relative z-10 w-64 max-w-[80vw] animate-in slide-in-from-right duration-200">
            <Sidebar
              className="h-full shadow-2xl"
              onCloseMobile={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main
          className={`flex-1 min-h-0 ${
            isPosPage ? 'p-3 lg:p-3.5 overflow-hidden' : 'p-4 lg:p-6 overflow-y-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
