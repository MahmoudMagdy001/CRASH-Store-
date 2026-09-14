import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  getAdminDashboardMetrics,
  getBestSellingProducts,
  getLowStockProducts,
} from '../api/dashboardApi'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  Users,
  BarChart3,
  Plus,
  RefreshCw,
  Sparkles,
  Trophy,
  ArrowUpRight,
  Boxes,
  Gamepad2,
} from 'lucide-react'

type MetricPeriod = 'today' | 'week' | 'month' | 'all_time'

export const DashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<MetricPeriod>('today')
  const [bestSellingDays, setBestSellingDays] = useState<number>(30)

  // Fetch Dashboard Metrics
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
    isFetching,
  } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: getAdminDashboardMetrics,
    staleTime: 1000 * 60 * 2, // 2 mins
  })

  // Fetch Best Selling Products
  const { data: bestSellers = [], isLoading: isLoadingBestSellers } = useQuery({
    queryKey: ['admin-best-sellers', bestSellingDays],
    queryFn: () => getBestSellingProducts(5, bestSellingDays),
    staleTime: 1000 * 60 * 5,
  })

  // Fetch Low Stock Products
  const { data: lowStockProducts = [], isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['admin-low-stock'],
    queryFn: () => getLowStockProducts(6),
    staleTime: 1000 * 60 * 2,
  })

  const periodLabel = {
    today: 'اليوم',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    all_time: 'كل الأوقات',
  }[period]

  const currentSales = metrics?.sales[period] || 0
  const currentCogs = metrics?.cogs[period] || 0
  const currentExpenses = metrics?.expenses[period] || 0
  const currentNetProfit = metrics?.net_profit[period] || 0
  const currentInvoices =
    period === 'today'
      ? metrics?.sales.invoices_today
      : period === 'month'
      ? metrics?.sales.invoices_month
      : undefined

  const profitMargin =
    currentSales > 0 ? ((currentNetProfit / currentSales) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Gamepad2 className="h-7 w-7 text-primary" />
            <span>لوحة التحكم الرئيسية</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            متابعة المبيعات المباشرة، الأرباح الصافية، أداء المخزون، والديون
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector tabs */}
          <div className="bg-muted/50 p-1 rounded-xl border border-border flex items-center gap-1 text-xs">
            {(
              [
                { key: 'today', label: 'اليوم' },
                { key: 'week', label: 'الأسبوع' },
                { key: 'month', label: 'الشهر' },
                { key: 'all_time', label: 'الكل' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  period === item.key
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMetrics()}
            disabled={isFetching}
            className="gap-1.5 h-9"
            title="تحديث البيانات"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>

          <Link to="/pos">
            <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground font-bold shadow-xs h-9">
              <ShoppingCart className="h-4 w-4" />
              <span>شاشة الكاشير (POS)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary Financial KPIs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 rounded-r" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              إجمالي المبيعات ({periodLabel})
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {isLoadingMetrics ? (
                <div className="h-7 bg-muted animate-pulse rounded w-32" />
              ) : (
                `${currentSales.toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ج.م`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Receipt className="h-3 w-3" />
              <span>
                {currentInvoices !== undefined
                  ? `${currentInvoices} فاتورة بيع مسجلة`
                  : 'إجمالي إيراد الفواتير'}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Cost of Goods Sold (COGS) */}
        <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <div className="absolute top-0 right-0 w-2 h-full bg-blue-500 rounded-r" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              تكلفة البضاعة المباعة ({periodLabel})
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tracking-tight text-foreground">
              {isLoadingMetrics ? (
                <div className="h-7 bg-muted animate-pulse rounded w-32" />
              ) : (
                `${currentCogs.toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ج.م`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              تكلفة شراء الأصناف التي تم بيعها
            </p>
          </CardContent>
        </Card>

        {/* Operating Expenses */}
        <Card className="relative overflow-hidden border-border/80 bg-gradient-to-br from-card to-muted/20 shadow-sm">
          <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 rounded-r" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              المصروفات التشغيلية ({periodLabel})
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono tracking-tight text-rose-600 dark:text-rose-400">
              {isLoadingMetrics ? (
                <div className="h-7 bg-muted animate-pulse rounded w-32" />
              ) : (
                `${currentExpenses.toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ج.م`
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              إيجار، كهرباء، صيانة ونثريات
            </p>
          </CardContent>
        </Card>

        {/* Net Profit */}
        <Card className="relative overflow-hidden border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <div className="absolute top-0 right-0 w-2 h-full bg-emerald-600 rounded-r" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              صافي الربح الفعلي ({periodLabel})
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-black font-mono tracking-tight ${
                currentNetProfit >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-destructive'
              }`}
            >
              {isLoadingMetrics ? (
                <div className="h-7 bg-muted animate-pulse rounded w-32" />
              ) : (
                `${currentNetProfit.toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ج.م`
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                هامش ربح: {profitMargin}%
              </span>
              <span className="text-[10px] text-muted-foreground">
                (المبيعات − التكلفة − المصروفات)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory & Quick Status Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-3.5 flex items-center justify-between border-border bg-card">
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي المنتجات المسجلة</p>
            <p className="text-lg font-black text-foreground mt-0.5">
              {metrics?.inventory.total_products || 0} صنف
            </p>
            <p className="text-[10px] text-muted-foreground">
              {metrics?.inventory.total_stock_units || 0} قطعة متوفرة بالمخزن
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between border-amber-500/30 bg-amber-500/5">
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              تنبيهات نواقص المخزون
            </p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5">
              {metrics?.inventory.low_stock_count || 0} قارب على النفاد
            </p>
            <p className="text-[10px] text-amber-600/80">
              {metrics?.inventory.out_of_stock_count || 0} صنف منتهي تماماً
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between border-border bg-card">
          <div>
            <p className="text-xs text-muted-foreground font-medium">قيمة المخزون الحالي (شراء)</p>
            <p className="text-lg font-black font-mono text-foreground mt-0.5">
              {(metrics?.inventory.total_cost_value || 0).toLocaleString('ar-EG', {
                maximumFractionDigits: 0,
              })}{' '}
              ج.م
            </p>
            <p className="text-[10px] text-muted-foreground">
              القيمة البيعية المتوقعة:{' '}
              {(metrics?.inventory.total_retail_value || 0).toLocaleString('ar-EG', {
                maximumFractionDigits: 0,
              })}{' '}
              ج.م
            </p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <DollarSign className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-3.5 flex items-center justify-between border-border bg-card">
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي ديون العملاء (بالأجل)</p>
            <p className="text-lg font-black font-mono text-amber-700 dark:text-amber-400 mt-0.5">
              {(metrics?.debts.total_customer_debts || 0).toLocaleString('ar-EG', {
                maximumFractionDigits: 2,
              })}{' '}
              ج.م
            </p>
            <Link
              to="/customers"
              className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 mt-0.5"
            >
              <span>إدارة حسابات الديون</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Main Two Columns: Best Selling Products & Low Stock Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best Selling Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-black">المنتجات الأكثر مبيعاً</CardTitle>
                <p className="text-xs text-muted-foreground">
                  الأصناف الأعلى طلباً وتحقيقاً للأرباح في المتجر
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setBestSellingDays(7)}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  bestSellingDays === 7
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                7 أيام
              </button>
              <button
                type="button"
                onClick={() => setBestSellingDays(30)}
                className={`px-2 py-1 rounded font-bold transition-all ${
                  bestSellingDays === 30
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                30 يوم
              </button>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {isLoadingBestSellers ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : bestSellers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>لا توجد بيانات مبيعات كافية خلال هذه الفترة</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {bestSellers.map((item, index) => (
                  <div
                    key={item.product_id}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-muted/20 rounded-xl px-2 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          index === 0
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : index === 1
                            ? 'bg-slate-300 text-slate-900'
                            : index === 2
                            ? 'bg-amber-700/80 text-white'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="truncate">
                        <p className="font-bold text-xs text-foreground truncate">
                          {item.product_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.category_name} • متوفر حالياً: {item.current_quantity} قطعة
                        </p>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="font-black font-mono text-xs text-foreground block">
                        {item.total_units_sold} قطعة
                      </span>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ربح: {item.total_profit.toFixed(0)} ج.م
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-black">نواقص وتنبيهات المخزون</CardTitle>
                <p className="text-xs text-muted-foreground">
                  منتجات أوشكت على النفاد أو منتهية تماماً
                </p>
              </div>
            </div>

            <Link to="/purchases">
              <Button size="sm" variant="outline" className="gap-1 text-xs h-8">
                <Plus className="h-3.5 w-3.5" />
                <span>إذن توريد</span>
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="pt-0">
            {isLoadingLowStock ? (
              <div className="space-y-2 py-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : lowStockProducts.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                <Package className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                <p className="text-foreground font-bold">المخزون في حالة ممتازة!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  لا توجد أي أصناف أقل من حد الطلب حالياً
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {lowStockProducts.map((p) => {
                  const isOut = p.quantity <= 0
                  return (
                    <div
                      key={p.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-muted/20 rounded-xl px-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {p.categories?.name || 'بدون قسم'} • حد الأمان:{' '}
                          {p.min_quantity_alert || 0} قطعة
                        </p>
                      </div>

                      <div className="text-left shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black font-mono ${
                            isOut
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {isOut ? 'نفد تماماً (0)' : `${p.quantity} قطعة متبقية`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Footer */}
      <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border">
        <span>Crash Store ERP System • لوحة المراقبة الإدارية الحية</span>
        <div className="flex items-center gap-3">
          <Link to="/reports" className="text-primary hover:underline font-bold flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>عرض التقارير المحاسبية المفصلة</span>
          </Link>
          <span>•</span>
          <Link to="/sales" className="text-primary hover:underline font-bold flex items-center gap-1">
            <Receipt className="h-3.5 w-3.5" />
            <span>سجل فواتير المبيعات</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
