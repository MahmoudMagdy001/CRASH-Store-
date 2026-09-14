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
import type { CategoryWithProductCount } from '../api/categoriesApi'

const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'اسم القسم مطلوب' })
    .min(2, { message: 'يجب أن يتكون اسم القسم من حرفين على الأقل' }),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryToEdit?: CategoryWithProductCount | null
  onSubmit: (values: CategoryFormValues) => Promise<void>
  isLoading?: boolean
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  onOpenChange,
  categoryToEdit,
  onSubmit,
  isLoading = false,
}) => {
  const isEditing = Boolean(categoryToEdit)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (categoryToEdit) {
        reset({ name: categoryToEdit.name })
      } else {
        reset({ name: '' })
      }
    }
  }, [open, categoryToEdit, reset])

  const handleFormSubmit = async (data: CategoryFormValues) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل بيانات القسم' : 'إضافة قسم جديد'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'تعديل اسم القسم، وسينعكس ذلك على كافة المنتجات التابعة له.'
              : 'أدخل اسم القسم الجديد لتصنيف المنتجات ضمنه.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category-name">اسم القسم</Label>
              <Input
                id="category-name"
                placeholder="مثال: أجهزة بلايستيشن، يدات تحكم، كابلات، ألعاب..."
                autoFocus
                disabled={isLoading}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive font-medium">{errors.name.message}</p>
              )}
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
              {isEditing ? 'حفظ التعديلات' : 'إضافة القسم'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
