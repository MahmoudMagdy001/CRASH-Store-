import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LogOut, User, Menu } from 'lucide-react'
import { PosHeaderSummary } from '@/features/pos/components/PosHeaderSummary'

interface HeaderProps {
  onToggleMobileSidebar?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar }) => {
  const { user, profile, signOut, isAdmin } = useAuth()
  const location = useLocation()
  const isPosPage = location.pathname === '/pos'

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'المستخدم'

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
      {/* Right side (in RTL, this is the start) */}
      <div className="flex items-center gap-3 shrink-0">
        {onToggleMobileSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMobileSidebar}
            className="md:hidden"
            aria-label="القائمة"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="hidden sm:block">
          <h1 className="text-sm font-semibold text-foreground">
            {isAdmin ? 'لوحة التحكم والإدارة' : 'نقطة البيع السريعة'}
          </h1>
        </div>
      </div>

      {/* Center: POS Daily Financial Summary (فوق بين القسمين اللي ع الأطراف) */}
      {isPosPage && <PosHeaderSummary />}

      {/* Left side (in RTL, this is the end) */}
      <div className="flex items-center gap-3 shrink-0">
        {/* User Profile Info */}
        <div className="flex items-center gap-2.5 bg-accent/50 px-3 py-1.5 rounded-full border border-border/50">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{displayName}</span>
            <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-[10px] px-2 py-0.2">
              {isAdmin ? 'مدير النظام' : 'كاشير'}
            </Badge>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut()}
          className="gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
          title="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">خروج</span>
        </Button>
      </div>
    </header>
  )
}
