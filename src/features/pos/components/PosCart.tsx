import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import type { CartItem } from '../types/pos.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Banknote,
  Percent,
  Coins,
  AlertCircle,
  Loader2,
  Clock,
  User,
} from 'lucide-react'

interface PosCartProps {
  items: CartItem[]
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveItem: (productId: string) => void
  onClearCart: () => void
  onCheckout: (data: {
    paymentMethod: 'cash' | 'card' | 'credit'
    customerName?: string
    amountPaid?: number
    remainingAmount?: number
    discountType: 'fixed' | 'percentage'
    discountValue: number
    calculatedDiscount: number
    netTotal: number
    receivedAmount?: number
  }) => Promise<void>
  isCheckingOut: boolean
}

export const PosCart: React.FC<PosCartProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isCheckingOut,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash')
  const [customerName, setCustomerName] = useState<string>('')
  const [creditPaidAmount, setCreditPaidAmount] = useState<string>('')
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [receivedAmount, setReceivedAmount] = useState<string>('')
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  // Fetch unique previous customer names for quick autocomplete
  const { data: customerNames = [] } = useQuery({
    queryKey: ['pos-customer-suggestions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('customer_name')
        .not('customer_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100)
      if (!data) return []
      const names = Array.from(
        new Set(
          data
            .map((d) => d.customer_name?.trim())
            .filter((n): n is string => Boolean(n))
        )
      )
      return names
    },
    staleTime: 1000 * 60 * 3,
  })

  // Calculations
  const subtotal = items.reduce(
    (acc, item) => acc + item.quantity * item.unit_price,
    0
  )

  const calculatedDiscount = Math.min(
    subtotal,
    discountType === 'percentage'
      ? (subtotal * (discountValue || 0)) / 100
      : Number(discountValue || 0)
  )

  const netTotal = Math.max(0, subtotal - calculatedDiscount)

  const numReceived = parseFloat(receivedAmount) || 0
  const changeDue = numReceived > netTotal ? numReceived - netTotal : 0

  // Credit calculation (paid vs remaining)
  const parsedCreditPaid = Math.max(
    0,
    Math.min(netTotal, parseFloat(creditPaidAmount) || 0)
  )
  const creditRemaining = Math.max(0, netTotal - parsedCreditPaid)

  const handleDiscountChange = (val: string) => {
    const num = parseFloat(val) || 0
    if (num < 0) {
      setDiscountValue(0)
      return
    }
    if (discountType === 'percentage' && num > 100) {
      setDiscountValue(100)
      return
    }
    setDiscountValue(num)
  }

  const handleCheckoutClick = async () => {
    setErrorNotice(null)
    if (items.length === 0) {
      setErrorNotice('السلة فارغة، برجاء إضافة منتج أولاً.')
      return
    }

    if (paymentMethod === 'credit' && !customerName.trim()) {
      setErrorNotice('يرجى إدخال اسم العميل لإتمام عملية البيع بالأجل.')
      return
    }

    const paid = paymentMethod === 'credit' ? parsedCreditPaid : netTotal
    const remaining = paymentMethod === 'credit' ? creditRemaining : 0

    try {
      await onCheckout({
        paymentMethod,
        customerName: customerName.trim() || undefined,
        amountPaid: paid,
        remainingAmount: remaining,
        discountType,
        discountValue,
        calculatedDiscount,
        netTotal,
        receivedAmount: paymentMethod === 'cash' ? (parseFloat(receivedAmount) || undefined) : undefined,
      })
      // Reset inputs after successful sale
      setDiscountValue(0)
      setReceivedAmount('')
      setCustomerName('')
      setCreditPaidAmount('')
    } catch (err: any) {
      setErrorNotice(err?.message || 'حدث خطأ أثناء إتمام البيع')
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Cart Top Bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-black text-base text-foreground">سلة المبيعات</h2>
          <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
            {items.reduce((s, i) => s + i.quantity, 0)} قطعة
          </span>
        </div>

        {items.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClearCart}
            disabled={isCheckingOut}
            className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
          >
            <Trash2 className="h-3.5 w-3.5 ml-1" />
            تفريغ
          </Button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2 divide-y divide-border/40">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground select-none">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <ShoppingCart className="h-7 w-7 opacity-30 stroke-1" />
            </div>
            <p className="text-sm font-bold text-foreground">السلة فارغة</p>
            <p className="text-xs mt-1 max-w-[200px]">
              امسح باركود المنتج أو اضغط على أي كارت من قائمة المنتجات لإضافته هنا
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isAtMaxStock = item.quantity >= item.max_stock
            const lineTotal = item.quantity * item.unit_price

            return (
              <div
                key={item.product_id}
                className="py-2 px-2 hover:bg-muted/30 rounded-xl transition-colors flex items-center justify-between gap-2"
              >
                {/* Product Name & Unit Price (Right) */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="font-bold text-xs sm:text-sm text-foreground leading-tight truncate max-w-[130px] sm:max-w-[160px]"
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {isAtMaxStock && (
                      <span className="text-[9px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1 py-0.2 rounded shrink-0">
                        الحد ({item.max_stock})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono block mt-0.5">
                    {item.unit_price.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>

                {/* Quantity Stepper (Center - next to name) */}
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/70 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity - 1)
                    }
                    disabled={isCheckingOut}
                    className="w-6 h-6 rounded bg-background hover:bg-muted flex items-center justify-center text-foreground transition-colors disabled:opacity-50"
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <input
                    type="number"
                    min={1}
                    max={item.max_stock}
                    value={item.quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      onUpdateQuantity(item.product_id, val)
                    }}
                    disabled={isCheckingOut}
                    className="w-8 text-center font-black text-xs bg-transparent border-none focus:outline-none font-mono"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(item.product_id, item.quantity + 1)
                    }
                    disabled={isAtMaxStock || isCheckingOut}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                      isAtMaxStock
                        ? 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                        : 'bg-background hover:bg-muted text-foreground'
                    }`}
                    title={
                      isAtMaxStock
                        ? `أقصى كمية متوفرة: ${item.max_stock}`
                        : 'زيادة الكمية'
                    }
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Line Total & Delete Action (Left) */}
                <div className="flex items-center gap-1.5 shrink-0 pl-0.5">
                  <span className="font-black text-xs sm:text-sm text-foreground font-mono min-w-[55px] text-left">
                    {lineTotal.toLocaleString('ar-EG', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-[10px] font-medium text-muted-foreground">
                      ج.م
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product_id)}
                    disabled={isCheckingOut}
                    className="text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors"
                    title="حذف من السلة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Cart Summary & Checkout Footer (pinned) */}
      <div className="p-3 border-t border-border bg-muted/10 shrink-0 space-y-3">
        {/* Error notice if any */}
        {errorNotice && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="flex-1">{errorNotice}</span>
          </div>
        )}

        {/* Discount Row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs shrink-0">
            <button
              type="button"
              onClick={() => setDiscountType('fixed')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                discountType === 'fixed'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              ج.م
            </button>
            <button
              type="button"
              onClick={() => setDiscountType('percentage')}
              className={`px-2 py-1 rounded font-bold transition-all ${
                discountType === 'percentage'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              %
            </button>
          </div>

          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              placeholder={
                discountType === 'percentage'
                  ? 'نسبة الخصم...'
                  : 'مبلغ الخصم...'
              }
              value={discountValue || ''}
              onChange={(e) => handleDiscountChange(e.target.value)}
              disabled={isCheckingOut || items.length === 0}
              className={`h-8 text-xs font-mono ${
                discountType === 'percentage' ? 'pr-7 pl-2' : 'pr-9 pl-2'
              }`}
            />
            {discountType === 'percentage' ? (
              <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            ) : (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-muted-foreground pointer-events-none select-none">
                ج.م
              </span>
            )}
          </div>

          {calculatedDiscount > 0 && (
            <span className="text-xs font-bold text-destructive shrink-0">
              -{calculatedDiscount.toFixed(2)} ج.م
            </span>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            disabled={isCheckingOut}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
              paymentMethod === 'cash'
                ? 'bg-primary/10 border-primary text-primary shadow-xs'
                : 'bg-background border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <Banknote className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">نقداً</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            disabled={isCheckingOut}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
              paymentMethod === 'card'
                ? 'bg-primary/10 border-primary text-primary shadow-xs'
                : 'bg-background border-border text-muted-foreground hover:border-primary/50'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">بطاقة</span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod('credit')}
            disabled={isCheckingOut}
            className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
              paymentMethod === 'credit'
                ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-background border-border text-muted-foreground hover:border-amber-500/50'
            }`}
          >
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">بالأجل</span>
          </button>
        </div>

        {/* Customer Name Input (Always available: optional for cash/card, mandatory for credit) */}
        <div
          className={`space-y-2 p-2.5 rounded-xl border transition-all duration-200 ${
            paymentMethod === 'credit'
              ? 'bg-amber-500/10 border-amber-500/40 shadow-xs'
              : 'bg-muted/30 border-border/70'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <label
                className={`font-bold flex items-center gap-1.5 ${
                  paymentMethod === 'credit'
                    ? 'text-amber-800 dark:text-amber-300'
                    : 'text-foreground'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>
                  {paymentMethod === 'credit' ? (
                    <>
                      اسم العميل <span className="text-destructive font-black">* (مطلوب للأجل)</span>:
                    </>
                  ) : (
                    <>
                      اسم العميل <span className="text-muted-foreground font-normal">(اختياري للفاتورة)</span>:
                    </>
                  )}
                </span>
              </label>

              {customerName && (
                <button
                  type="button"
                  onClick={() => setCustomerName('')}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium"
                >
                  مسح
                </button>
              )}
            </div>

            <div className="relative">
              <Input
                type="text"
                list="pos-customer-names-list"
                placeholder={
                  paymentMethod === 'credit'
                    ? 'اكتب اسم العميل لتسجيل المديونية عليه...'
                    : 'اكتب اسم العميل (أو اتركه فارغاً)...'
                }
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={isCheckingOut}
                className={`h-8 text-xs bg-background ${
                  paymentMethod === 'credit'
                    ? 'border-amber-500/50 focus-visible:ring-amber-500 font-bold'
                    : 'border-border'
                }`}
                autoFocus={paymentMethod === 'credit'}
              />
              <datalist id="pos-customer-names-list">
                {customerNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Paid vs Remaining Breakdown ONLY when credit is selected */}
          {paymentMethod === 'credit' && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-500/20">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                  دفع مقدماً (كاش):
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={netTotal}
                    placeholder="0.00"
                    value={creditPaidAmount}
                    onChange={(e) => setCreditPaidAmount(e.target.value)}
                    disabled={isCheckingOut}
                    className="h-8 text-xs font-mono font-bold bg-background border-border pr-7 pl-1"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none select-none">
                    ج.م
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 block mb-0.5">
                  المتبقي عليه (دين):
                </span>
                <div className="h-8 px-2.5 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-between font-mono font-black text-xs text-amber-900 dark:text-amber-200">
                  <span>{creditRemaining.toFixed(2)}</span>
                  <span className="text-[10px] font-bold">ج.م</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cash Calculator (if cash is selected) */}
        {paymentMethod === 'cash' && items.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-muted/40 p-2 rounded-xl border border-border/60">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                المبلغ المستلم:
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[10px] text-muted-foreground block mb-0.5 font-medium">
                الباقي للعميل:
              </span>
              <span
                className={`font-mono font-black text-sm block ${
                  changeDue > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                }`}
              >
                {changeDue.toFixed(2)} ج.م
              </span>
            </div>
          </div>
        )}

        {/* Totals Breakdown */}
        <div className="space-y-1 text-xs pt-1 border-t border-border/70">
          <div className="flex justify-between text-muted-foreground">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold">{subtotal.toFixed(2)} ج.م</span>
          </div>

          <div className="flex justify-between items-center text-sm font-black pt-1">
            <span className="text-foreground">الصافي المطلوب:</span>
            <span className="text-lg font-black font-mono text-primary">
              {netTotal.toFixed(2)} ج.م
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          type="button"
          onClick={handleCheckoutClick}
          disabled={items.length === 0 || isCheckingOut}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري تسجيل الفاتورة...
            </>
          ) : (
            <>
              <Coins className="h-5 w-5" />
              إتمام عملية البيع
              <span className="font-mono mr-1 text-xs bg-emerald-700/50 px-2 py-0.5 rounded-full">
                {netTotal.toFixed(2)} ج.م
              </span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
