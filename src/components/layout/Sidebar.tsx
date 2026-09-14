import React from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/useAuth'
import { getStoreSettings } from '@/features/settings/api/settingsApi'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Truck,
  History,
  WalletCards,
  BarChart3,
  Settings,
  Store,
  Users,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    label: 'لوحة التحكم',
    to: '/',
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    label: 'نقطة البيع (POS)',
    to: '/pos',
    icon: ShoppingCart,
  },
  {
    label: 'المنتجات',
    to: '/products',
    icon: Package,
    adminOnly: true,
  },
  {
    label: 'التصنيفات',
    to: '/categories',
    icon: FolderTree,
    adminOnly: true,
  },
  {
    label: 'المشتريات والموردين',
    to: '/purchases',
    icon: Truck,
    adminOnly: true,
  },
  {
    label: 'سجل المبيعات',
    to: '/sales',
    icon: History,
  },
  {
    label: 'العملاء والديون',
    to: '/customers',
    icon: Users,
  },
  {
    label: 'المصروفات',
    to: '/expenses',
    icon: WalletCards,
  },
  {
    label: 'التقارير المالية',
    to: '/reports',
    icon: BarChart3,
    adminOnly: true,
  },
  {
    label: 'الإعدادات والمستخدمين',
    to: '/settings',
    icon: Settings,
    adminOnly: true,
  },
]

interface SidebarProps {
  className?: string
  onCloseMobile?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onCloseMobile }) => {
  const { isAdmin } = useAuth()

  const { data: storeSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
    staleTime: 1000 * 60 * 5,
  })

  const storeName = storeSettings?.store_name || 'Crash Store'
  const logoUrl = storeSettings?.logo_url || '/logo.webp'

  // Cashier only sees non-admin items (POS)
  const visibleNavItems = navItems.filter((item) => (item.adminOnly ? isAdmin : true))

  return (
    <aside
      className={cn(
        'w-64 border-l border-border bg-card flex flex-col h-full select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        {logoUrl ? (
          <div className="h-9 w-9 rounded-lg bg-background border border-border/80 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
            <img src={logoUrl} alt={storeName} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm shrink-0">
            <Store className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-base text-foreground leading-tight truncate" title={storeName}>
            {storeName}
          </h2>
          <p className="text-xs text-muted-foreground truncate">نظام المبيعات المتكامل</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
        {visibleNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">متجر كراش v1.0.0</p>
      </div>
    </aside>
  )
}
