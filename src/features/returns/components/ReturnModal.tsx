import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processReturn, getReturnsBySaleId } from '../api/returnsApi'
import type { SaleWithDetails } from '@/features/pos/types/pos.types'
import type { ReturnItemState } from '../types/returns.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import {
  Undo2,
  Package,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Info,
} from 'lucide-react'

interface ReturnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: SaleWithDetails | null
  onSuccess?: () => void
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  open,
  onOpenChange,
  sale,
  onSuccess,
}) => {
  const queryClient = useQueryClient()

  const [returnType, setReturnType] = useState<'partial' | 'full'>('partial')
  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [userSelections, setUserSelections] = useState<
    Record<string, { selected: boolean; return_quantity: number }>
  >({})

  // ─── Fetch existing returns for this sale (to know already-returned quantities) ──
  const { data: existingReturns = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['returns-by-sale', sale?.id],
    queryFn: () => getReturnsBySaleId(sale!.id),
    enabled: open && !!sale?.id,
  })

  // ─── Derived items state: auto-computes without setting state in effects ───
  const items: ReturnItemState[] = useMemo(() => {
    if (!sale) return []

    const alreadyReturnedMap: Record<string, number> = {}
    existingReturns.forEach((ret) => {
      ret.return_items.forEach((ri) => {
        alreadyReturnedMap[ri.sale_item_id] =
          (alreadyReturnedMap[ri.sale_item_id] || 0) + ri.quantity
      })
    })

    return (sale.sale_items || []).map((si) => {
      const alreadyRet = alreadyReturnedMap[si.id] || 0
      const available = Math.max(0, si.quantity - alreadyRet)
      const custom = userSelections[si.id]

      let selected = false
      let return_quantity = 0

      if (returnType === 'full') {
        selected = available > 0
        return_quantity = available
      } else if (custom) {
        selected = custom.selected
        return_quantity = Math.min(custom.return_quantity, available)
      }

      return {
        sale_item_id: si.id,
        product_id: si.product_id,
        product_name: si.products?.name || 'منتج غير معروف',
        barcode: si.products?.barcode || null,
        original_quantity: si.quantity,
        already_returned: alreadyRet,
        available_to_return: available,
        return_quantity,
        unit_price: si.unit_price,
        selected,
      }
    })
  }, [sale, existingReturns, userSelections, returnType])

  // ─── Pro-rated discount calculation ──────────────────────────────────────
  const saleSubtotal = useMemo(() => {
    if (!sale) return 0
    return (sale.sale_items || []).reduce(
      (sum, si) => sum + si.quantity * Number(si.unit_price || 0),
      0
    )
  }, [sale])

  const saleDiscount = Math.max(0, Number(sale?.discount || 0))
  const saleNetTotal = Math.max(0, Number(sale?.total_amount || 0))

  const discountRatio = useMemo(() => {
    if (!sale || saleSubtotal <= 0 || saleDiscount <= 0) return 1
    return Math.max(0, Math.min(1, saleNetTotal / saleSubtotal))
  }, [sale, saleSubtotal, saleDiscount, saleNetTotal])

  // Total already returned on this sale
  const alreadyReturnedTotal = useMemo(() => {
    return existingReturns.reduce(
      (sum, ret) => sum + Number(ret.total_returned || 0),
      0
    )
  }, [existingReturns])

  const remainingSaleNetCapacity = Math.max(0, saleNetTotal - alreadyReturnedTotal)

  // Undiscounted raw sum of selected items to return
  const rawReturnAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.selected && item.return_quantity > 0) {
        return sum + item.return_quantity * item.unit_price
      }
      return sum
    }, 0)
  }, [items])

  const isAllAvailableSelected = useMemo(() => {
    return (
      items.length > 0 &&
      items.every(
        (i) =>
          i.available_to_return === 0 ||
          (i.selected && i.return_quantity === i.available_to_return)
      )
    )
  }, [items])

  // Net refund amount taking into account invoice discount
  const totalReturnAmount = useMemo(() => {
    if (returnType === 'full' || isAllAvailableSelected) {
      return remainingSaleNetCapacity
    }
    const prorated = Math.round(rawReturnAmount * discountRatio * 100) / 100
    return Math.min(remainingSaleNetCapacity, prorated)
  }, [
    returnType,
    isAllAvailableSelected,
    remainingSaleNetCapacity,
    rawReturnAmount,
    discountRatio,
  ])

  const totalDiscountDeduction = useMemo(() => {
    return Math.max(0, rawReturnAmount - totalReturnAmount)
  }, [rawReturnAmount, totalReturnAmount])

  const selectedItemsCount = items.filter(
    (i) => i.selected && i.return_quantity > 0
  ).length

  // ─── Toggle item selection ────────────────────────────────────────────────
  const toggleItem = (saleItemId: string, available: number) => {
    setUserSelections((prev) => {
      const current = prev[saleItemId]
      const nextSelected = !current?.selected
      return {
        ...prev,
        [saleItemId]: {
          selected: nextSelected,
          return_quantity: nextSelected ? available : 0,
        },
      }
    })
  }

  // ─── Update quantity for an item ─────────────────────────────────────────
  const updateQuantity = (
    saleItemId: string,
    value: number,
    available: number
  ) => {
    const clamped = Math.max(0, Math.min(value, available))
    setUserSelections((prev) => ({
      ...prev,
      [saleItemId]: {
        selected: clamped > 0,
        return_quantity: clamped,
      },
    }))
  }

  // ─── Reset modal state on close ───────────────────────────────────────────
  const handleClose = () => {
    setUserSelections({})
    setReturnType('partial')
    setReason('')
    setErrorMsg('')
    setSuccessMsg('')
    onOpenChange(false)
  }

  // ─── Mutation ─────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: () => {
      const activeItems = items.filter((i) => i.selected && i.return_quantity > 0)
      return processReturn({
        sale_id: sale!.id,
        return_type: returnType,
        items: activeItems.map((i) => ({
          sale_item_id: i.sale_item_id,
          product_id: i.product_id,
          quantity: i.return_quantity,
          unit_price: i.unit_price,
        })),
        reason: reason.trim() || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-ledger'] })
      queryClient.invalidateQueries({ queryKey: ['returns-list'] })
      queryClient.invalidateQueries({ queryKey: ['returns-by-sale', sale?.id] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      setSuccessMsg('✓ تم تسجيل الاسترجاع بنجاح')
      onSuccess?.()
      setTimeout(() => {
        handleClose()
      }, 1800)
    },
    onError: (err: Error) => {
      setErrorMsg(err.message)
    },
  })

  const handleSubmit = () => {
    setErrorMsg('')
    const hasValidItems = items.some((i) => i.selected && i.return_quantity > 0)
    if (!hasValidItems) {
      setErrorMsg('يرجى تحديد صنف واحد على الأقل وكميته للاسترجاع.')
      return
    }
    mutation.mutate()
  }

  if (!sale) return null

  const allItemsFullyReturned =
    items.length > 0 && items.every((i) => i.available_to_return === 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
          dir="rtl"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <Undo2 className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h2 className="font-black text-base text-foreground">
                  استرجاع من فاتورة
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {sale.invoice_number}
                  {sale.customer_name && (
                    <span className="mr-2 text-foreground font-bold">
                      — {sale.customer_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={mutation.isPending}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Success Message */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {successMsg}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* All items already returned notice */}
            {allItemsFullyReturned && !isLoadingHistory && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm font-semibold">
                <Info className="h-4 w-4 shrink-0" />
                جميع أصناف هذه الفاتورة تم استرجاعها بالكامل مسبقاً.
              </div>
            )}

            {/* Return Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">
                نوع الاسترجاع
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReturnType('partial')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border transition-all ${
                    returnType === 'partial'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  استرجاع جزئي
                </button>
                <button
                  type="button"
                  onClick={() => setReturnType('full')}
                  disabled={allItemsFullyReturned}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    returnType === 'full'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                      : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  استرجاع كلي
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5" />
                الأصناف
              </label>

              {isLoadingHistory ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-14 bg-muted animate-pulse rounded-xl"
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 w-8"></th>
                        <th className="py-2.5 px-3">الصنف</th>
                        <th className="py-2.5 px-3 text-center">المباع</th>
                        <th className="py-2.5 px-3 text-center text-amber-600">
                          مسترجع
                        </th>
                        <th className="py-2.5 px-3 text-center text-rose-600">
                          كمية الاسترجاع
                        </th>
                        <th className="py-2.5 px-3">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item) => {
                        const lineTotal = item.selected
                          ? item.return_quantity * item.unit_price
                          : 0
                        const isFullyReturned = item.available_to_return === 0

                        return (
                          <tr
                            key={item.sale_item_id}
                            className={`transition-colors ${
                              isFullyReturned
                                ? 'opacity-40 cursor-not-allowed bg-muted/20'
                                : item.selected
                                ? 'bg-rose-500/5'
                                : 'hover:bg-muted/20'
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                disabled={
                                  isFullyReturned || returnType === 'full'
                                }
                                onChange={() =>
                                  toggleItem(
                                    item.sale_item_id,
                                    item.available_to_return
                                  )
                                }
                                className="h-4 w-4 rounded accent-rose-600 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* Product name */}
                            <td className="py-3 px-3 font-semibold text-foreground">
                              <div>{item.product_name}</div>
                              {item.barcode && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {item.barcode}
                                </div>
                              )}
                              {isFullyReturned && (
                                <div className="text-[10px] text-amber-600 font-bold">
                                  ✓ مسترجع بالكامل
                                </div>
                              )}
                            </td>

                            {/* Original qty */}
                            <td className="py-3 px-3 text-center font-mono font-bold">
                              {item.original_quantity}
                            </td>

                            {/* Already returned */}
                            <td className="py-3 px-3 text-center font-mono text-amber-600 dark:text-amber-400">
                              {item.already_returned > 0
                                ? item.already_returned
                                : '—'}
                            </td>

                            {/* Return quantity input */}
                            <td className="py-3 px-3 text-center">
                              {isFullyReturned ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <Input
                                  type="number"
                                  min={0}
                                  max={item.available_to_return}
                                  value={item.return_quantity || ''}
                                  disabled={
                                    returnType === 'full' || !item.selected
                                  }
                                  onChange={(e) =>
                                    updateQuantity(
                                      item.sale_item_id,
                                      parseInt(e.target.value, 10) || 0,
                                      item.available_to_return
                                    )
                                  }
                                  className="h-8 w-20 text-center text-xs font-mono font-bold mx-auto"
                                  placeholder="0"
                                />
                              )}
                            </td>

                            {/* Line total */}
                            <td className="py-3 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                              {item.selected && lineTotal > 0 ? (
                                <div>
                                  <span>
                                    {(discountRatio < 1
                                      ? Math.round(lineTotal * discountRatio * 100) / 100
                                      : lineTotal
                                    ).toLocaleString('ar-EG', {
                                      minimumFractionDigits: 2,
                                    })}{' '}
                                    ج.م
                                  </span>
                                  {discountRatio < 1 && (
                                    <span className="block text-[10px] text-muted-foreground line-through font-normal">
                                      {lineTotal.toLocaleString('ar-EG', {
                                        minimumFractionDigits: 2,
                                      })}{' '}
                                      ج.م
                                    </span>
                                  )}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">
                سبب الاسترجاع (اختياري)
              </label>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: عيب في المنتج، خطأ في الطلب..."
                className="h-10 text-sm"
              />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-border p-4 flex items-center justify-between gap-3 bg-muted/20">
            {/* Total */}
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground font-medium">
                إجمالي المبلغ المسترد للعميل
              </span>
              <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400">
                {totalReturnAmount.toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-bold text-muted-foreground">
                  ج.م
                </span>
              </span>
              {totalDiscountDeduction > 0 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                  (تم خصم نصيب الخصم: -{totalDiscountDeduction.toLocaleString('ar-EG', { maximumFractionDigits: 1 })} ج.م)
                </span>
              )}
              {selectedItemsCount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {selectedItemsCount} صنف محدد
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="h-9 px-4 font-bold"
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  mutation.isPending ||
                  allItemsFullyReturned ||
                  selectedItemsCount === 0 ||
                  totalReturnAmount === 0
                }
                className="h-9 px-5 font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جارٍ المعالجة...</span>
                  </>
                ) : (
                  <>
                    <Undo2 className="h-4 w-4" />
                    <span>تأكيد الاسترجاع</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
