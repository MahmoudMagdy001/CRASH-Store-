import React, { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import {
  getFinancialReport,
  getCashiersList,
} from '../api/reportsApi'
import { getStoreSettings } from '@/features/pos/api/posApi'
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
        margin: 12mm 15mm;
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
  const totalSales = summary?.total_sales || 0
  const cogs = summary?.cogs || 0
  const expenses = summary?.expenses || 0
  const netProfit = summary?.net_profit || 0
  const grossProfit = summary?.gross_profit || 0
  const discounts = summary?.total_discounts || 0
  const invoicesCount = summary?.invoices_count || 0
  const averageInvoice = invoicesCount > 0 ? totalSales / invoicesCount : 0
  const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0'

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
            <span>التقارير المالية والمحاسبية</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            تقرير الأرباح، تكلفة البضاعة، مصروفات المحل، ومتابعة أداء الكاشيرات
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
                  className="h-8 text-xs w-36"
                  title="من تاريخ"
                />
                <span className="text-muted-foreground">إلى</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-36"
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

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Sales */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">إجمالي المبيعات</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {totalSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
            <span>الفواتير: <strong className="text-foreground">{invoicesCount}</strong></span>
            <span>متوسط: <strong className="text-foreground">{averageInvoice.toFixed(0)} ج.م</strong></span>
          </p>
        </Card>

        {/* Cost of Goods Sold */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">تكلفة البضاعة المباعة</span>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-foreground">
            {cogs.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            مجمل الربح التجاري: <strong>{grossProfit.toFixed(2)} ج.م</strong>
          </p>
        </Card>

        {/* Expenses */}
        <Card className="p-4 border-border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">المصروفات التشغيلية</span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono mt-2 text-rose-600 dark:text-rose-400">
            {expenses.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            خصومات ممنوحة: <strong>{discounts.toFixed(2)} ج.م</strong>
          </p>
        </Card>

        {/* Net Profit */}
        <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
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
            {netProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-bold">
            نسبة هامش الربح الصافي: {profitMargin}%
          </p>
        </Card>
      </div>

      {/* Cashiers Performance & Payment Methods Two Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cashiers Performance Table (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  متابعة أداء ومبيعات الكاشيرات
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">الفترة: {periodLabel}</span>
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
              <div className="py-12 text-center text-muted-foreground text-xs">
                لا توجد عمليات بيع مسجلة لكاشيرات خلال هذه الفترة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                    <tr>
                      <th className="py-2.5 px-3">الكاشير</th>
                      <th className="py-2.5 px-3">الرتبة</th>
                      <th className="py-2.5 px-3 text-center">الفواتير</th>
                      <th className="py-2.5 px-3">إجمالي المبيعات</th>
                      <th className="py-2.5 px-3 text-emerald-600">المحصل الفعلي</th>
                      <th className="py-2.5 px-3 text-amber-600">الأجل (الديون)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {reportData.cashiers.map((c) => (
                      <tr key={c.cashier_id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3 font-bold text-foreground">
                          {c.cashier_name}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            }`}
                          >
                            {c.role === 'admin' ? 'مدير' : 'كاشير'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {c.invoices_count}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {Number(c.total_sales).toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(c.total_paid).toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {Number(c.total_remaining).toFixed(2)} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown (1 col) */}
        <Card>
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
                  <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
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

                const percentage =
                  totalSales > 0 ? ((Number(pm.total) / totalSales) * 100).toFixed(0) : '0'

                return (
                  <div
                    key={pm.payment_method}
                    className="p-3 rounded-xl border border-border bg-muted/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        {icon}
                        <span>{label}</span>
                      </span>
                      <span className="font-mono">{percentage}%</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{pm.count} فاتورة</span>
                      <span className="font-black text-foreground">
                        {Number(pm.total).toFixed(2)} ج.م
                      </span>
                    </div>

                    {pm.payment_method === 'credit' && Number(pm.remaining) > 0 && (
                      <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        <span>متبقي بالأجل:</span>
                        <span className="font-mono">{Number(pm.remaining).toFixed(2)} ج.م</span>
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
        <Card>
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  مبيعات وأرباح الأقسام
                </CardTitle>
              </div>
              <span className="text-xs text-muted-foreground">
                تحليل الأصناف الأكثر توليداً للأرباح
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                  <tr>
                    <th className="py-2.5 px-3">القسم</th>
                    <th className="py-2.5 px-3 text-center">القطع المباعة</th>
                    <th className="py-2.5 px-3">إجمالي الإيرادات</th>
                    <th className="py-2.5 px-3 text-emerald-600 font-bold">صافي الربح</th>
                    <th className="py-2.5 px-3 text-center">نسبة مساهمة الربح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportData.categories.map((cat) => {
                    const catRev = Number(cat.total_revenue)
                    const catProfit = Number(cat.total_profit)
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
                          {cat.total_units} قطعة
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-foreground">
                          {catRev.toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {catProfit.toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-muted-foreground">
                          {profitPct}%
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
                  التقرير المالي والمحاسبي الدوري
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

          {/* Financial Summary Table */}
          <div className="mb-6">
            <h2 className="text-sm font-black text-slate-900 mb-2 border-r-4 border-slate-900 pr-2">
              ملخص الأرقام المالية الرئيسية
            </h2>
            <table className="w-full text-xs border-collapse border border-slate-300">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300 w-1/3">
                    إجمالي مبيعات الفترة:
                  </td>
                  <td className="p-2.5 font-mono font-black text-slate-900 text-sm">
                    {totalSales.toFixed(2)} ج.م ({invoicesCount} فاتورة)
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    تكلفة البضاعة المباعة (شراء):
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {cogs.toFixed(2)} ج.م
                  </td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    المصروفات التشغيلية والنثريات:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-rose-700">
                    {expenses.toFixed(2)} ج.م
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold border-r border-slate-300">
                    إجمالي الخصومات الممنوحة:
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    {discounts.toFixed(2)} ج.م
                  </td>
                </tr>
                <tr className="bg-emerald-50 border-t-2 border-emerald-600">
                  <td className="p-3 font-black text-emerald-900 border-r border-emerald-200">
                    صافي الربح النهائي (المبيعات − التكلفة − المصروفات):
                  </td>
                  <td className="p-3 font-mono font-black text-emerald-800 text-base">
                    {netProfit.toFixed(2)} ج.م (هامش ربح: {profitMargin}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cashiers Table */}
          {reportData?.cashiers && reportData.cashiers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-black text-slate-900 mb-2 border-r-4 border-slate-900 pr-2">
                تقرير مبيعات الكاشيرات
              </h2>
              <table className="w-full text-xs border-collapse border border-slate-300 text-right">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-2 border border-slate-800">الكاشير</th>
                    <th className="p-2 border border-slate-800 text-center">الفواتير</th>
                    <th className="p-2 border border-slate-800">إجمالي المبيعات</th>
                    <th className="p-2 border border-slate-800">المحصل نقداً وبطاقة</th>
                    <th className="p-2 border border-slate-800">الأجل (الديون)</th>
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
                        {c.invoices_count}
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold">
                        {Number(c.total_sales).toFixed(2)} ج.م
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-emerald-800">
                        {Number(c.total_paid).toFixed(2)} ج.م
                      </td>
                      <td className="p-2 border border-slate-200 font-mono font-bold text-amber-800">
                        {Number(c.total_remaining).toFixed(2)} ج.م
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
