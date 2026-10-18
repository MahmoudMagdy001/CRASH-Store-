import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSalesList, getStoreSettings } from '@/features/pos/api/posApi'
import type { SaleWithDetails } from '@/features/pos/types/pos.types'
import { ReceiptModal } from '@/features/pos/components/ReceiptModal'
import { ReturnModal } from '@/features/returns/components/ReturnModal'
import {
  computeSaleFinancials,
  aggregateSalesStats,
} from '../utils/salesCalculations'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import {
  History,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  DollarSign,
  Receipt,
  Tag,
  RefreshCw,
  Clock,
  Users,
  Eye,
  Undo2,
  RotateCcw,
} from 'lucide-react'

type DatePeriod = 'today' | 'month' | 'year' | 'all' | 'custom'

const isDateInPeriod = (
  dateStr: string,
  period: DatePeriod,
  startDate?: string,
  endDate?: string
): boolean => {
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
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    )
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

export const SalesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedMethod, setSelectedMethod] = useState<string>('all')

  // Date period filters: today, month, year, all, custom
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('today')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // Selected sale for receipt reprint modal
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false)

  // Selected sale for return modal
  const [returnSale, setReturnSale] = useState<SaleWithDetails | null>(null)
  const [isReturnOpen, setIsReturnOpen] = useState<boolean>(false)

  // Queries
  const {
    data: sales = [],
    isLoading: isLoadingSales,
    refetch: refetchSales,
  } = useQuery({
    queryKey: ['sales-ledger'],
    queryFn: () => getSalesList(1000),
  })

  const { data: settings = null, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  })

  const isLoading = isLoadingSales || isLoadingSettings

  // Filter sales by selected date period
  const periodSales = useMemo(() => {
    return sales.filter((s) =>
      isDateInPeriod(s.created_at, datePeriod, customStartDate, customEndDate)
    )
  }, [sales, datePeriod, customStartDate, customEndDate])

  // Label for current period
  const periodLabel = useMemo(() => {
    switch (datePeriod) {
      case 'today':
        return 'اليوم'
      case 'month':
        return 'هذا الشهر'
      case 'year':
        return 'هذه السنة'
      case 'custom':
        return customStartDate && customEndDate
          ? `من ${customStartDate} إلى ${customEndDate}`
          : 'فترة مخصصة'
      case 'all':
      default:
        return 'كل الأوقات'
    }
  }, [datePeriod, customStartDate, customEndDate])

  // KPI Calculations based on periodSales (accurately accounts for returns and credit)
  const stats = useMemo(() => aggregateSalesStats(periodSales), [periodSales])

  // Filtered sales list for the table (date + search + method)
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return periodSales.filter((s) => {
      const matchesSearch =
        !q ||
        s.invoice_number.toLowerCase().includes(q) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.cashier?.full_name &&
          s.cashier.full_name.toLowerCase().includes(q)) ||
        s.sale_items?.some(
          (itm) =>
            itm.products?.name?.toLowerCase().includes(q) ||
            itm.products?.barcode?.toLowerCase().includes(q)
        )
      const matchesMethod =
        selectedMethod === 'all' || s.payment_method === selectedMethod
      return matchesSearch && matchesMethod
    })
  }, [periodSales, searchQuery, selectedMethod])

  const handleOpenReceipt = (sale: SaleWithDetails) => {
    setSelectedSale(sale)
    setIsReceiptOpen(true)
  }

  const handleOpenReturn = (sale: SaleWithDetails) => {
    setReturnSale(sale)
    setIsReturnOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            سجل فواتير المبيعات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مراجعة فواتير البيع السابقة، تفاصيل المبالغ والأصناف، وإعادة طباعة الإيصالات
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/customers">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20 font-bold"
            >
              <Users className="h-4 w-4" />
              حسابات وديون العملاء
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSales()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            تحديث السجل
          </Button>
        </div>
      </div>

      {/* Date Period Filter Selector Bar */}
      <div className="bg-card p-3.5 rounded-2xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span>فترة المبيعات:</span>
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 flex-wrap">
            <button
              type="button"
              onClick={() => setDatePeriod('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePeriod === 'today'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePeriod === 'month'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePeriod === 'year'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              هذه السنة
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePeriod === 'all'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setDatePeriod('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePeriod === 'custom'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              تحديد تاريخ (من - إلى)
            </button>
          </div>
        </div>

        {/* Custom Date Range Inputs (Shown when custom is selected) */}
        {datePeriod === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/40 p-1.5 rounded-xl border border-border/60 animate-in fade-in-50 duration-200">
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
                onClick={() => {
                  setCustomStartDate('')
                  setCustomEndDate('')
                }}
                className="text-[11px] text-destructive hover:underline px-1 font-bold"
              >
                تفريغ
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground">
                إجمالي المبيعات (الصافي)
              </CardTitle>
              <span className="text-[10px] text-primary font-bold">
                ({periodLabel})
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black font-mono text-primary">
              {stats.totalNetSales.toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate font-medium">
              {stats.totalReturns > 0 ? (
                <span>
                  أصل: {stats.totalGrossSales.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م
                  {' '}(مرتجع: -{stats.totalReturns.toLocaleString('ar-EG', { minimumFractionDigits: 1 })})
                </span>
              ) : (
                <span>صافي قيمة الفواتير المصدرة</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground">
                المدفوع نقداً / المحصل الفعلي
              </CardTitle>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                ({periodLabel})
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Banknote className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.totalPaid.toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
            <p className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-medium">
              المبالغ المستلمة بالدرج بعد خصم المرتجعات
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs border-amber-500/30 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-amber-800 dark:text-amber-400">
                المتبقي بالأجل (الديون)
              </CardTitle>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                ({periodLabel})
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.totalCreditRemaining.toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">
              صافي الديون المستحقة على العملاء
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs border-rose-500/20 bg-rose-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-rose-700 dark:text-rose-400">
                إجمالي المرتجعات
              </CardTitle>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                ({periodLabel})
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
              <Undo2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {stats.totalReturns.toLocaleString('ar-EG', {
                minimumFractionDigits: 2,
              })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1 font-medium">
              {stats.returnedCount > 0
                ? `${stats.returnedCount} فاتورة مسترجعة بالكامل`
                : 'تم خصمها من الإيراد والدين'}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xs font-bold text-muted-foreground">
                الفواتير والخصومات
              </CardTitle>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                ({periodLabel})
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black font-mono text-foreground">
              {stats.activeCount}{' '}
              <span className="text-xs font-bold text-muted-foreground">
                نشطة {stats.returnedCount > 0 ? `(${stats.returnedCount} مسترجعة)` : ''}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Tag className="h-3 w-3 text-amber-500" />
              <span>إجمالي: {stats.totalCount} فاتورة | خصومات: {stats.totalDiscounts.toLocaleString('ar-EG', { minimumFractionDigits: 1 })} ج.م</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="البحث برقم الفاتورة، العميل، اسم المنتج أو الباركود..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSelectedMethod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedMethod === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            الكل ({sales.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('cash')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedMethod === 'cash'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Banknote className="h-3 w-3" />
            نقداً
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('card')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedMethod === 'card'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="h-3 w-3" />
            بطاقة بنكية
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('credit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              selectedMethod === 'credit'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            بالأجل
          </button>
        </div>
      </div>

      {/* Sales Table */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-2.5 px-2 whitespace-nowrap">رقم الفاتورة</th>
                <th className="py-2.5 px-2 whitespace-nowrap">التاريخ</th>
                <th className="py-2.5 px-2 whitespace-nowrap">العميل</th>
                <th className="py-2.5 px-2 whitespace-nowrap">الكاشير</th>
                <th className="py-2.5 px-1.5 whitespace-nowrap">الدفع</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">الأصناف</th>
                <th className="py-2.5 px-1.5 whitespace-nowrap">الخصم</th>
                <th className="py-2.5 px-2 whitespace-nowrap">الإجمالي</th>
                <th className="py-2.5 px-2 text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">المدفوع</th>
                <th className="py-2.5 px-2 text-amber-600 dark:text-amber-400 font-bold whitespace-nowrap">المتبقي</th>
                <th className="py-2.5 px-1 text-center whitespace-nowrap">معاينة</th>
                <th className="py-2.5 px-1 text-center text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">استرجاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={12} className="py-4 px-2">
                      <div className="h-5 bg-muted rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-12 text-center text-muted-foreground"
                  >
                    لا توجد فواتير مبيعات مسجلة حتى الآن
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const saleDate = new Date(sale.created_at)
                  const itemsCount = sale.sale_items?.length || 0
                  const totalUnits =
                    sale.sale_items?.reduce(
                      (acc, itm) => acc + Number(itm.quantity),
                      0
                    ) || 0

                  const isCredit = sale.payment_method === 'credit'
                  const fin = computeSaleFinancials(sale)

                  return (
                    <tr
                      key={sale.id}
                      onClick={() => handleOpenReceipt(sale)}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer group ${
                        fin.isFullyReturned ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.08]' : ''
                      }`}
                      title="انقر لمعاينة أو طباعة الفاتورة"
                    >
                      <td className="py-2.5 px-2 font-mono font-bold text-foreground whitespace-nowrap align-middle">
                        {sale.invoice_number}
                      </td>
                      <td className="py-2.5 px-2 text-muted-foreground text-[11px] whitespace-nowrap align-middle">
                        {saleDate.toLocaleDateString('ar-EG', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {saleDate.toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-foreground whitespace-nowrap align-middle">
                        {sale.customer_name ? (
                          <span
                            className="font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[110px] inline-block align-middle"
                            title={sale.customer_name}
                          >
                            {sale.customer_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-medium text-foreground whitespace-nowrap align-middle">
                        {sale.cashier?.full_name || 'مدير النظام'}
                      </td>
                      <td className="py-2.5 px-1.5 whitespace-nowrap align-middle">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold text-[10px] ${
                            isCredit
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : sale.payment_method === 'card'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isCredit ? (
                            <>
                              <Clock className="h-2.5 w-2.5" />
                              بالأجل
                            </>
                          ) : sale.payment_method === 'card' ? (
                            <>
                              <CreditCard className="h-2.5 w-2.5" />
                              بطاقة
                            </>
                          ) : (
                            <>
                              <Banknote className="h-2.5 w-2.5" />
                              نقداً
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-2.5 px-1 text-center font-mono whitespace-nowrap align-middle">
                        <span className="font-bold">{itemsCount}</span>{' '}
                        <span className="text-[10px] text-muted-foreground">
                          ({totalUnits}ق)
                        </span>
                      </td>
                      <td className="py-2.5 px-1.5 font-mono whitespace-nowrap align-middle">
                        {Number(sale.discount) > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            -{Number(sale.discount).toLocaleString('ar-EG', { minimumFractionDigits: 1 })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono whitespace-nowrap align-middle">
                        {fin.isFullyReturned ? (
                          <div className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span className="font-bold text-xs text-foreground">
                              {fin.grossTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                              <RotateCcw className="h-2.5 w-2.5" />
                              مرتجع
                            </span>
                          </div>
                        ) : fin.returnAmount > 0 ? (
                          <div className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span className="font-black text-xs text-foreground">
                              {fin.netTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                              جزئي
                            </span>
                          </div>
                        ) : (
                          <span className="font-black text-xs text-foreground whitespace-nowrap">
                            {fin.netTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap align-middle">
                        {fin.isFullyReturned ? (
                          <span className="text-muted-foreground text-xs font-normal">
                            ٠٫٠٠ ج.م
                          </span>
                        ) : (
                          <span>
                            {fin.netPaid.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 font-mono whitespace-nowrap align-middle">
                        {fin.netRemaining > 0 ? (
                          <span className="font-black text-amber-700 dark:text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded-md border border-amber-500/40 inline-block whitespace-nowrap text-[11px]">
                            {fin.netRemaining.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                          </span>
                        ) : (
                          <span className="text-muted-foreground">٠٫٠٠</span>
                        )}
                      </td>
                      <td className="py-2.5 px-1 text-center whitespace-nowrap align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenReceipt(sale)
                          }}
                          className="h-7 gap-1 text-[11px] text-primary font-bold hover:bg-primary/10 px-2 rounded-lg border-primary/30"
                        >
                          <Eye className="h-3 w-3" />
                          <span>معاينة</span>
                        </Button>
                      </td>
                      <td className="py-2.5 px-1 text-center whitespace-nowrap align-middle">
                        {sale.is_fully_returned ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded bg-muted text-muted-foreground text-[10px] font-bold">
                            <Undo2 className="h-2.5 w-2.5" />
                            مسترجع
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenReturn(sale)
                            }}
                            className="h-7 gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/10 px-2 rounded-lg border-rose-500/30"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>استرجاع</span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reprint Receipt Modal */}
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        sale={selectedSale}
        settings={settings}
      />

      {/* Return Modal */}
      <ReturnModal
        open={isReturnOpen}
        onOpenChange={setIsReturnOpen}
        sale={returnSale}
        onSuccess={() => refetchSales()}
      />
    </div>
  )
}
