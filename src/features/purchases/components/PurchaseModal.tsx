import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductCombobox, type SelectedProductValue } from './ProductCombobox'
import { createProduct, type ProductWithCategory } from '@/features/products/api/productsApi'
import type { Category } from '@/features/categories/api/categoriesApi'
import type {
  CreatePurchaseInput,
  PurchaseWithDetails,
  PurchaseItemWithProduct,
} from '../api/purchasesApi'
import { Plus, Trash2, PackagePlus, AlertCircle, ShoppingCart } from 'lucide-react'

interface PurchaseItemRow {
  id: string // temporary client id
  product_id: string | null
  product_name: string
  is_new: boolean
  quantity: number
  unit_cost: number
  sale_price: number
  update_product_prices: boolean
}

interface PurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  purchaseToEdit?: PurchaseWithDetails | null
  products: ProductWithCategory[]
  categories: Category[]
  onProductCreated?: (newProduct: ProductWithCategory) => void
  onSubmit: (data: CreatePurchaseInput) => Promise<void>
  isLoading?: boolean
}

let purchaseRowSeq = 0
function createPurchaseItem(overrides?: Partial<PurchaseItemRow>): PurchaseItemRow {
  return {
    id: `item_${++purchaseRowSeq}_${Date.now()}`,
    product_id: null,
    product_name: '',
    is_new: false,
    quantity: 1,
    unit_cost: 0,
    sale_price: 0,
    update_product_prices: true,
    ...overrides,
  }
}

const PurchaseModalInner: React.FC<Omit<PurchaseModalProps, 'open'>> = ({
  onOpenChange,
  purchaseToEdit,
  products,
  categories,
  onProductCreated,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(purchaseToEdit)
  const [supplierName, setSupplierName] = useState(purchaseToEdit?.supplier_name || '')
  const [invoiceDate, setInvoiceDate] = useState(
    purchaseToEdit?.created_at
      ? new Date(purchaseToEdit.created_at).toISOString().slice(0, 16)
      : new Date().toISOString().slice(0, 16)
  )
  const [items, setItems] = useState<PurchaseItemRow[]>(() => {
    if (purchaseToEdit?.purchase_items && purchaseToEdit.purchase_items.length > 0) {
      return purchaseToEdit.purchase_items.map((item: PurchaseItemWithProduct) =>
        createPurchaseItem({
          product_id: item.product_id,
          product_name: item.product?.name || '',
          is_new: false,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          sale_price: item.product?.sale_price || item.unit_cost,
          update_product_prices: false,
        })
      )
    }
    return [createPurchaseItem()]
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isProcessingNewProducts, setIsProcessingNewProducts] = useState(false)

  const handleAddItemRow = () => {
    setItems((prev) => [...prev, createPurchaseItem()])
  }

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) {
      setErrorMsg('يجب أن تحتوي الفاتورة على صنف واحد على الأقل')
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
    setErrorMsg(null)
  }

  const handleProductSelectionChange = (
    rowId: string,
    selected: SelectedProductValue,
    matchedProduct?: ProductWithCategory
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          if (matchedProduct) {
            return {
              ...item,
              product_id: matchedProduct.id,
              product_name: matchedProduct.name,
              is_new: false,
              unit_cost: matchedProduct.purchase_price,
              sale_price: matchedProduct.sale_price,
            }
          }
          return {
            ...item,
            product_id: selected.product_id,
            product_name: selected.name,
            is_new: selected.is_new,
            unit_cost: item.unit_cost,
            sale_price: item.sale_price,
          }
        }
        return item
      })
    )
    setErrorMsg(null)
  }

  const handleQuantityChange = (rowId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, quantity: Math.max(1, quantity) } : item))
    )
  }

  const handleUnitCostChange = (rowId: string, unit_cost: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === rowId) {
          const newCost = Math.max(0, unit_cost)
          return {
            ...item,
            unit_cost: newCost,
            // If it's a new product and sale_price hasn't been touched yet, default to cost
            sale_price: item.is_new && item.sale_price === 0 ? newCost : item.sale_price,
          }
        }
        return item
      })
    )
  }

  const handleSalePriceChange = (rowId: string, sale_price: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, sale_price: Math.max(0, sale_price) } : item))
    )
  }

  const handleUpdatePricesToggle = (rowId: string, update_product_prices: boolean) => {
    setItems((prev) =>
      prev.map((item) => (item.id === rowId ? { ...item, update_product_prices } : item))
    )
  }

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!supplierName.trim()) {
      setErrorMsg('يرجى إدخال اسم المورد أو الشركة الموردة')
      return
    }

    // Validate that all items have a product selected or named
    for (let i = 0; i < items.length; i++) {
      const itm = items[i]
      if (!itm.product_name.trim()) {
        setErrorMsg(`يرجى اختيار أو كتابة اسم المنتج في البند رقم ${i + 1}`)
        return
      }
      if (itm.quantity <= 0) {
        setErrorMsg(`الكمية في البند رقم ${i + 1} يجب أن تكون أكبر من صفر`)
        return
      }
    }

    try {
      setIsProcessingNewProducts(true)

      // Resolve items: If any item is a new product, create it in DB right now!
      const resolvedItems: CreatePurchaseInput['items'] = []

      for (const item of items) {
        let finalProductId = item.product_id

        // If it's a new product or not linked to an ID yet
        if (!finalProductId || item.is_new) {
          // Double check if a product with the exact same name already exists
          const existing = products.find(
            (p) => p.name.trim().toLowerCase() === item.product_name.trim().toLowerCase()
          )

          if (existing) {
            finalProductId = existing.id
          } else {
            // Create the new product automatically
            const newProduct = await createProduct({
              name: item.product_name.trim(),
              category_id: categories.length > 0 ? categories[0].id : null,
              purchase_price: item.unit_cost,
              sale_price: item.sale_price || item.unit_cost,
              quantity: 0, // Stock will be added automatically by the purchase trigger!
              min_quantity_alert: 3,
              is_active: true,
            })

            finalProductId = newProduct.id

            // Notify parent to update products cache
            onProductCreated?.({
              ...newProduct,
              category: categories.find((c) => c.id === newProduct.category_id) || null,
            })
          }
        }

        resolvedItems.push({
          product_id: finalProductId,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          sale_price: item.sale_price,
          update_product_prices: item.update_product_prices,
        })
      }

      // Submit the complete purchase invoice
      await onSubmit({
        supplier_name: supplierName.trim(),
        created_at: new Date(invoiceDate).toISOString(),
        items: resolvedItems,
      })

      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الفاتورة'
      setErrorMsg(msg)
    } finally {
      setIsProcessingNewProducts(false)
    }
  }

  return (
    <DialogContent onClose={() => onOpenChange(false)} maxWidth="4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            {isEditing
              ? `تعديل فاتورة التوريد #${purchaseToEdit?.id.slice(0, 8)}`
              : 'تسجيل فاتورة توريد / مشتريات جديدة'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'تعديل اسم المورد أو الكميات أو أسعار البنود. سيتم ضبط رصيد المخزون تلقائياً.'
              : 'اختر المنتج من القائمة أو اكتب اسم صنف جديد مباشرة وسيتكفل النظام بإضافته للمنتجات وتحديث المخزون.'}
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto min-h-0">
            {/* Header Fields: Supplier & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border">
              <div className="space-y-1.5">
                <Label htmlFor="supplier_name">اسم المورد / التاجر *</Label>
                <Input
                  id="supplier_name"
                  placeholder="مثال: شركة النور للأجهزة الإلكترونية"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  disabled={isLoading || isProcessingNewProducts}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invoice_date">تاريخ وتوقيت التوريد *</Label>
                <Input
                  id="invoice_date"
                  type="datetime-local"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  disabled={isLoading || isProcessingNewProducts}
                  required
                />
              </div>
            </div>

            {/* Items Table Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  أصناف وبنود الفاتورة ({items.length})
                </h3>
              </div>

              <div className="space-y-3">
                {items.map((row, index) => {
                  const rowTotal = row.quantity * row.unit_cost

                  return (
                    <div
                      key={row.id}
                      className="p-3.5 rounded-xl border bg-card/60 hover:border-border transition-colors space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        {/* Product selection / creation via Combobox (takes all remaining space) */}
                        <div className="flex-1 min-w-[220px] space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-muted-foreground">
                              الصنف #{index + 1}
                            </Label>
                            {row.is_new && (
                              <span className="text-[11px] font-bold text-primary">
                                جديد ✨
                              </span>
                            )}
                          </div>

                          <ProductCombobox
                            products={products}
                            value={{
                              product_id: row.product_id,
                              name: row.product_name,
                              is_new: row.is_new,
                            }}
                            onChange={(val, matched) =>
                              handleProductSelectionChange(row.id, val, matched)
                            }
                            disabled={isLoading || isProcessingNewProducts}
                            placeholder="اختر من القائمة أو اكتب اسم صنف جديد..."
                          />
                        </div>

                        {/* Quantity (Compact w-20) */}
                        <div className="w-full sm:w-20 shrink-0 space-y-1">
                          <Label className="text-xs font-semibold text-muted-foreground">الكمية</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={row.quantity}
                            onChange={(e) => handleQuantityChange(row.id, Number(e.target.value))}
                            disabled={isLoading || isProcessingNewProducts}
                            className="text-center font-mono px-1 text-sm"
                          />
                        </div>

                        {/* Purchase Price / Unit Cost (Compact w-28) */}
                        <div className="w-full sm:w-28 shrink-0 space-y-1">
                          <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            سعر الشراء *
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unit_cost}
                              onChange={(e) => handleUnitCostChange(row.id, Number(e.target.value))}
                              disabled={isLoading || isProcessingNewProducts}
                              className="text-center font-mono pl-6 pr-2 text-sm"
                            />
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-sans pointer-events-none">
                              ج.م
                            </span>
                          </div>
                        </div>

                        {/* Sale Price (Compact w-28) */}
                        <div className="w-full sm:w-28 shrink-0 space-y-1">
                          <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                            سعر البيع *
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.sale_price}
                              onChange={(e) => handleSalePriceChange(row.id, Number(e.target.value))}
                              disabled={isLoading || isProcessingNewProducts}
                              className="text-center font-mono pl-6 pr-2 text-sm"
                            />
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-sans pointer-events-none">
                              ج.م
                            </span>
                          </div>
                        </div>

                        {/* Line Total & Remove (Compact w-28) */}
                        <div className="w-full sm:w-28 shrink-0 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-6">
                          <div className="text-left sm:text-right">
                            <div className="text-[10px] text-muted-foreground leading-none">الإجمالي</div>
                            <div className="text-xs font-bold text-foreground font-mono whitespace-nowrap mt-1">
                              {rowTotal.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItemRow(row.id)}
                            disabled={items.length <= 1 || isLoading || isProcessingNewProducts}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="حذف هذا الصنف من الفاتورة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Extra item options */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs pt-1 border-t border-border/40 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={row.update_product_prices}
                            onChange={(e) => handleUpdatePricesToggle(row.id, e.target.checked)}
                            className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                          />
                          <span>
                            تحديث أسعار المنتج في بطاقة الصنف (شراء: {row.unit_cost} ج.م | بيع: {row.sale_price} ج.م)
                          </span>
                        </label>

                        {row.is_new && (
                          <span className="text-[11px] text-primary font-medium">
                            ✨ سيتم حفظ المنتج تلقائياً في قائمة المنتجات
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddItemRow}
                disabled={isLoading || isProcessingNewProducts}
                className="w-full border-dashed gap-2 py-5 text-sm hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                إضافة صنف آخر للفاتورة
              </Button>
            </div>

            {/* Invoice Totals Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div>
                  عدد البنود: <span className="font-bold text-foreground">{items.length}</span>
                </div>
                <div>
                  إجمالي القطع الموردة:{' '}
                  <span className="font-bold text-foreground font-mono">{totalQuantity}</span> قطعة
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-muted-foreground">إجمالي الفاتورة:</span>
                <span className="text-2xl font-black text-primary font-mono tracking-tight">
                  {totalAmount.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-sm font-bold text-primary">ج.م</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isProcessingNewProducts}
            >
              إلغاء
            </Button>
            <Button type="submit" isLoading={isLoading || isProcessingNewProducts} className="gap-2">
              <PackagePlus className="h-4 w-4" />
              {isEditing ? 'حفظ التعديلات وتحديث المخزون' : 'حفظ فاتورة التوريد وتحديث المخزون'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
  )
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  open,
  onOpenChange,
  ...props
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <PurchaseModalInner
          key={props.purchaseToEdit?.id || 'new_purchase'}
          onOpenChange={onOpenChange}
          {...props}
        />
      )}
    </Dialog>
  )
}

