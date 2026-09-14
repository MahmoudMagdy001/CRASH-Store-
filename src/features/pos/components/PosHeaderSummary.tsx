import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Package, Receipt, Wallet, RefreshCw } from 'lucide-react'
import { useAuth } from '@/features/auth/context/AuthContext'
import { getPosDailySummary } from '../api/posApi'
import { Button } from '@/components/ui/button'

export const PosHeaderSummary: React.FC = () => {
  const { isAdmin } = useAuth()
  const queryClient = useQueryClient()

  const { data: summary, isFetching, refetch } = useQuery({
    queryKey: ['pos-daily-summary'],
    queryFn: getPosDailySummary,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refresh every minute automatically
  })

  const handleRefresh = async () => {
    await refetch()
    // Signal PosPage to refresh its products/catalog as well
    window.dispatchEvent(new CustomEvent('pos-refresh'))
    queryClient.invalidateQueries({ queryKey: ['pos-products'] })
  }

  const data = summary || {
    total_sales: 0,
    total_cost: 0,
    total_expenses: 0,
    net_profit: 0,
    is_admin: isAdmin,
  }

  return (
    <div className="hidden md:flex items-center gap-2 lg:gap-2.5 animate-in fade-in duration-200">
      {/* 1. Today's Sales (Selling Price) */}
      <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl shrink-0">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="leading-tight">
          <p className="text-[9px] text-muted-foreground font-semibold">مبيعات اليوم (البيع)</p>
          <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {data.total_sales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
            <span className="text-[9px] font-normal">ج.م</span>
          </p>
        </div>
      </div>

      {/* 2. Cost / Purchases (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-xl shrink-0">
          <Package className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="leading-tight">
            <p className="text-[9px] text-muted-foreground font-semibold">سعر الشراء (التكلفة)</p>
            <p className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono">
              {data.total_cost.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-[9px] font-normal">ج.م</span>
            </p>
          </div>
        </div>
      )}

      {/* 3. Expenses (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl shrink-0">
          <Receipt className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="leading-tight">
            <p className="text-[9px] text-muted-foreground font-semibold">المصروفات</p>
            <p className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
              {data.total_expenses.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-[9px] font-normal">ج.م</span>
            </p>
          </div>
        </div>
      )}

      {/* 4. Net Profit (Admin Only) */}
      {isAdmin && (
        <div
          className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl shrink-0 ${
            data.net_profit >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          <Wallet className="h-3.5 w-3.5 shrink-0" />
          <div className="leading-tight">
            <p className="text-[9px] text-muted-foreground font-semibold">الصافي (الأرباح)</p>
            <p className="text-xs font-black font-mono">
              {data.net_profit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-[9px] font-normal">ج.م</span>
            </p>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRefresh}
        disabled={isFetching}
        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-lg"
        title="تحديث الإحصائيات والمنتجات"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
