import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductWithCategory,
} from '../api/productsApi'
import { getCategories } from '@/features/categories/api/categoriesApi'
import { getStoreSettings } from '@/features/settings/api/settingsApi'
import { ProductModal, type ProductFormValues } from '../components/ProductModal'
import { BarcodePrintModal } from '../components/BarcodePrintModal'
import { PriceMenuModal } from '../components/PriceMenuModal'
import { MenuQrModal } from '../components/MenuQrModal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
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
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Barcode,
  FolderTree,
  ArrowUpDown,
  Printer,
  FileText,
  QrCode,
} from 'lucide-react'

export const ProductsPage: React.FC = () => {
  const queryClient = useQueryClient()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all')
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'sale_price'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<ProductWithCategory | null>(null)
  const [barcodeProduct, setBarcodeProduct] = useState<ProductWithCategory | null>(null)
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Fetch store settings for barcode and menu header
  const { data: settings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  })

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text })
    setTimeout(() => {
      setFeedbackMessage(null)
    }, 4500)
  }

  // Fetch Products
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  })

  // Fetch Categories for dropdowns & filters
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (values: ProductFormValues) =>
      createProduct({
        name: values.name,
        category_id: values.category_id || null,
        barcode: values.barcode || null,
        purchase_price: values.purchase_price,
        sale_price: values.sale_price,
        quantity: values.quantity,
        min_quantity_alert: values.min_quantity_alert,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تمت إضافة المنتج بنجاح وتوليد الباركود')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل إضافة المنتج')
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ProductFormValues }) =>
      updateProduct({
        id,
        name: values.name,
        category_id: values.category_id || null,
        barcode: values.barcode || null,
        purchase_price: values.purchase_price,
        sale_price: values.sale_price,
        quantity: values.quantity,
        min_quantity_alert: values.min_quantity_alert,
        is_active: values.is_active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تم حفظ تعديلات المنتج بنجاح')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل تعديل المنتج')
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      showFeedback('success', 'تم حذف المنتج بنجاح')
    },
    onError: (err: Error) => {
      showFeedback('error', err.message || 'فشل حذف المنتج')
    },
  })

  const handleOpenAddModal = () => {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (product: ProductWithCategory) => {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  const handleSaveProduct = async (values: ProductFormValues) => {
    if (editingProduct) {
      await updateMutation.mutateAsync({ id: editingProduct.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  const handleDeleteProduct = async () => {
    if (deletingProduct) {
      await deleteMutation.mutateAsync(deletingProduct.id)
    }
  }

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Search filter (name or barcode)
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
          (product.barcode && product.barcode.includes(searchTerm.trim()))

        // Category filter
        const matchesCategory =
          selectedCategory === 'all' || product.category_id === selectedCategory

        // Stock status filter
        let matchesStock = true
        if (stockFilter === 'low') {
          matchesStock = product.quantity <= product.min_quantity_alert && product.quantity > 0
        } else if (stockFilter === 'out') {
          matchesStock = product.quantity === 0
        }

        return matchesSearch && matchesCategory && matchesStock
      })
      .sort((a, b) => {
        let valA: string | number = a[sortBy]
        let valB: string | number = b[sortBy]

        if (typeof valA === 'string') {
          return sortOrder === 'asc'
            ? valA.localeCompare(valB as string, 'ar')
            : (valB as string).localeCompare(valA, 'ar')
        }

        return sortOrder === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      })
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy, sortOrder])

  // Overview metrics
  const totalCount = products.length
  const lowStockCount = products.filter(
    (p) => p.quantity <= p.min_quantity_alert && p.quantity > 0
  ).length
  const outOfStockCount = products.filter((p) => p.quantity === 0).length

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            إدارة المنتجات والأجهزة
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إضافة وتعديل أجهزة بلايستيشن، الاكسسوارات، قطع الغيار، ومراقبة المخزون
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsQrModalOpen(true)}
            className="gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs font-bold"
          >
            <QrCode className="h-4 w-4" />
            باركود منيو العملاء (QR Code)
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsMenuModalOpen(true)}
            className="gap-1.5 border-border text-muted-foreground hover:text-foreground shadow-xs font-medium text-xs"
            title="طباعة قائمة ورقية A4"
          >
            <FileText className="h-3.5 w-3.5" />
            قائمة A4
          </Button>
          <Button onClick={handleOpenAddModal} className="shrink-0 gap-2 font-bold">
            <Plus className="h-4 w-4" />
            إضافة منتج جديد
          </Button>
        </div>
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">إجمالي المنتجات المسجلة</p>
            <p className="text-2xl font-bold mt-1 text-foreground">{totalCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-amber-500/20 bg-amber-500/5">
          <div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              منتجات أوشكت على النفاد
            </p>
            <p className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
              {lowStockCount}
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-destructive/20 bg-destructive/5">
          <div>
            <p className="text-xs text-destructive font-medium">منتجات نفدت من المخزن</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{outOfStockCount}</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم المنتج أو امسح الباركود..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="w-40">
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="h-10 text-xs"
                >
                  <option value="all">جميع الأقسام</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Stock Filter */}
              <div className="w-36">
                <Select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as 'all' | 'low' | 'out')}
                  className="h-10 text-xs"
                >
                  <option value="all">كل المخزون</option>
                  <option value="low">قارب على النفاد</option>
                  <option value="out">المنتهي فقط</option>
                </Select>
              </div>

              {/* Sort By */}
              <div className="w-32">
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'sale_price')}
                  className="h-10 text-xs"
                >
                  <option value="name">الاسم</option>
                  <option value="quantity">الكمية</option>
                  <option value="sale_price">سعر البيع</option>
                </Select>
              </div>

              {/* Order Toggle */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={`الترتيب: ${sortOrder === 'asc' ? 'تصاعدي' : 'تنازلي'}`}
                className="h-10 w-10 shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Table Content */}
        <CardContent>
          {isLoadingProducts ? (
            <div className="py-16 text-center text-muted-foreground">جاري تحميل المنتجات...</div>
          ) : isProductsError ? (
            <div className="py-16 text-center text-destructive flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8" />
              <p>حدث خطأ أثناء تحميل المنتجات: {(productsError as Error)?.message}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <Package className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-base">
                {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all'
                  ? 'لم يتم العثور على أي منتجات مطابقة لخيارات البحث أو الفلترة.'
                  : 'لا توجد منتجات مسجلة في المتجر حتى الآن.'}
              </p>
              {!searchTerm && selectedCategory === 'all' && (
                <Button variant="outline" size="sm" onClick={handleOpenAddModal}>
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة أول منتج
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الباركود</TableHead>
                  <TableHead className="text-left font-mono">سعر الشراء</TableHead>
                  <TableHead className="text-left font-mono">سعر البيع</TableHead>
                  <TableHead className="text-center">المخزون</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((prod, idx) => {
                  const isOutOfStock = prod.quantity === 0
                  const isLowStock = prod.quantity <= prod.min_quantity_alert && !isOutOfStock

                  return (
                    <TableRow key={prod.id}>
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground text-sm">{prod.name}</span>
                          {prod.purchase_price > 0 && prod.sale_price > 0 && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400">
                              هامش الربح:{' '}
                              {(prod.sale_price - prod.purchase_price).toLocaleString('ar-EG', {
                                minimumFractionDigits: 2,
                              })}{' '}
                              ج.م
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {prod.category ? (
                          <Badge variant="outline" className="text-xs gap-1 font-sans">
                            <FolderTree className="h-3 w-3 text-primary" />
                            {prod.category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {prod.barcode ? (
                          <button
                            type="button"
                            onClick={() => setBarcodeProduct(prod)}
                            title="معاينة وطباعة ملصق الباركود"
                            className="inline-flex items-center gap-1.5 font-mono text-xs bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors px-2 py-1 rounded-md border border-border/50 text-foreground cursor-pointer group"
                          >
                            <Barcode className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                            <span>{prod.barcode}</span>
                            <Printer className="h-3 w-3 text-muted-foreground group-hover:text-primary opacity-50 group-hover:opacity-100 mr-0.5" />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">بدون باركود</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left font-mono text-xs font-medium text-muted-foreground">
                        {prod.purchase_price.toLocaleString('ar-EG', { minimumFractionDigits: 2 })}{' '}
                        ج.م
                      </TableCell>
                      <TableCell className="text-left font-mono text-sm font-bold text-foreground">
                        {prod.sale_price.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono text-sm font-bold">{prod.quantity}</span>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              نفد من المخزن
                            </Badge>
                          ) : isLowStock ? (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            >
                              مخزون منخفض (حد {prod.min_quantity_alert})
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {prod.is_active ? (
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" title="مفعّل" />
                        ) : (
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-400/20" title="معطّل" />
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center justify-end gap-1">
                          {prod.barcode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBarcodeProduct(prod)}
                              className="h-8 w-8 p-0 text-primary/80 hover:text-primary hover:bg-primary/10"
                              title="معاينة وطباعة الباركود"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditModal(prod)}
                            className="h-8 w-8 p-0"
                            title="تعديل المنتج"
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingProduct(prod)}
                            className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                            title="حذف المنتج"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Product Modal */}
      <ProductModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        productToEdit={editingProduct}
        categories={categories}
        onSubmit={handleSaveProduct}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Barcode Preview & Print Modal */}
      <BarcodePrintModal
        open={Boolean(barcodeProduct)}
        onOpenChange={(open) => !open && setBarcodeProduct(null)}
        product={barcodeProduct}
        storeName={settings?.store_name || 'Crash Store (كراش ستور)'}
      />

      {/* Customer Price Menu Modal (A4) */}
      <PriceMenuModal
        open={isMenuModalOpen}
        onOpenChange={setIsMenuModalOpen}
        products={products}
        settings={settings || null}
      />

      {/* Customer QR Code Menu Modal */}
      <MenuQrModal
        open={isQrModalOpen}
        onOpenChange={setIsQrModalOpen}
        settings={settings || null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingProduct)}
        onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="تأكيد حذف المنتج"
        description={`هل أنت متأكد من رغبتك في حذف المنتج "${deletingProduct?.name}"؟ إذا كان المنتج مرتبطاً بمبيعات سابقة، لن يتم حذفه لحماية السجلات المالية.`}
        confirmText="حذف نهائي"
        onConfirm={handleDeleteProduct}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
