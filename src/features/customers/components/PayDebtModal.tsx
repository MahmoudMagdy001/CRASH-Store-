import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { payCustomerDebt } from '../api/customersApi'
import type { CustomerSummary } from '../types/customer.types'
import { formatCurrency } from '@/lib/formatters'
import {
  Coins,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  ArrowDownLeft,
  Sparkles,
} from 'lucide-react'

interface PayDebtModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerSummary | null
  onSuccess: () => void
}

export const PayDebtModal: React.FC<PayDebtModalProps> = ({
  open,
  onOpenChange,
  customer,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  if (!customer) return null

  const debt = customer.total_remaining
  const enteredNum = parseFloat(amount) || 0
  const payValue = Math.min(debt, Math.max(0, enteredNum))
  const remainingAfterPay = Math.max(0, debt - payValue)
  const isFullySettled = payValue > 0 && remainingAfterPay === 0

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')
      return
    }

    if (num > debt) {
      setError(`المبلغ المدخل (${num} ج.م) أكبر من إجمالي الدين المطلوب (${debt} ج.م)`)
      return
    }

    setIsLoading(true)
    try {
      await payCustomerDebt(customer.customer_name, num)
      setAmount('')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء تسجيل السداد')
    } finally {
      setIsLoading(false)
    }
  }

  const setQuickAmount = (val: number) => {
    const clamped = Math.min(debt, Math.max(1, Math.round(val)))
    setAmount(clamped.toString())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden rounded-2xl border-border bg-card shadow-2xl"
        dir="rtl"
      >
        {/* Header with decorative badge */}
        <DialogHeader className="p-5 pb-4 border-b border-border bg-muted/20 text-right">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-foreground">
                تسجيل سداد دفعة / تسوية دين
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                خصم دفعة من رصيد العميل وتحديث الفواتير الآجلة تلقائياً
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handlePay} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 animate-in fade-in-50">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Customer & Current Debt Card */}
          <div className="bg-muted/40 p-3.5 rounded-2xl border border-border/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shrink-0 border border-primary/20">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  العميل
                </span>
                <span className="text-sm font-black text-foreground block truncate">
                  {customer.customer_name}
                </span>
              </div>
            </div>

            <div className="text-left shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground block">
                الدين الحالي
              </span>
              <span className="text-sm sm:text-base font-black font-mono text-amber-600 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-lg border border-amber-500/30 inline-block">
                {debt.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
              </span>
            </div>
          </div>

          {/* Payment Input Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-foreground">
                المبلغ المراد سداده:
              </label>
              <button
                type="button"
                onClick={() => setAmount(debt.toString())}
                className="text-primary hover:text-primary/80 font-bold transition-colors flex items-center gap-1"
              >
                <ArrowDownLeft className="h-3 w-3" />
                سداد كامل المبلغ ({debt.toFixed(2)} ج.م)
              </button>
            </div>

            {/* Input with clean EGP adornment and no spin arrows */}
            <div className="relative">
              <Input
                type="number"
                step="any"
                min={1}
                max={debt}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
                className="h-12 text-base font-mono font-black text-foreground pl-14 pr-3.5 rounded-xl border-border bg-background focus-visible:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                autoFocus
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-bold text-xs pointer-events-none select-none border border-border/60">
                ج.م
              </div>
            </div>

            {/* Quick preset chips */}
            {debt > 0 && (
              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-medium ml-1">
                  اقتراحات سريعة:
                </span>
                <button
                  type="button"
                  onClick={() => setQuickAmount(debt)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/20 transition-colors"
                >
                  الكامل (100%)
                </button>
                {debt >= 20 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(debt / 2)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium border border-border transition-colors font-mono"
                  >
                    النصف ({(debt / 2).toFixed(0)} ج.م)
                  </button>
                )}
                {debt > 100 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(100)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium border border-border transition-colors font-mono"
                  >
                    100 ج.م
                  </button>
                )}
                {debt > 50 && (
                  <button
                    type="button"
                    onClick={() => setQuickAmount(50)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-medium border border-border transition-colors font-mono"
                  >
                    50 ج.م
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Real-time Calculation Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>الدين قبل السداد:</span>
              <span className="font-mono font-bold text-foreground">
                {formatCurrency(debt)}
              </span>
            </div>

            {payValue > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                <span>المبلغ المخصوم (المدفوع):</span>
                <span className="font-mono">
                  -{formatCurrency(payValue)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-border flex justify-between items-center font-black">
              <span className="text-foreground">المتبقي على العميل بعد السداد:</span>
              <span
                className={`font-mono text-sm px-2.5 py-0.5 rounded-lg border ${
                  isFullySettled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                }`}
              >
                {formatCurrency(remainingAfterPay)}
              </span>
            </div>

            {isFullySettled && (
              <div className="pt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>سيتم تصفية كامل حساب العميل وسيصبح الرصيد 0 ج.م</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="h-11 rounded-xl text-xs font-bold"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري السداد...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  تأكيد خصم السداد
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
