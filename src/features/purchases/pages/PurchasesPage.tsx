import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPurchases,
  getPurchasesSummary,
  createPurchase,
  updatePurchase,
  deletePurchase,
  type PurchaseWithDetails,
  type CreatePurchaseInput,
} from '../api/purchasesApi'
import { getProducts, type ProductWithCategory } from '@/features/products/api/productsApi'
import { getCategories } from '@/features/categories/api/categoriesApi'
import { PurchaseModal } from '../components/PurchaseModal'
import { PurchaseDetailsModal } from '../components/PurchaseDetailsModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Truck,
  Plus,
  Search,
  Calendar,
  Layers,
  Coins,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ReceiptText,
} from 'lucide-react'

export const PurchasesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseWithDetails | null>(null)
  const [purchaseToEdit, setPurchaseToEdit] = useState<PurchaseWithDetails | null>(null)
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseWithDetails | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  // Fetch Purchases
  const {
    data: purchases = [],
    isLoading: isLoadingPurchases,
    isRefetching: isRefetchingPurchases,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: ['purchases'],
    queryFn: getPurchases,
  })

  // Fetch Summary
  const { data: summary } = useQuery({
    queryKey: ['purchasesSummary'],
    queryFn: getPurchasesSummary,
  })

  // Fetch Products & Categories (for the modal)
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreatePurchaseInput) => createPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchasesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // stock was updated!
      setStatusMessage({ type: 'success', text: 'تم تسجيل فاتورة التوريد وزيادة المخزون بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreatePurchaseInput }) =>
      updatePurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchasesSummary'] })
      queryClient.invalidateQueries({ queryKey: ['products'] }) // stock was adjusted!
      setPurchaseToEdit(null)
      setStatusMessage({ type: 'success', text: 'تم تعديل فاتورة التوريد وضبط المخزون بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePurchase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchasesSummary'] })
      setPurchaseToDelete(null)
      setStatusMessage({ type: 'success', text: 'تم حذف فاتورة التوريد بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.creator?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            فواتير المشتريات والتوريد
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تسجيل فواتير الشراء من الموردين وتحديث رصيد المخزون للمنتجات تلقائياً
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPurchases()}
            disabled={isRefetchingPurchases}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetchingPurchases ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Button
            onClick={() => {
              setPurchaseToEdit(null)
              setIsCreateModalOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            تسجيل فاتورة توريد جديدة
          </Button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-2 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Purchases */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مشتريات وتوريدات اليوم</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {Number(summary?.todayTotal || 0).toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* This Month's Purchases */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مشتريات الشهر الحالي</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {Number(summary?.monthTotal || 0).toLocaleString('ar-EG', {
                  minimumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Coins className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Invoices Count */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">إجمالي فواتير التوريد</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {summary?.totalInvoicesCount || purchases.length}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">فاتورة</span>
              </h3>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث باسم المورد أو رقم الفاتورة أو المسئول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchases Invoices Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs border-b">
              <tr>
                <th className="py-3.5 px-4">رقم الفاتورة</th>
                <th className="py-3.5 px-4">اسم المورد</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4 text-center">عدد الأصناف</th>
                <th className="py-3.5 px-4 text-center">إجمالي الفاتورة</th>
                <th className="py-3.5 px-4">مسجل الفاتورة</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingPurchases ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span>جاري تحميل فواتير المشتريات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ReceiptText className="h-10 w-10 text-muted-foreground/40 stroke-1" />
                      <p className="font-semibold text-foreground">لا توجد فواتير مشتريات</p>
                      <p className="text-xs text-muted-foreground">
                        {searchTerm
                          ? 'لا توجد فواتير تطابق نتائج البحث'
                          : 'اضغط على "تسجيل فاتورة توريد جديدة" لإضافة أول فاتورة مشتريات'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                      #{purchase.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      {purchase.supplier_name || 'مورد عام'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(purchase.created_at).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                        {purchase.items_count || purchase.purchase_items?.length || 0} صنف
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-foreground">
                      {Number(purchase.total_amount).toLocaleString('ar-EG', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs text-muted-foreground font-sans">ج.م</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      {purchase.creator?.full_name?.trim() ||
                        (purchase.creator?.role === 'admin' ? 'مدير النظام' : 'كاشير')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPurchase(purchase)}
                          className="h-8 px-2.5 text-xs gap-1.5 hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          عرض
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPurchaseToEdit(purchase)
                            setIsCreateModalOpen(true)
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                          title="تعديل الفاتورة"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPurchaseToDelete(purchase)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="حذف الفاتورة"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Purchase Modal (Create / Edit) */}
      <PurchaseModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open)
          if (!open) setPurchaseToEdit(null)
        }}
        purchaseToEdit={purchaseToEdit}
        products={products}
        categories={categories}
        onProductCreated={(newProduct: ProductWithCategory) => {
          queryClient.setQueryData<ProductWithCategory[]>(['products'], (old) => [
            newProduct,
            ...(old || []),
          ])
        }}
        onSubmit={async (data) => {
          if (purchaseToEdit) {
            await updateMutation.mutateAsync({ id: purchaseToEdit.id, data })
          } else {
            await createMutation.mutateAsync(data)
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Purchase Details Modal */}
      <PurchaseDetailsModal
        open={Boolean(selectedPurchase)}
        onOpenChange={(open) => !open && setSelectedPurchase(null)}
        purchase={selectedPurchase}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(purchaseToDelete)} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <DialogContent onClose={() => setPurchaseToDelete(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف فاتورة التوريد
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف فاتورة التوريد رقم #{purchaseToDelete?.id.slice(0, 8)} الخاصة بالمورد (
              {purchaseToDelete?.supplier_name})؟
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground space-y-1">
            <p>• قيمة الفاتورة: {Number(purchaseToDelete?.total_amount || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</p>
            <p>• سيتم حذف سجل الفاتورة وبنودها نهائياً.</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPurchaseToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => purchaseToDelete && deleteMutation.mutate(purchaseToDelete.id)}
              isLoading={deleteMutation.isPending}
            >
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
