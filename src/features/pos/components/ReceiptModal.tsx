import React, { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ReceiptPrintTemplate } from './ReceiptPrintTemplate'
import type { SaleWithDetails, SettingsRow } from '../types/pos.types'
import { Printer, CheckCircle2, PlusCircle } from 'lucide-react'
import { formatCurrency, formatNumber } from '@/lib/formatters'

interface ReceiptModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: SaleWithDetails | null
  settings: SettingsRow | null
  onNewSale?: () => void
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  open,
  onOpenChange,
  sale,
  settings,
  onNewSale,
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: sale ? `فاتورة_${sale.invoice_number}` : 'receipt',
  })

  if (!sale) return null

  const items = sale.sale_items || []
  const subtotal = items.reduce(
    (acc, itm) => acc + Number(itm.quantity) * Number(itm.unit_price),
    0
  )
  const discount = Number(sale.discount || 0)
  const grandTotal = Number(sale.total_amount)

  const handleCloseAndNewSale = () => {
    onOpenChange(false)
    if (onNewSale) {
      onNewSale()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="md">
        <DialogHeader className="text-center sm:text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl font-black text-center">
            تم تسجيل عملية البيع بنجاح!
          </DialogTitle>
          <DialogDescription className="text-center">
            فاتورة رقم: <span className="font-mono font-bold text-foreground">{sale.invoice_number}</span>
          </DialogDescription>
        </DialogHeader>

        {/* On-screen visual receipt preview */}
        <div className="flex-1 overflow-y-auto min-h-0 px-2 py-3 space-y-4">
          <div className="border border-border/80 rounded-xl bg-card p-4 space-y-3 shadow-inner">
            {/* Header info */}
            <div className="flex justify-between items-center text-xs pb-2 border-b border-dashed">
              <span className="text-muted-foreground">الكاشير المسجل:</span>
              <span className="font-bold">{sale.cashier?.full_name || 'مدير النظام'}</span>
            </div>

            {/* Customer name if credit/deferred */}
            {sale.customer_name && (
              <div className="flex justify-between items-center text-xs pb-2 border-b border-dashed">
                <span className="text-muted-foreground">اسم العميل:</span>
                <span className="font-bold text-foreground">{sale.customer_name}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs pb-2 border-b border-dashed">
              <span className="text-muted-foreground">طريقة الدفع:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded ${
                  sale.payment_method === 'credit'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : sale.payment_method === 'card'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {sale.payment_method === 'credit'
                  ? 'بالأجل (دين)'
                  : sale.payment_method === 'card'
                  ? 'بطاقة بنكية'
                  : 'نقداً'}
              </span>
            </div>

            {/* Items preview */}
            <div className="space-y-1.5 py-1">
              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                الأصناف المباعة ({items.length}):
              </span>
              <div className="divide-y divide-border/60 max-h-48 overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const lineTotal = Number(item.quantity) * Number(item.unit_price)
                  return (
                    <div
                      key={idx}
                      className="py-1.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex-1 pr-1 truncate">
                        <span className="font-medium text-foreground block truncate">
                          {item.products?.name || 'صنف'}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatNumber(item.quantity)} × {formatCurrency(item.unit_price)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Totals box */}
            <div className="pt-2 border-t space-y-1.5 text-xs bg-muted/30 p-3 rounded-lg">
              <div className="flex justify-between text-muted-foreground">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>الخصم المطبق:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t text-sm font-extrabold text-foreground">
                <span>إجمالي الفاتورة:</span>
                <span className="text-base text-primary font-mono font-black">
                  {formatCurrency(grandTotal)}
                </span>
              </div>

              {sale.payment_method === 'credit' && (
                <div className="pt-2 border-t border-dashed border-amber-500/40 space-y-1 font-bold">
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>المدفوع مقدماً:</span>
                    <span className="font-mono">{formatCurrency(sale.amount_paid || 0)}</span>
                  </div>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 text-sm">
                    <span>المتبقي عليه (دين):</span>
                    <span className="font-mono font-black">{formatCurrency(sale.remaining_amount || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden 80mm thermal receipt container */}
        <ReceiptPrintTemplate ref={printRef} sale={sale} settings={settings} />

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseAndNewSale}
            className="flex-1 flex items-center justify-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            فاتورة جديدة
          </Button>

          <Button
            type="button"
            variant="default"
            onClick={() => handlePrint()}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Printer className="h-4 w-4" />
            طباعة الفاتورة (80mm)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
