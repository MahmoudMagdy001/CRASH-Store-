import React, { useEffect, useState, useMemo } from 'react'
import { getCustomersSummaryList } from '../api/customersApi'
import type { CustomerSummary } from '../types/customer.types'
import { PayDebtModal } from '../components/PayDebtModal'
import { CustomerInvoicesModal } from '../components/CustomerInvoicesModal'
import { ReceiptModal } from '@/features/pos/components/ReceiptModal'
import { getStoreSettings } from '@/features/pos/api/posApi'
import type { SaleWithDetails, SettingsRow } from '@/features/pos/types/pos.types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Users,
  Search,
  RefreshCw,
  Coins,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react'

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'settled'>('debtors')

  // Selected customer for Pay Debt Modal
  const [payingCustomer, setPayingCustomer] = useState<CustomerSummary | null>(null)
  const [isPayOpen, setIsPayOpen] = useState<boolean>(false)

  // Selected customer for Invoices List Modal
  const [invoicesCustomer, setInvoicesCustomer] = useState<CustomerSummary | null>(null)
  const [isInvoicesOpen, setIsInvoicesOpen] = useState<boolean>(false)

  // Receipt reprint modal
  const [receiptSale, setReceiptSale] = useState<SaleWithDetails | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [data, settingsData] = await Promise.all([
        getCustomersSummaryList(),
        getStoreSettings(),
      ])
      setCustomers(data)
      setSettings(settingsData)
    } catch (err) {
      console.error('Error loading customers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // KPI Calculations
  const stats = useMemo(() => {
    let totalDebt = 0
    let totalPurchased = 0
    let totalPaid = 0
    let debtorsCount = 0

    customers.forEach((c) => {
      totalDebt += c.total_remaining
      totalPurchased += c.total_sales
      totalPaid += c.total_paid
      if (c.total_remaining > 0) {
        debtorsCount += 1
      }
    })

    return {
      totalCustomers: customers.length,
      totalDebt,
      totalPurchased,
      totalPaid,
      debtorsCount,
    }
  }, [customers])

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return customers.filter((c) => {
      const matchesSearch = !q || c.customer_name.toLowerCase().includes(q)
      if (!matchesSearch) return false

      if (filterType === 'debtors') return c.total_remaining > 0
      if (filterType === 'settled') return c.total_remaining <= 0
      return true
    })
  }, [customers, searchQuery, filterType])

  const handleOpenPay = (customer: CustomerSummary) => {
    setPayingCustomer(customer)
    setIsPayOpen(true)
  }

  const handleOpenInvoices = (customer: CustomerSummary) => {
    setInvoicesCustomer(customer)
    setIsInvoicesOpen(true)
  }

  const handleOpenReceipt = (sale: SaleWithDetails) => {
    setReceiptSale(sale)
    setIsReceiptOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            حسابات العملاء والديون (الآجل)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            متابعة ديون ومشتريات العملاء، معرفة المتبقي على كل عميل، وتسجيل سداد الدفعات بسهولة وسرعة
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث الحسابات
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border shadow-xs border-amber-500/40 bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-amber-800 dark:text-amber-400">
              إجمالي الديون المطلوبة (الآجل)
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats.totalDebt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              عدد العملاء المدينين
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-foreground">
              {stats.debtorsCount}{' '}
              <span className="text-xs font-bold text-muted-foreground">عميل</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              إجمالي التحصيلات (المدفوع)
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Coins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.totalPaid.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground">
              إجمالي مبيعات العملاء
            </CardTitle>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black font-mono text-primary">
              {stats.totalPurchased.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
              <span className="text-xs font-bold text-muted-foreground">ج.م</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="البحث باسم العميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-9 h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('debtors')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'debtors'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            عليهم ديون ({stats.debtorsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            جميع العملاء ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('settled')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              filterType === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            خالصين (0 دين)
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <Card className="rounded-2xl border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">اسم العميل</th>
                <th className="py-3 px-4 text-center">عدد الفواتير</th>
                <th className="py-3 px-4">إجمالي المشتريات</th>
                <th className="py-3 px-4 text-emerald-600 dark:text-emerald-400">المدفوع</th>
                <th className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold">المتبقي (الدين)</th>
                <th className="py-3 px-4">آخر تعامل</th>
                <th className="py-3 px-4 text-center">الإجراءات السريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-5 bg-muted rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-muted-foreground"
                  >
                    لا يوجد عملاء مطابقين للبحث حالياً
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const lastDate = new Date(c.last_sale_date)
                  const hasDebt = c.total_remaining > 0

                  return (
                    <tr
                      key={c.customer_name}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                            {c.customer_name.charAt(0)}
                          </div>
                          <span>{c.customer_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span className="font-bold">{c.invoices_count}</span>{' '}
                        <span className="text-[10px] text-muted-foreground">فاتورة</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {c.total_sales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-muted-foreground font-normal">ج.م</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {c.total_paid.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] font-normal">ج.م</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {hasDebt ? (
                          <span className="inline-flex items-center gap-1 font-black text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40">
                            <Clock className="h-3 w-3" />
                            {c.total_remaining.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                            <span className="text-[10px] font-bold">ج.م</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="h-3 w-3" />
                            خالص (0 ج.م)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                        {lastDate.toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {lastDate.toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasDebt && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenPay(c)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 rounded-xl font-bold px-3 shadow-xs"
                            >
                              <Coins className="h-3.5 w-3.5" />
                              سداد دفعة
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenInvoices(c)}
                            className="h-8 text-xs gap-1.5 rounded-xl px-2.5"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            الفواتير ({c.invoices_count})
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pay Debt Modal */}
      <PayDebtModal
        open={isPayOpen}
        onOpenChange={setIsPayOpen}
        customer={payingCustomer}
        onSuccess={loadData}
      />

      {/* Invoices List Modal */}
      <CustomerInvoicesModal
        open={isInvoicesOpen}
        onOpenChange={setIsInvoicesOpen}
        customer={invoicesCustomer}
        onOpenReceipt={handleOpenReceipt}
      />

      {/* Receipt Reprint Modal */}
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        sale={receiptSale}
        settings={settings}
      />
    </div>
  )
}
