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
import type { ExpenseWithCreator } from '../api/expensesApi'
import { WalletCards } from 'lucide-react'

const expenseSchema = z.object({
  title: z.string().trim().min(1, { message: 'بند المصروف مطلوب' }),
  amount: z.coerce
    .number({ invalid_type_error: 'يرجى إدخال مبلغ صحيح' })
    .positive({ message: 'المبلغ يجب أن يكون أكبر من صفر' }),
  notes: z.string().optional(),
  created_at: z.string().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expenseToEdit?: ExpenseWithCreator | null
  onSubmit: (values: ExpenseFormValues) => Promise<void>
  isLoading?: boolean
}

// Quick suggestions for common expenses
const COMMON_EXPENSE_PRESETS = [
  'كهرباء ومياه',
  'إيجار المحل',
  'إنترنت وهاتف',
  'نثريات وبوفيه',
  'أدوات نظافة',
  'صيانة وتجهيزات',
  'رواتب وسلف',
  'مستلزمات شحن وتغليف',
]

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  open,
  onOpenChange,
  expenseToEdit,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(expenseToEdit)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: 0,
      notes: '',
      created_at: new Date().toISOString().slice(0, 16),
    },
  })

  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        reset({
          title: expenseToEdit.title,
          amount: expenseToEdit.amount,
          notes: expenseToEdit.notes || '',
          created_at: new Date(expenseToEdit.created_at).toISOString().slice(0, 16),
        })
      } else {
        reset({
          title: '',
          amount: 0,
          notes: '',
          created_at: new Date().toISOString().slice(0, 16),
        })
      }
    }
  }, [open, expenseToEdit, reset])

  const handleFormSubmit = async (data: ExpenseFormValues) => {
    await onSubmit({
      ...data,
      created_at: data.created_at ? new Date(data.created_at).toISOString() : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" />
            {isEditing ? 'تعديل بيانات المصروف' : 'تسجيل مصروف تشغيلي جديد'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'تعديل بند المصروف أو القيمة أو الملاحظات.'
              : 'تسجيل المصروفات اليومية لحساب صافي الأرباح وخصمها من الإيرادات.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Expense Title */}
            <div className="space-y-2">
              <Label htmlFor="title">بند أو بيان المصروف *</Label>
              <Input
                id="title"
                placeholder="مثال: فاتورة الكهرباء لشهر سبتمبر، أدوات صيانة..."
                disabled={isLoading}
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-destructive font-medium">{errors.title.message}</p>
              )}

              {/* Quick suggestion chips */}
              {!isEditing && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {COMMON_EXPENSE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue('title', preset, { shouldValidate: true })}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground cursor-pointer border border-border/40"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount and Date Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">المبلغ المدفوع *</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    disabled={isLoading}
                    {...register('amount')}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-sans">
                    ج.م
                  </span>
                </div>
                {errors.amount && (
                  <p className="text-xs text-destructive font-medium">{errors.amount.message}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="created_at">تاريخ وتوقيت الصرف</Label>
                <Input
                  id="created_at"
                  type="datetime-local"
                  disabled={isLoading}
                  {...register('created_at')}
                />
                {errors.created_at && (
                  <p className="text-xs text-destructive font-medium">{errors.created_at.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">ملاحظات أو تفاصيل إضافية (اختياري)</Label>
              <Input
                id="notes"
                placeholder="أية ملاحظات أو رقم الإيصال أو اسم المستلم..."
                disabled={isLoading}
                {...register('notes')}
              />
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
              {isEditing ? 'حفظ التعديلات' : 'تسجيل المصروف'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
