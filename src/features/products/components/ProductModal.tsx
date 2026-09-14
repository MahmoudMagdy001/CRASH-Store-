import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Select } from '@/components/ui/select'
import { generateBarcode, type ProductWithCategory } from '../api/productsApi'
import type { Category } from '@/features/categories/api/categoriesApi'
import { Sparkles } from 'lucide-react'

const productSchema = z.object({
  name: z.string().trim().min(1, { message: 'اسم المنتج مطلوب' }),
  category_id: z.string().optional(),
  barcode: z.string().optional(),
  purchase_price: z.coerce
    .number({ invalid_type_error: 'يرجى إدخال سعر صحيح' })
    .min(0, { message: 'سعر الشراء لا يمكن أن يكون سالباً' }),
  sale_price: z.coerce
    .number({ invalid_type_error: 'يرجى إدخال سعر صحيح' })
    .min(0, { message: 'سعر البيع لا يمكن أن يكون سالباً' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'يرجى إدخال كمية صحيحة' })
    .int({ message: 'الكمية يجب أن تكون عدداً صحيحاً' })
    .min(0, { message: 'الكمية لا يمكن أن تكون سالبة' }),
  min_quantity_alert: z.coerce
    .number({ invalid_type_error: 'يرجى إدخال حد تنبيه صحيح' })
    .int({ message: 'حد التنبيه يجب أن يكون عدداً صحيحاً' })
    .min(0, { message: 'حد التنبيه لا يمكن أن يكون سالباً' }),
  is_active: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productSchema>

interface ProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productToEdit?: ProductWithCategory | null
  categories: Category[]
  onSubmit: (values: ProductFormValues) => Promise<void>
  isLoading?: boolean
}

export const ProductModal: React.FC<ProductModalProps> = ({
  open,
  onOpenChange,
  productToEdit,
  categories,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(productToEdit)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      category_id: '',
      barcode: '',
      purchase_price: 0,
      sale_price: 0,
      quantity: 0,
      min_quantity_alert: 3,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (productToEdit) {
        reset({
          name: productToEdit.name,
          category_id: productToEdit.category_id || '',
          barcode: productToEdit.barcode || generateBarcode(),
          purchase_price: productToEdit.purchase_price,
          sale_price: productToEdit.sale_price,
          quantity: productToEdit.quantity,
          min_quantity_alert: productToEdit.min_quantity_alert,
          is_active: productToEdit.is_active,
        })
      } else {
        reset({
          name: '',
          category_id: categories.length > 0 ? categories[0].id : '',
          barcode: generateBarcode(),
          purchase_price: 0,
          sale_price: 0,
          quantity: 0,
          min_quantity_alert: 3,
          is_active: true,
        })
      }
    }
  }, [open, productToEdit, categories, reset])

  const handleFormSubmit = async (data: ProductFormValues) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  const handleGenerateRandomBarcode = () => {
    setValue('barcode', generateBarcode())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'تعديل الأسعار أو الكميات أو بيانات المنتج الحالية.'
              : 'أدخل تفاصيل المنتج الجديد وسعره والكمية الأولية المتوفرة.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Product Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">اسم المنتج / الجهاز *</Label>
              <Input
                id="name"
                placeholder="مثال: ذراع تحكم بلايستيشن 5 أصلية (DualSense White)"
                disabled={isLoading}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
              )}
            </div>

            {/* Category & Barcode Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="category_id">القسم / التصنيف</Label>
                <Select id="category_id" disabled={isLoading} {...register('category_id')}>
                  <option value="">-- بدون قسم --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
                {errors.category_id && (
                  <p className="text-xs text-destructive font-medium">{errors.category_id.message}</p>
                )}
              </div>

              {/* Barcode */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="barcode">الباركود</Label>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                      تلقائي
                    </span>
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleGenerateRandomBarcode}
                      className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      title="توليد كود تلقائي جديد"
                    >
                      <Sparkles className="h-3 w-3" />
                      توليد كود آخر
                    </button>
                  )}
                </div>
                <Input
                  id="barcode"
                  readOnly
                  tabIndex={-1}
                  placeholder="يتم التوليد تلقائياً"
                  dir="ltr"
                  className="font-mono text-left bg-muted/60 text-muted-foreground cursor-not-allowed select-all font-semibold"
                  title="يتم توليد الباركود تلقائياً ولا يمكن الكتابة فيه"
                  onKeyDown={(e) => {
                    if (e.key !== 'Tab') e.preventDefault()
                  }}
                  disabled={isLoading}
                  {...register('barcode')}
                />
                {errors.barcode && (
                  <p className="text-xs text-destructive font-medium">{errors.barcode.message}</p>
                )}
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Purchase Price */}
              <div className="space-y-1.5">
                <Label htmlFor="purchase_price">سعر الشراء (التكلفة) *</Label>
                <div className="relative">
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={isLoading}
                    {...register('purchase_price')}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-sans">
                    ج.م
                  </span>
                </div>
                {errors.purchase_price && (
                  <p className="text-xs text-destructive font-medium">{errors.purchase_price.message}</p>
                )}
              </div>

              {/* Sale Price */}
              <div className="space-y-1.5">
                <Label htmlFor="sale_price">سعر البيع للعميل *</Label>
                <div className="relative">
                  <Input
                    id="sale_price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={isLoading}
                    {...register('sale_price')}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-sans">
                    ج.م
                  </span>
                </div>
                {errors.sale_price && (
                  <p className="text-xs text-destructive font-medium">{errors.sale_price.message}</p>
                )}
              </div>
            </div>

            {/* Stock Quantities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-1.5">
                <Label htmlFor="quantity">الكمية المتوفرة بالمخزن *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  {...register('quantity')}
                />
                {errors.quantity && (
                  <p className="text-xs text-destructive font-medium">{errors.quantity.message}</p>
                )}
              </div>

              {/* Alert threshold */}
              <div className="space-y-1.5">
                <Label htmlFor="min_quantity_alert">حد التنبيه بنقص المخزون *</Label>
                <Input
                  id="min_quantity_alert"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="3"
                  disabled={isLoading}
                  {...register('min_quantity_alert')}
                />
                {errors.min_quantity_alert && (
                  <p className="text-xs text-destructive font-medium">{errors.min_quantity_alert.message}</p>
                )}
              </div>
            </div>

            {/* Status toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  disabled={isLoading}
                  {...register('is_active')}
                />
                <span className="text-sm font-medium text-foreground">
                  المنتج مفعّل ومتاح للبيع في نقطة البيع (POS)
                </span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button type="submit" isLoading={isLoading}>
              {isEditing ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
