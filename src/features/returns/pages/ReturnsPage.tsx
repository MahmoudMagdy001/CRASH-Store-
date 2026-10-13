import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReturnsList } from '../api/returnsApi'
import type { ReturnWithDetails } from '../types/returns.types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Undo2,
  Search,
  Calendar,
  RefreshCw,
  Receipt,
  Package,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

type DatePeriod = 'today' | 'month' | 'year' | 'all' | 'custom'
type ReturnTypeFilter = 'all' | 'partial' | 'full'

function isDateInPeriod(
  dateStr: string,
  period: DatePeriod,
  startDate?: string,
  endDate?: string
): boolean {
  if (period === 'all') return true
  const d = new Date(dateStr)
  const now = new Date()

  if (period === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  if (period === 'year') {
    return d.getFullYear() === now.getFullYear()
  }
  if (period === 'custom') {
    const time = d.getTime()
    if (startDate) {
      const s = new Date(startDate)
      s.setHours(0, 0, 0, 0)
      if (time < s.getTime()) return false
    }
    if (endDate) {
      const e = new Date(endDate)
      e.setHours(23, 59, 59, 999)
      if (time > e.getTime()) return false
    }
    return true
  }
  return true
}

const ReturnRow: React.FC<{ ret: ReturnWithDetails }> = ({ ret }) => {
  const [expanded, setExpanded] = useState(false)
  const retDate = new Date(ret.created_at)

  return (
    <>
      <tr
        className="hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        {/* Return Number */}
        <td className="py-3 px-3 font-mono font-bold text-foreground text-xs">
          {ret.return_number}
        </td>

        {/* Date */}
        <td className="py-3 px-3 text-muted-foreground text-[11px]">
          {retDate.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}{' '}
          -{' '}
          {retDate.toLocaleTimeString('ar-EG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}
        </td>

        {/* Original invoice */}
        <td className="py-3 px-3 font-mono text-xs">
          <span className="font-bold text-foreground">
            {ret.sale?.invoice_number || '—'}
          </span>
          {ret.sale?.customer_name && (
            <span className="block text-[10px] text-muted-foreground">
              {ret.sale.customer_name}
            </span>
          )}
        </td>

        {/* Return type */}
        <td className="py-3 px-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              ret.return_type === 'full'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}
          >
            {ret.return_type === 'full' ? 'كلي' : 'جزئي'}
          </span>
        </td>

        {/* Items count */}
        <td className="py-3 px-3 text-center font-mono font-bold text-xs">
          {ret.return_items?.length || 0}
        </td>

        {/* Total returned */}
        <td className="py-3 px-3 font-mono font-black text-rose-600 dark:text-rose-400 text-xs">
          {Number(ret.total_returned).toLocaleString('ar-EG', {
            minimumFractionDigits: 2,
          })}{' '}
          <span className="text-[10px] font-bold text-muted-foreground">ج.م</span>
        </td>

        {/* Processed by */}
        <td className="py-3 px-3 font-medium text-xs text-foreground">
          {ret.processed_by_profile?.full_name || 'مدير النظام'}
        </td>

        {/* Reason */}
        <td className="py-3 px-3 text-xs text-muted-foreground max-w-[140px] truncate">
          {ret.reason || '—'}
        </td>

        {/* Expand toggle */}
        <td className="py-3 px-3 text-center">
          <button
            className="h-7 w-7 rounded-md bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded items detail */}
      {expanded && (
        <tr>
          <td colSpan={9} className="px-4 pb-4 pt-1 bg-muted/10 border-b border-border">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="py-2 px-3">الصنف</th>
                    <th className="py-2 px-3 text-center">الكمية المسترجعة</th>
                    <th className="py-2 px-3">سعر البيع (وقت البيع)</th>
                    <th className="py-2 px-3 text-rose-600 font-bold">إجمالي السطر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(ret.return_items || []).map((ri) => (
                    <tr key={ri.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {ri.products?.name || 'منتج'}
                        {ri.products?.barcode && (
                          <span className="block text-[10px] font-mono text-muted-foreground">
                            {ri.products.barcode}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold">
                        {ri.quantity}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {Number(ri.unit_price).toLocaleString('ar-EG', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        ج.م
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-rose-600 dark:text-rose-400">
                        {(ri.quantity * ri.unit_price).toLocaleString('ar-EG', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export const ReturnsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [typeFilter, setTypeFilter] = useState<ReturnTypeFilter>('all')

  const {
    data: returns = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['returns-list'],
    queryFn: () => getReturnsList(500),
  })

  // ─── Period filter ──────────────────────────────────────────────────────────
  const periodReturns = useMemo(
    () =>
      returns.filter((r) =>
        isDateInPeriod(r.created_at, datePeriod, customStartDate, customEndDate)
      ),
    [returns, datePeriod, customStartDate, customEndDate]
  )

  // ─── Type + search filter ───────────────────────────────────────────────────
  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return periodReturns.filter((r) => {
      const matchesType = typeFilter === 'all' || r.return_type === typeFilter
      const matchesSearch =
        !q ||
        r.return_number.toLowerCase().includes(q) ||
        (r.sale?.invoice_number || '').toLowerCase().includes(q) ||
        (r.sale?.customer_name || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q) ||
        r.return_items.some((ri) =>
          (ri.products?.name || '').toLowerCase().includes(q)
        )
      return matchesType && matchesSearch
    })
  }, [periodReturns, typeFilter, searchQuery])

  // ─── KPIs ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalAmount = filteredReturns.reduce(
      (s, r) => s + Number(r.total_returned),
      0
    )
    const fullCount = filteredReturns.filter((r) => r.return_type === 'full').length
    const partialCount = filteredReturns.filter(
      (r) => r.return_type === 'partial'
    ).length
    const uniqueInvoices = new Set(filteredReturns.map((r) => r.sale_id)).size
    return { totalAmount, fullCount, partialCount, uniqueInvoices }
  }, [filteredReturns])

  const periodLabel = useMemo(() => {
    switch (datePeriod) {
      case 'today': return 'اليوم'
      case 'month': return 'هذا الشهر'
      case 'year': return 'هذه السنة'
      case 'custom':
        return customStartDate && customEndDate
          ? `من ${customStartDate} إلى ${customEndDate}`
          : 'فترة مخصصة'
      default: return 'كل الأوقات'
    }
  }, [datePeriod, customStartDate, customEndDate])

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Undo2 className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            سجل المرتجعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            متابعة وتقرير شامل لجميع عمليات استرجاع الأصناف والفواتير
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث السجل
        </Button>
      </div>

      {/* ── Date Period Filter ── */}
      <div className="bg-card p-3.5 rounded-2xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>الفترة الزمنية:</span>
          </div>
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 flex-wrap">
            {(
              [
                { key: 'today', label: 'اليوم' },
                { key: 'month', label: 'هذا الشهر' },
                { key: 'year', label: 'هذه السنة' },
                { key: 'all', label: 'الكل' },
                { key: 'custom', label: 'تحديد تاريخ' },
              ] as const
            ).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setDatePeriod(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  datePeriod === item.key
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {datePeriod === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/40 p-1.5 rounded-xl border border-border/60">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold">من:</span>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-8 text-xs font-mono w-36 bg-background"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-semibold">إلى:</span>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-8 text-xs font-mono w-36 bg-background"
              />
            </div>
            {(customStartDate || customEndDate) && (
              <button
                type="button"
                onClick={() => { setCustomStartDate(''); setCustomEndDate('') }}
                className="text-[11px] text-destructive hover:underline px-1 font-bold"
              >
                تفريغ
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="rounded-2xl border-border shadow-xs border-rose-500/20 bg-rose-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-rose-700 dark:text-rose-400">
              إجمالي المرتجعات
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <Undo2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {stats.totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">({periodLabel})</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              عدد عمليات الاسترجاع
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black font-mono text-foreground">
              {filteredReturns.length}{' '}
              <span className="text-xs font-bold text-muted-foreground">عملية</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              كلي: {stats.fullCount} | جزئي: {stats.partialCount}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              فواتير متأثرة
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black font-mono text-foreground">
              {stats.uniqueInvoices}{' '}
              <span className="text-xs font-bold text-muted-foreground">فاتورة</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              أصناف مسترجعة
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Package className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-black font-mono text-foreground">
              {filteredReturns.reduce((s, r) => s + (r.return_items?.length || 0), 0)}{' '}
              <span className="text-xs font-bold text-muted-foreground">سطر</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search + Type Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="ابحث برقم المرتجع، رقم الفاتورة، العميل، اسم المنتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(
            [
              { key: 'all', label: 'الكل' },
              { key: 'partial', label: 'جزئي' },
              { key: 'full', label: 'كلي' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTypeFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === item.key
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
              {item.key === 'all' && ` (${periodReturns.length})`}
              {item.key === 'partial' && ` (${stats.partialCount})`}
              {item.key === 'full' && ` (${stats.fullCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Returns Table ── */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-3">رقم المرتجع</th>
                <th className="py-3 px-3">التاريخ والوقت</th>
                <th className="py-3 px-3">الفاتورة الأصلية</th>
                <th className="py-3 px-3">نوع الاسترجاع</th>
                <th className="py-3 px-3 text-center">الأصناف</th>
                <th className="py-3 px-3 text-rose-600 dark:text-rose-400 font-bold">
                  إجمالي المسترجع
                </th>
                <th className="py-3 px-3">معالج بواسطة</th>
                <th className="py-3 px-3">السبب</th>
                <th className="py-3 px-3 text-center">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={9} className="py-4 px-3">
                      <div className="h-5 bg-muted rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Undo2 className="h-10 w-10 text-muted-foreground/30" />
                      <span>لا توجد عمليات استرجاع مسجلة في هذه الفترة</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => <ReturnRow key={ret.id} ret={ret} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
