import React, { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import {
  getFinancialReport,
  getCashiersList,
} from '../api/reportsApi'
import { getStoreSettings } from '@/features/pos/api/posApi'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  BarChart3,
  User,
  Users,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Clock,
  Sparkles,
  Layers,
  RotateCcw,
  Package,
  Calendar,
} from 'lucide-react'

type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

export const ReportsPage: React.FC = () => {
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedCashier, setSelectedCashier] = useState<string>('all')

  const printReportRef = useRef<HTMLDivElement>(null)

  const handlePrintReport = useReactToPrint({
    contentRef: printReportRef,
    documentTitle: `Crash-Store-Financial-Report-${new Date().toISOString().slice(0, 10)}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background: white !important;
          color: #0f172a !important;
        }
      }
    `,
  })

  // Calculate start/end date strings based on preset
  const { filterStart, filterEnd } = useMemo(() => {
    const now = new Date()
    if (periodPreset === 'today') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      return { filterStart: s.toISOString(), filterEnd: null }
    }
    if (periodPreset === 'week') {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday or start
      const s = new Date(now.setDate(diff))
      s.setHours(0, 0, 0, 0)
      return { filterStart: s.toISOString(), filterEnd: null }
    }
    if (periodPreset === 'month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      return { filterStart: s.toISOString(), filterEnd: null }
    }
    if (periodPreset === 'year') {
      const s = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      return { filterStart: s.toISOString(), filterEnd: null }
    }
    if (periodPreset === 'custom') {
      const s = startDate ? new Date(startDate + 'T00:00:00Z').toISOString() : null
      const e = endDate ? new Date(endDate + 'T23:59:59Z').toISOString() : null
      return { filterStart: s, filterEnd: e }
    }
    return { filterStart: null, filterEnd: null }
  }, [periodPreset, startDate, endDate])

  // Fetch Cashiers List for dropdown
  const { data: cashiers = [] } = useQuery({
    queryKey: ['report-cashiers'],
    queryFn: getCashiersList,
    staleTime: 1000 * 60 * 10,
  })

  // Fetch Store Settings for printed report header
  const { data: storeSettings } = useQuery({
    queryKey: ['report-store-settings'],
    queryFn: getStoreSettings,
    staleTime: 1000 * 60 * 10,
  })

  // Fetch Financial Report Data
  const {
    data: reportData,
    isLoading: isLoadingReport,
    refetch: refetchReport,
    isFetching,
    error: reportError,
  } = useQuery({
    queryKey: ['financial-report', filterStart, filterEnd, selectedCashier],
    queryFn: () =>
      getFinancialReport({
        startDate: filterStart,
        endDate: filterEnd,
        cashierId: selectedCashier === 'all' ? null : selectedCashier,
      }),
    staleTime: 1000 * 60 * 2,
  })

  const summary = reportData?.summary
  const totalSales = Number(summary?.total_sales || 0)
  const grossSales = Number(summary?.gross_sales || (totalSales + Number(summary?.total_returns || 0)))
  const totalReturns = Number(summary?.total_returns || 0)
  const totalPaid = Number(summary?.total_paid || 0)
  const totalRemaining = Number(summary?.total_remaining || 0)
  const totalDiscounts = Number(summary?.total_discounts || 0)
  const invoicesCount = Number(summary?.invoices_count || 0)
  const activeInvoicesCount = Number(
    summary?.active_invoices_count ?? (invoicesCount - Number(summary?.returned_invoices_count || 0))
  )
  const returnedInvoicesCount = Number(summary?.returned_invoices_count || 0)
  const cogs = Number(summary?.cogs || 0)
  const grossCogs = Number(summary?.gross_cogs || cogs)
  const returnedCogs = Number(summary?.returned_cogs || 0)
  const expenses = Number(summary?.expenses || 0)
  const purchases = Number(summary?.purchases || 0)
  const grossProfit = Number(summary?.gross_profit || (totalSales - cogs))
  const netProfit = Number(summary?.net_profit || (grossProfit - expenses))
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0'
  const averageInvoice = activeInvoicesCount > 0 ? totalSales / activeInvoicesCount : 0
  const collectionRate = totalSales > 0 ? ((totalPaid / totalSales) * 100).toFixed(1) : '0'
  const creditRate = totalSales > 0 ? ((totalRemaining / totalSales) * 100).toFixed(1) : '0'

  const selectedCashierName =
    selectedCashier === 'all'
      ? 'جميع الكاشيرات'
      : cashiers.find((c) => c.id === selectedCashier)?.full_name || 'كاشير محدد'

  const periodLabel = {
    today: 'اليوم',
    week: 'هذا الأسبوع',
    month: 'هذا الشهر',
    year: 'هذه السنة',
    all: 'كل الأوقات',
    custom: startDate && endDate ? `من ${startDate} إلى ${endDate}` : 'فترة مخصصة',
  }[periodPreset]

  const storeName = storeSettings?.store_name || 'Crash Store (كراش ستور)'
  const storePhone = storeSettings?.phone || ''
  const currentDateFormatted = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span>التقارير المالية والمحاسبية التفصيلية</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            تقرير تفصيلي لحركة المبيعات، المرتجعات، المحصل الفعلي، الديون الآجلة، تكلفة البضاعة، والأرباح
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchReport()}
            disabled={isFetching}
            className="gap-1.5 h-9 font-bold"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث التقرير</span>
          </Button>

          <Button
            onClick={() => handlePrintReport()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs h-9"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة التقرير (A4 / PDF)</span>
          </Button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <Card className="p-4 bg-card border-border/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-muted-foreground ml-1">الفترة:</span>
            {(
              [
                { key: 'today', label: 'اليوم' },
                { key: 'week', label: 'هذا الأسبوع' },
                { key: 'month', label: 'هذا الشهر' },
                { key: 'year', label: 'هذه السنة' },
                { key: 'all', label: 'الكل' },
                { key: 'custom', label: 'تاريخ مخصص' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriodPreset(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  periodPreset === item.key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Cashier Filter & Custom Date Inputs */}
          <div className="flex items-center gap-2 flex-wrap">
            {periodPreset === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-36 font-mono"
                  title="من تاريخ"
                />
                <span className="text-muted-foreground">إلى</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-36 font-mono"
                  title="إلى تاريخ"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 w-52">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="h-8 text-xs font-bold"
              >
                <option value="all">كل الكاشيرات</option>
                {cashiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.role === 'admin' ? 'مدير' : 'كاشير'})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Alert if fetching failed */}
      {reportError && (
        <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="space-y-1">
            <span className="font-black text-sm block">تعذر تحميل بيانات التقرير المالي من قاعدة البيانات:</span>
            <span className="font-mono text-[11px] block text-foreground/80">{(reportError as Error).message}</span>
            <span className="text-[11px] text-muted-foreground block">
              يرجى التأكد من تشغيل ملف التحديثات الأخير (012_update_financial_reports_accounting.sql) في Supabase SQL Editor.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchReport()}
            className="bg-card text-foreground shrink-0 font-bold h-8 text-xs"
          >
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Empty State Banner if no sales in this period */}
      {!isLoadingReport && !reportError && invoicesCount === 0 && (
        <div className="p-6 text-center border border-dashed border-border rounded-2xl bg-card/60 space-y-2">
          <p className="text-sm font-bold text-foreground">لا توجد عمليات بيع مسجلة خلال فترة ({periodLabel})</p>
          <p className="text-xs text-muted-foreground">
            يمكنك الضغط على خيار{' '}
            <button
              type="button"
              onClick={() => setPeriodPreset('all')}
              className="text-primary font-bold underline hover:opacity-80 mx-1"
            >
              الكل
            </button>{' '}
            لعرض إجمالي كل الفواتير والمبيعات المسجلة منذ بداية إنشاء النظام.
          </p>
        </div>
      )}

      {/* Accounting Reconciliation Ribbon */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground">
              صافي المبيعات (
              <strong className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalSales)}
              </strong>
              ) =
            </span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              المحصل الفعلي (
              <strong className="font-mono">{formatCurrency(totalPaid)}</strong>)
            </span>
            <span className="text-muted-foreground">+</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              المبيعات الآجلة (
              <strong className="font-mono">{formatCurrency(totalRemaining)}</strong>)
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-muted-foreground font-medium text-[11px] flex-wrap">
            <span>
              الإجمالي قبل الإرجاع:{' '}
              <strong className="text-foreground font-mono">{formatCurrency(grossSales)}</strong>
            </span>
            <span>−</span>
            <span>
              المرتجع:{' '}
              <strong className="text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(totalReturns)}
              </strong>
            </span>
            <span>|</span>
            <span>
              الفواتير:{' '}
              <strong className="text-foreground font-mono">{formatNumber(invoicesCount)}</strong> (
              <strong className="text-emerald-600 font-mono">{formatNumber(activeInvoicesCount)}</strong> نشطة،{' '}
              <strong className="text-rose-600 font-mono">{formatNumber(returnedInvoicesCount)}</strong> مسترجعة)
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid (8 Cards) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Net Sales */}
        <Card className="p-4 border-emerald-500/30 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">صافي المبيعات الفعلية</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>قبل الخصم والإرجاع:</span>
              <strong className="font-mono text-foreground">{formatCurrency(grossSales)}</strong>
            </div>
            <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
              <span>المرتجعات المخصومة:</span>
              <strong className="font-mono">− {formatCurrency(totalReturns)}</strong>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            فواتير نشطة: <strong className="text-foreground font-mono">{formatNumber(activeInvoicesCount)}</strong> (متوسط الفاتورة:{' '}
            <strong className="text-foreground font-mono">{formatCurrency(averageInvoice, { decimals: 0 })}</strong>)
          </p>
        </Card>

        {/* 2. Paid / Collected */}
        <Card className="p-4 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              المحصل الفعلي (كاش وبطاقة)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>نسبة التحصيل الفعلي:</span>
              <strong className="font-mono text-emerald-600 font-bold">{formatPercent(collectionRate)}</strong>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>حالة النقدية:</span>
              <span>موجود بالدرج والحساب البنكي</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            صافي مبالغ تم قبضها واستلامها بالفعل
          </p>
        </Card>

        {/* 3. Credit / Debts */}
        <Card className="p-4 border-amber-500/30 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              المبيعات الآجلة (ديون الفترة)
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-amber-600 dark:text-amber-400">
            {formatCurrency(totalRemaining)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>نسبة المبيعات الآجلة:</span>
              <strong className="font-mono text-amber-600 font-bold">{formatPercent(creditRate)}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>طبيعة المبلغ:</span>
              <span>مستحق على ذمة العملاء</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            يُحصّل لاحقاً من سجل حسابات العملاء
          </p>
        </Card>

        {/* 4. Returns */}
        <Card className="p-4 border-rose-500/30 bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              إجمالي المرتجعات المعتمدة
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-rose-600 dark:text-rose-400">
            {formatCurrency(totalReturns)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>فواتير مسترجعة كلياً:</span>
              <strong className="font-mono text-rose-600 font-bold">{formatNumber(returnedInvoicesCount)} فاتورة</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>الأثر المحاسبي:</span>
              <span className="text-emerald-600 font-medium">تم خصمها بالكامل</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            تخصم من المبيعات والمحصل وتسترجع للمخزون
          </p>
        </Card>

        {/* 5. COGS */}
        <Card className="p-4 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">صافي تكلفة البضاعة (COGS)</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {formatCurrency(cogs)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>تكلفة البضاعة الإجمالية:</span>
              <strong className="font-mono text-foreground">{formatCurrency(grossCogs)}</strong>
            </div>
            <div className="flex justify-between items-center text-blue-600 dark:text-blue-400">
              <span>تكلفة مرتجعة مستبعدة:</span>
              <strong className="font-mono">− {formatCurrency(returnedCogs)}</strong>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            مجمل الربح التجاري: <strong className="text-foreground font-mono">{formatCurrency(grossProfit)}</strong>
          </p>
        </Card>

        {/* 6. Operating Expenses */}
        <Card className="p-4 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">المصروفات التشغيلية والنثريات</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-rose-600 dark:text-rose-400">
            {formatCurrency(expenses)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>خصومات ممنوحة للعملاء:</span>
              <strong className="font-mono text-foreground">{formatCurrency(totalDiscounts)}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span>نوع الصرف:</span>
              <span>إيجار، كهرباء، ونثريات</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            تخصم مباشرة من مجمل الربح
          </p>
        </Card>

        {/* 7. Purchases */}
        <Card className="p-4 border-border bg-card shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">المشتريات وتوريد البضاعة</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {formatCurrency(purchases)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5 border-t border-border/60 pt-2">
            <div className="flex justify-between items-center">
              <span>أثر المشتريات:</span>
              <span className="text-indigo-600 font-semibold">زيادة رصيد المخزون</span>
            </div>
            <div className="flex justify-between items-center">
              <span>إعادة التوريد:</span>
              <span>فواتير مشتريات معتمدة</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-medium">
            قيمة البضاعة الجديدة التي تم شراؤها
          </p>
        </Card>

        {/* 8. Net Profit */}
        <Card className="p-4 border-emerald-500/40 bg-emerald-500/5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              صافي الأرباح الصافية
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-2 space-y-0.5 border-t border-emerald-500/30 pt-2 font-bold">
            <div className="flex justify-between items-center">
              <span>نسبة هامش الربح الصافي:</span>
              <strong className="font-mono">{formatPercent(profitMargin)}</strong>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span>المعادلة:</span>
              <span>المبيعات − التكلفة − المصروفات</span>
            </div>
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-2 font-medium">
            الربح الصافي الحقيقي القابل للتوزيع
          </p>
        </Card>
      </div>

      {/* Cashiers Performance & Payment Methods Two Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cashiers Performance Table (2 cols) */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  متابعة أداء ومبيعات الكاشيرات
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-medium">الفترة: {periodLabel}</span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoadingReport ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !reportData?.cashiers || reportData.cashiers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs font-medium">
                لا توجد عمليات بيع مسجلة لكاشيرات خلال هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                    <tr>
                      <th className="py-2.5 px-3">الكاشير</th>
                      <th className="py-2.5 px-3 text-center">الفواتير</th>
                      <th className="py-2.5 px-3">إجمالي المبيعات</th>
                      <th className="py-2.5 px-3 text-rose-600">المرتجع</th>
                      <th className="py-2.5 px-3 text-foreground font-black">صافي المبيعات</th>
                      <th className="py-2.5 px-3 text-emerald-600">المحصل الفعلي</th>
                      <th className="py-2.5 px-3 text-amber-600">الأجل (الديون)</th>
                      <th className="py-2.5 px-3 text-center">نسبة التحصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.cashiers.map((c) => {
                      const cNetSales = Number(c.total_sales || 0)
                      const cGrossSales = Number(c.gross_sales || cNetSales)
                      const cReturns = Number(c.returns_amount || 0)
                      const cPaid = Number(c.total_paid || 0)
                      const cRemaining = Number(c.total_remaining || 0)
                      const cRate = cNetSales > 0 ? ((cPaid / cNetSales) * 100).toFixed(0) : '0'

                      return (
                        <tr key={c.cashier_id} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-foreground">{c.cashier_name}</div>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold inline-block mt-0.5 ${
                                c.role === 'admin'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {c.role === 'admin' ? 'مدير' : 'كاشير'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="font-bold text-foreground">{c.invoices_count}</span>
                            {Number(c.returned_invoices_count || 0) > 0 && (
                              <span className="block text-[10px] text-rose-600 font-semibold">
                                ({c.returned_invoices_count} مسترجعة)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-medium text-muted-foreground">
                            {formatCurrency(cGrossSales)}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400">
                            {cReturns > 0 ? `− ${formatCurrency(cReturns)}` : '٠٫٠٠ ج.م'}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-foreground">
                            {formatCurrency(cNetSales)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(cPaid)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(cRemaining)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                            {formatPercent(cRate, 0)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-muted/50 border-t-2 border-border font-bold text-xs">
                    <tr>
                      <td className="py-3 px-3 text-foreground">الإجمالي الكلي</td>
                      <td className="py-3 px-3 text-center font-mono text-foreground">
                        {formatNumber(invoicesCount)}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {formatCurrency(grossSales)}
                      </td>
                      <td className="py-3 px-3 font-mono text-rose-600 dark:text-rose-400">
                        {totalReturns > 0 ? `− ${formatCurrency(totalReturns)}` : '٠٫٠٠ ج.م'}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-foreground">
                        {formatCurrency(totalSales)}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(totalPaid)}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-amber-600 dark:text-amber-400">
                        {formatCurrency(totalRemaining)}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600">
                        {formatPercent(collectionRate, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown (1 col) */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-black">طرق الدفع والتحصيل</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {isLoadingReport ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : !reportData?.payment_methods || reportData.payment_methods.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                لا توجد بيانات متاحة
              </p>
            ) : (
              reportData.payment_methods.map((pm) => {
                const label =
                  pm.payment_method === 'cash'
                    ? 'نقداً (كاش)'
                    : pm.payment_method === 'card'
                    ? 'بطاقة بنكية'
                    : 'بالأجل (دين)'
                const icon =
                  pm.payment_method === 'cash' ? (
                    <Banknote className="h-4 w-4 text-emerald-500" />
                  ) : pm.payment_method === 'card' ? (
                    <CreditCard className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-500" />
                  )

                const pmNet = Number(pm.total || 0)
                const pmGross = Number(pm.gross_total || pmNet)
                const pmReturns = Number(pm.returns_total || 0)
                const percentage = totalSales > 0 ? ((pmNet / totalSales) * 100).toFixed(0) : '0'

                return (
                  <div
                    key={pm.payment_method}
                    className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {icon}
                        <span>{label}</span>
                      </span>
                      <span className="font-mono text-primary font-black">{percentage}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pm.payment_method === 'cash'
                            ? 'bg-emerald-500'
                            : pm.payment_method === 'card'
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, Number(percentage)))}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">
                        {formatNumber(pm.count)} فاتورة{' '}
                        {Number(pm.returned_count || 0) > 0 && (
                          <span className="text-rose-600 text-[10px]">
                            ({pm.returned_count} مسترجعة)
                          </span>
                        )}
                      </span>
                      <span className="font-black text-foreground">
                        {formatCurrency(pmNet)}
                      </span>
                    </div>

                    {pmReturns > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>إجمالي قبل الإرجاع: {formatCurrency(pmGross)}</span>
                        <span className="text-rose-600 font-mono">مرتجع: − {formatCurrency(pmReturns)}</span>
                      </div>
                    )}

                    {pm.payment_method === 'credit' && Number(pm.remaining) > 0 && (
                      <div className="pt-1.5 border-t border-border/60 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        <span>متبقي بالأجل (دين):</span>
                        <span className="font-mono font-black">{formatCurrency(pm.remaining)}</span>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Categories Sales Breakdown */}
      {reportData?.categories && reportData.categories.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  مبيعات وأرباح الأقسام والمجموعات
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                تحليل حركة الأقسام والقطع المباعة بعد استبعاد المرتجعات
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                  <tr>
                    <th className="py-2.5 px-3">القسم</th>
                    <th className="py-2.5 px-3 text-center">القطع الصافية</th>
                    <th className="py-2.5 px-3">إجمالي الإيرادات الصافية</th>
                    <th className="py-2.5 px-3">تكلفة البضاعة</th>
                    <th className="py-2.5 px-3 text-emerald-600 font-bold">صافي الربح</th>
                    <th className="py-2.5 px-3 text-center">نسبة مساهمة الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.categories.map((cat) => {
                    const catRev = Number(cat.total_revenue || 0)
                    const catProfit = Number(cat.total_profit || 0)
                    const catCogs = Number(cat.total_cogs || (catRev - catProfit))
                    const profitPct =
                      grossProfit > 0
                        ? ((catProfit / grossProfit) * 100).toFixed(0)
                        : '0'

                    return (
                      <tr key={cat.category_name} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {cat.category_name}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {formatNumber(cat.total_units)} قطعة
                          {Number(cat.returned_units || 0) > 0 && (
                            <span className="block text-[10px] text-rose-600 font-normal">
                              ({cat.returned_units} مرتجع)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {formatCurrency(catRev)}
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {formatCurrency(catCogs)}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(catProfit)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                          {formatPercent(profitPct, 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Timeline Breakdown Section */}
      {reportData?.timeline && reportData.timeline.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  السجل الزمني لحركة الأيام خلال الفترة
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                توزيع المبيعات، المحصل، والديون يوماً بيوم
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ / اليوم</th>
                    <th className="py-2.5 px-3 text-center">الفواتير</th>
                    <th className="py-2.5 px-3 font-black text-foreground">صافي المبيعات</th>
                    <th className="py-2.5 px-3 text-emerald-600 font-bold">المحصل الفعلي</th>
                    <th className="py-2.5 px-3 text-amber-600 font-bold">المتبقي الآجل</th>
                    <th className="py-2.5 px-3 text-rose-600 font-bold">المرتجعات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.timeline.map((item) => {
                    const dayFormatted = new Date(item.day).toLocaleDateString('ar-EG', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                    const salesAmt = Number(item.sales_amount || 0)
                    const paidAmt = Number(item.paid_amount || 0)
                    const remAmt = Number(item.remaining_amount || 0)
                    const retAmt = Number(item.returns_amount || 0)

                    return (
                      <tr key={item.day} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-foreground font-mono">
                          {dayFormatted}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          <span className="font-bold">{item.invoices}</span>
                          {Number(item.returned_invoices || 0) > 0 && (
                            <span className="text-[10px] text-rose-600 mr-1">
                              ({item.returned_invoices} مرتجع)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-foreground">
                          {formatCurrency(salesAmt)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(paidAmt)}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {remAmt > 0 ? formatCurrency(remAmt) : '٠٫٠٠ ج.م'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {retAmt > 0 ? `− ${formatCurrency(retAmt)}` : '٠٫٠٠ ج.م'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Offscreen Container for A4 Printable Financial Report */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '210mm',
        }}
        aria-hidden="true"
      >
        <div
          ref={printReportRef}
          className="p-8 bg-white text-slate-900 font-sans"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {storeSettings?.logo_url && (
                <div className="h-14 w-14 rounded-xl border border-slate-300 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={storeSettings.logo_url}
                    alt={storeName}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  {storeName}
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  التقرير المالي والمحاسبي المعتمد
                </p>
                {storePhone && (
                  <p className="text-[11px] text-slate-500 mt-1">هاتف: {storePhone}</p>
                )}
              </div>
            </div>

            <div className="text-left text-xs" dir="rtl">
              <p className="font-bold text-slate-900">فترة التقرير: {periodLabel}</p>
              <p className="text-slate-600 mt-0.5">الكاشير: {selectedCashierName}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                تاريخ الاستخراج: {currentDateFormatted}
              </p>
            </div>
          </div>

          {/* Reconciliation Note on Print */}
          <div className="mb-4 p-2.5 bg-slate-100 rounded-lg border border-slate-300 text-xs">
            <p className="font-bold text-slate-800">
              صافي المبيعات ({formatCurrency(totalSales)}) = المحصل الفعلي ({formatCurrency(totalPaid)}) + المبيعات الآجلة ({formatCurrency(totalRemaining)})
            </p>
          </div>

          {/* Financial Summary Table */}
          <div className="mb-6">
            <h2 className="text-sm font-black text-slate-900 mb-2 border-r-4 border-slate-900 pr-2">
              ملخص الأرقام المالية الرئيسية
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300 w-1/3">
                    المبيعات الإجمالية قبل الإرجاع:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-900">
                    {formatCurrency(grossSales)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300 text-rose-700">
                    المرتجعات المعتمدة (مخصومة):
                  </td>
                  <td className="p-2.5 font-mono font-bold text-rose-700">
                    − {formatCurrency(totalReturns)} ({formatNumber(returnedInvoicesCount)} فاتورة مسترجعة كلياً)
                  </td>
                </tr>
                <tr className="bg-emerald-50">
                  <td className="p-2.5 font-black border-r border-slate-300 text-emerald-950">
                    صافي مبيعات الفترة الفعلية:
                  </td>
                  <td className="p-2.5 font-mono font-black text-emerald-900 text-sm">
                    {formatCurrency(totalSales)} ({formatNumber(invoicesCount)} فاتورة إجمالية، {formatNumber(activeInvoicesCount)} نشطة)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300 text-emerald-800">
                    المحصل الفعلي (كاش وبطاقة):
                  </td>
                  <td className="p-2.5 font-mono font-bold text-emerald-800">
                    {formatCurrency(totalPaid)} (نسبة التحصيل: {formatPercent(collectionRate)})
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300 text-amber-800">
                    المبيعات الآجلة (ديون عملاء):
                  </td>
                  <td className="p-2.5 font-mono font-bold text-amber-800">
                    {formatCurrency(totalRemaining)} (نسبة الآجل: {formatPercent(creditRate)})
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    صافي تكلفة البضاعة المباعة (شراء):
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {formatCurrency(cogs)} (استبعاد تكلفة مرتجعات: {formatCurrency(returnedCogs)})
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    المصروفات التشغيلية والنثريات:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-rose-700">
                    {formatCurrency(expenses)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    المشتريات وتوريد المخزون الجديد:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {formatCurrency(purchases)}
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    إجمالي الخصومات الممنوحة:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {formatCurrency(totalDiscounts)}
                  </td>
                </tr>
                <tr className="bg-emerald-100 border-t-2 border-emerald-600">
                  <td className="p-3 font-black text-emerald-950 border-r border-emerald-300">
                    صافي الربح النهائي (المبيعات الصافية − التكلفة − المصروفات):
                  </td>
                  <td className="p-3 font-mono font-black text-emerald-900 text-base">
                    {formatCurrency(netProfit)} (هامش ربح: {formatPercent(profitMargin)})
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cashiers Table in Print */}
          {reportData?.cashiers && reportData.cashiers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-black text-slate-900 mb-2 border-r-4 border-slate-900 pr-2">
                تقرير مبيعات وأداء الكاشيرات
              </h2>
              <table className="w-full text-xs border-collapse border border-slate-300 text-right">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 border border-slate-800">الكاشير</th>
                    <th className="p-2 border border-slate-800 text-center">الفواتير</th>
                    <th className="p-2 border border-slate-800">صافي المبيعات</th>
                    <th className="p-2 border border-slate-800 text-rose-200">المرتجع</th>
                    <th className="p-2 border border-slate-800">المحصل الفعلي</th>
                    <th className="p-2 border border-slate-800">الآجل (الديون)</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.cashiers.map((c, idx) => (
                    <tr
                      key={c.cashier_id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      <td className="p-2 border border-slate-200 font-bold">{c.cashier_name}</td>
                      <td className="p-2 border border-slate-200 text-center font-mono">
                        {formatNumber(c.invoices_count)}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold">
                        {formatCurrency(c.total_sales)}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono text-rose-700">
                        {Number(c.returns_amount || 0) > 0 ? formatCurrency(c.returns_amount) : '-'}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-emerald-800">
                        {formatCurrency(c.total_paid)}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-amber-800">
                        {formatCurrency(c.total_remaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures & Verification */}
          <div className="mt-12 pt-6 border-t-2 border-slate-300 grid grid-cols-2 text-center text-xs text-slate-700">
            <div>
              <p className="font-bold">توقيع المسؤول / الكاشير</p>
              <div className="mt-8 border-b border-dashed border-slate-400 w-40 mx-auto" />
            </div>
            <div>
              <p className="font-bold">اعتماد إدارة متجر كراش ستور</p>
              <div className="mt-8 border-b border-dashed border-slate-400 w-40 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
