import React, { useState, useRef, useMemo } from 'react'
import { useReactToPrint } from 'react-to-print'
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
import type { ProductWithCategory } from '../api/productsApi'
import type { SettingsRow } from '@/features/pos/types/pos.types'
import {
  Printer,
  FileText,
  Search,
  Gamepad2,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react'

interface PriceMenuModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: ProductWithCategory[]
  settings: SettingsRow | null
}

export const PriceMenuModal: React.FC<PriceMenuModalProps> = ({
  open,
  onOpenChange,
  products,
  settings,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Crash-Store-Menu-${new Date().toISOString().slice(0, 10)}`,
  })

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, string>()
    products.forEach((p) => {
      if (p.category) {
        map.set(p.category.id, p.category.name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [products])

  // Filter products for the menu (single direct table without category grouping)
  const menuProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Active products only
        if (p.is_active === false) return false

        // Stock filter
        if (onlyInStock && p.quantity <= 0) return false

        // Category filter
        if (selectedCategory !== 'all' && p.category_id !== selectedCategory) return false

        // Search term
        if (searchTerm.trim()) {
          const q = searchTerm.trim().toLowerCase()
          const matchesName = p.name.toLowerCase().includes(q)
          const matchesCat = p.category?.name.toLowerCase().includes(q) || false
          if (!matchesName && !matchesCat) return false
        }

        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [products, onlyInStock, selectedCategory, searchTerm])

  const storeName = settings?.store_name || 'Crash Store (كراش ستور)'
  const storePhone = settings?.phone || '01000000000'
  const storeAddress = settings?.address || 'خدمات وصيانة وبيع أجهزة واكسسوارات بلايستيشن'
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <FileText className="h-5 w-5" />
            <DialogTitle>منيو وكتالوج الأسعار للعملاء (A4)</DialogTitle>
          </div>
          <DialogDescription>
            معاينة وطباعة قائمة أسعار المنتجات في جدول منظم وأنيق بدون باركود مخصص للعملاء.
          </DialogDescription>
        </DialogHeader>

        {/* Filter Controls (in Modal only, hidden on print) */}
        <div className="p-4 bg-muted/40 border-y border-border flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث في المنيو..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 h-9 text-xs"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">جميع الأقسام ({products.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              المتوفر بالمخزن فقط
            </label>

            <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">
              {menuProducts.length} منتج
            </span>
          </div>
        </div>

        {/* Printable Area / Scrollable Preview */}
        <div className="p-4 max-h-[60vh] overflow-y-auto bg-muted/20">
          <div
            ref={printRef}
            className="print-menu-container bg-white text-slate-900 p-8 rounded-xl shadow-xs border border-border mx-auto max-w-[800px]"
            dir="rtl"
          >
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 12mm 14mm;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-menu-container {
                  width: 100% !important;
                  max-width: none !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  border: none !important;
                }
              }
            `}</style>
            {/* Menu Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    <Gamepad2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                      {storeName}
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      متخصصون في بيع وصيانة أجهزة ودراعات وإكسسوارات البلايستيشن
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <Phone className="h-3.5 w-3.5 text-slate-900" />
                    {storePhone}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-slate-900" />
                    {storeAddress}
                  </span>
                </div>
              </div>

              {/* Title Badge & Date */}
              <div className="text-left shrink-0">
                <div className="inline-block bg-slate-900 text-white font-black text-xs px-3.5 py-1.5 rounded-lg mb-1.5 uppercase tracking-wider">
                  قائمة الأسعار الرسمية
                </div>
                <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1 justify-end">
                  <Calendar className="h-3 w-3" />
                  تاريخ القائمة: {currentDate}
                </p>
              </div>
            </div>

            {/* Products Table (Direct Single Table) */}
            {menuProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium text-sm">
                لا توجد منتجات مطابقة لخيارات البحث الحالية
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[11px] font-bold">
                      <th className="py-2.5 px-3 w-12 text-center">#</th>
                      <th className="py-2.5 px-3">اسم المنتج / الخدمة</th>
                      <th className="py-2.5 px-3 w-36">القسم</th>
                      <th className="py-2.5 px-3 w-32 text-left pl-4">السعر</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {menuProducts.map((product, idx) => (
                      <tr
                        key={product.id}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                        style={{ breakInside: 'avoid' }}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-bold text-slate-900 text-[13px] block">
                            {product.name}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-medium">
                          <span className="inline-block bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                            {product.category?.name || 'عام'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-left pl-4 whitespace-nowrap">
                          <span className="font-black text-sm text-slate-900 font-mono">
                            {product.sale_price.toLocaleString('ar-EG', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-[10px] font-bold text-slate-500">
                              ج.م
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Menu Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <p>
                * الأسعار قابلة للتحديث وفقاً لحركة السوق وتوافر القطع والأجهزة.
              </p>
              <p className="font-bold text-slate-700">
                {storeName} — نسعد دائماً بخدمتكم
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="p-4 bg-card border-t border-border flex sm:justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">
            جاهز للطباعة على ورق A4 أو الحفظ كملف PDF عالي الجودة.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button
              onClick={() => handlePrint()}
              disabled={menuProducts.length === 0}
              className="gap-2 bg-primary text-primary-foreground font-bold shadow-sm"
            >
              <Printer className="h-4 w-4" />
              طباعة المنيو (A4)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
