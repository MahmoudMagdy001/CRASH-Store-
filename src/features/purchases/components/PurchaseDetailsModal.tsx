import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useReactToPrint } from 'react-to-print'
import type { PurchaseWithDetails } from '../api/purchasesApi'
import { Printer, Calendar, User, Truck, FileText } from 'lucide-react'

interface PurchaseDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchase: PurchaseWithDetails | null
}

export const PurchaseDetailsModal: React.FC<PurchaseDetailsModalProps> = ({
  open,
  onOpenChange,
  purchase,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printContentRef,
    documentTitle: `فاتورة_توريد_${purchase?.id.slice(0, 8) || ''}`,
  })

  if (!purchase) return null

  const items = purchase.purchase_items || []
  const totalUnits = items.reduce((acc, itm) => acc + itm.quantity, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            تفاصيل فاتورة التوريد #{purchase.id.slice(0, 8)}
          </DialogTitle>
          <DialogDescription>
            بيانات الفاتورة والأصناف الموردة ومبالغ التكلفة المسجلة بالمخزن.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Area */}
        <div ref={printContentRef} className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0 print:p-4 print:max-h-none">
          {/* Header Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/40 border">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-primary" />
                المورد
              </div>
              <div className="font-bold text-sm text-foreground">
                {purchase.supplier_name || 'مورد عام'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                التاريخ
              </div>
              <div className="text-xs font-semibold text-foreground">
                {new Date(purchase.created_at).toLocaleString('ar-EG', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                المسئول
              </div>
              <div className="text-xs font-semibold text-foreground">
                {purchase.creator?.full_name || 'المسئول'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">إجمالي الفاتورة</div>
              <div className="text-base font-bold text-primary font-mono">
                {Number(purchase.total_amount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}{' '}
                ج.م
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <table className="w-full text-right text-sm">
              <thead className="bg-muted/60 text-muted-foreground font-semibold text-xs border-b">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">اسم المنتج</th>
                  <th className="py-3 px-4">الباركود</th>
                  <th className="py-3 px-4 text-center">الكمية</th>
                  <th className="py-3 px-4 text-center">سعر التكلفة</th>
                  <th className="py-3 px-4 text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                      لا توجد بنود مسجلة في هذه الفاتورة
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => {
                    const lineTotal = item.quantity * item.unit_cost
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                          {index + 1}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {item.product?.name || 'منتج غير معروف'}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">
                          {item.product?.barcode || '-'}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-center font-mono">
                          {Number(item.unit_cost).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          ج.م
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-foreground font-mono">
                          {lineTotal.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          ج.م
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              <tfoot className="bg-muted/40 font-semibold text-xs border-t">
                <tr>
                  <td colSpan={3} className="py-3 px-4">
                    المجموع الكلي: ({items.length} أصناف)
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-sm">
                    {totalUnits} قطعة
                  </td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-left text-primary font-mono text-base font-black">
                    {Number(purchase.total_amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })}{' '}
                    ج.م
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button type="button" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة الفاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
