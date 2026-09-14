import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryWithProductCount,
} from '../api/categoriesApi'
import { CategoryModal } from '../components/CategoryModal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  FolderTree,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Package,
} from 'lucide-react'

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithProductCount | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithProductCount | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text })
    setTimeout(() => {
      setFeedbackMessage(null)
    }, 4000)
  }

  // Fetch categories
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (name: string) => createCategory({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تمت إضافة القسم بنجاح')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل إضافة القسم')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateCategory({ id, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تم تعديل القسم بنجاح')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل تعديل القسم')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تم حذف القسم بنجاح')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل حذف القسم')
    },
  })

  const handleOpenAddModal = () => {
    setEditingCategory(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (category: CategoryWithProductCount) => {
    setEditingCategory(category)
    setIsModalOpen(true)
  }

  const handleSaveCategory = async (values: { name: string }) => {
    if (editingCategory) {
      await updateMutation.mutateAsync({ id: editingCategory.id, name: values.name })
    } else {
      await createMutation.mutateAsync(values.name)
    }
  }

  const handleDeleteCategory = async () => {
    if (deletingCategory) {
      await deleteMutation.mutateAsync(deletingCategory.id)
    }
  }

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  )

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-primary" />
            أقسام وتصنيفات المنتجات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تنظيم وتصنيف المنتجات والأجهزة لتسهيل الوصول إليها في نقطة البيع
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          إضافة قسم جديد
        </Button>
      </div>

      {/* Notifications / Feedback */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-sm animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Search & Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">قائمة الأقسام الحالية</CardTitle>
              <CardDescription>
                إجمالي الأقسام: {categories.length} قسم
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث عن قسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">جاري تحميل الأقسام...</div>
          ) : isError ? (
            <div className="py-12 text-center text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              <p>حدث خطأ أثناء تحميل الأقسام: {(error as Error)?.message}</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <FolderTree className="h-10 w-10 mx-auto opacity-40" />
              <p>
                {searchTerm
                  ? 'لم يتم العثور على أي قسم يطابق بحثك.'
                  : 'لا توجد أقسام مسجلة حتى الآن. ابدأ بإضافة قسمك الأول.'}
              </p>
              {!searchTerm && (
                <Button variant="outline" size="sm" onClick={handleOpenAddModal}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة قسم
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>اسم القسم</TableHead>
                  <TableHead className="text-center">عدد المنتجات المرتبطة</TableHead>
                  <TableHead>تاريخ الإنشاء</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((cat, idx) => (
                  <TableRow key={cat.id}>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-primary shrink-0" />
                        <span>{cat.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={cat.product_count && cat.product_count > 0 ? 'secondary' : 'outline'}
                        className="gap-1 font-sans"
                      >
                        <Package className="h-3 w-3" />
                        {cat.product_count || 0} منتج
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs font-sans">
                      {new Date(cat.created_at).toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(cat)}
                          className="h-8 w-8 p-0"
                          title="تعديل القسم"
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCategory(cat)}
                          className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          title="حذف القسم"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <CategoryModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        categoryToEdit={editingCategory}
        onSubmit={handleSaveCategory}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="تأكيد حذف القسم"
        description={
          deletingCategory?.product_count && deletingCategory.product_count > 0
            ? `تنبيه: هذا القسم يحتوي على ${deletingCategory.product_count} منتج(منتجات) مرتبطة به، ولن يسمح النظام بحذفه لحماية البيانات.`
            : `هل أنت متأكد من رغبتك في حذف القسم "${deletingCategory?.name}"؟ لن يمكن التراجع عن هذا الإجراء.`
        }
        confirmText="حذف نهائي"
        onConfirm={handleDeleteCategory}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
