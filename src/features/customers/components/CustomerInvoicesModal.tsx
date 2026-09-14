import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { CustomerSummary } from '../types/customer.types'
import type { SaleWithDetails } from '@/features/pos/types/pos.types'
import { FileText, Printer, Clock, CreditCard, Banknote } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface CustomerInvoicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: CustomerSummary | null
  onOpenReceipt: (sale: SaleWithDetails) => void
}

export const CustomerInvoicesModal: React.FC<CustomerInvoicesModalProps> = ({
  open,
  onOpenChange,
  customer,
  onOpenReceipt,
}) => {
  if (!customer) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[85vh] flex flex-col rounded-2xl" dir="rtl">
        <DialogHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-black text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              فواتير العميل: <span className="text-primary">{customer.customer_name}</span>
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                إجمالي المشتريات: <strong className="text-foreground">{formatCurrency(customer.total_sales)}</strong>
              </span>
              <span className="text-muted-foreground">
                المتبقي (دين): <strong className="text-amber-600 dark:text-amber-400 font-mono">{formatCurrency(customer.total_remaining)}</strong>
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {customer.sales.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              لا توجد فواتير مسجلة لهذا العميل
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">رقم الفاتورة</th>
                  <th className="py-2.5 px-3">التاريخ والوقت</th>
                  <th className="py-2.5 px-3">طريقة الدفع</th>
                  <th className="py-2.5 px-3 text-center">الأصناف</th>
                  <th className="py-2.5 px-3">الإجمالي</th>
                  <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">المدفوع</th>
                  <th className="py-2.5 px-3 text-amber-600 dark:text-amber-400">المتبقي</th>
                  <th className="py-2.5 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customer.sales.map((sale) => {
                  const saleDate = new Date(sale.created_at)
                  const isCredit = sale.payment_method === 'credit'
                  const paid = Number(sale.amount_paid ?? sale.total_amount)
                  const remain = Number(sale.remaining_amount || 0)
                  const itemsCount = sale.sale_items?.length || 0

                  return (
                    <tr key={sale.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        {sale.invoice_number}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground text-[11px]">
                        {saleDate.toLocaleDateString('ar-EG', {
                          year: 'numeric',
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
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isCredit
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : sale.payment_method === 'card'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isCredit ? (
                            <>
                              <Clock className="h-3 w-3" />
                              بالأجل
                            </>
                          ) : sale.payment_method === 'card' ? (
                            <>
                              <CreditCard className="h-3 w-3" />
                              بطاقة
                            </>
                          ) : (
                            <>
                              <Banknote className="h-3 w-3" />
                              نقداً
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        {itemsCount}
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-foreground">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(paid)}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {remain > 0 ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {formatCurrency(remain)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">٠٫٠٠ ج.م</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onOpenChange(false)
                            onOpenReceipt(sale)
                          }}
                          className="h-7 text-xs text-primary hover:bg-primary/10 gap-1 px-2"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          إيصال
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
