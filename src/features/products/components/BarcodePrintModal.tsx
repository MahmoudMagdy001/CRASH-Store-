import React, { useState, useRef } from 'react'
import Barcode from 'react-barcode'
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
import { Label } from '@/components/ui/label'
import type { ProductWithCategory } from '../api/productsApi'
import { Printer, Eye, Tag, Store, Binary } from 'lucide-react'

interface BarcodePrintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: ProductWithCategory | null
  storeName?: string
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  open,
  onOpenChange,
  product,
  storeName = 'Crash Store (كراش ستور)',
}) => {
  const [copies, setCopies] = useState<number>(1)
  const [showPrice, setShowPrice] = useState<boolean>(true)
  const [showStoreName, setShowStoreName] = useState<boolean>(true)
  const [showBarcodeValue, setShowBarcodeValue] = useState<boolean>(true)
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: product ? `barcode-${product.barcode || product.name}` : 'barcode',
  })

  if (!product || !product.barcode) return null

  // Generate array for multiple copies
  const copiesArray = Array.from({ length: Math.max(1, Math.min(copies, 100)) })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Tag className="h-5 w-5" />
            <DialogTitle>معاينة وطباعة باركود المنتج</DialogTitle>
          </div>
          <DialogDescription>
            معاينة ملصق الباركود الحراري وتحديد عدد النسخ المطلوبة للطباعة.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
            {/* Number of Copies */}
            <div className="space-y-1.5">
              <Label htmlFor="copies-input" className="text-xs font-semibold">
                عدد النسخ / الاستيكرات
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="copies-input"
                  type="number"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-9 w-24 text-center font-mono"
                />
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCopies(1)}
                    className="h-9 px-2 text-xs"
                  >
                    1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCopies(5)}
                    className="h-9 px-2 text-xs"
                  >
                    5
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCopies(10)}
                    className="h-9 px-2 text-xs"
                  >
                    10
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCopies((prev) => prev + 1)}
                    className="h-9 px-2 text-xs"
                  >
                    +1
                  </Button>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-2 flex flex-col justify-center">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                <span>إظهار اسم المتجر على الملصق</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <span>إظهار سعر البيع ({product.sale_price} ج.م)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showBarcodeValue}
                  onChange={(e) => setShowBarcodeValue(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <Binary className="h-3.5 w-3.5 text-muted-foreground" />
                <span>إظهار رقم الباركود أسفل الخطوط</span>
              </label>
            </div>
          </div>

          {/* Live Preview Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1 font-medium">
                <Eye className="h-3.5 w-3.5" />
                معاينة شكل الملصق المطبوع (Live Label Preview)
              </span>
              <span className="text-[11px] bg-secondary/50 px-2 py-0.5 rounded">
                قياس حراري قياسي 38 × 25 مم
              </span>
            </div>

            {/* Visual Simulated Sticker */}
            <div className="flex items-center justify-center p-6 bg-slate-900/10 dark:bg-slate-950/50 rounded-2xl border border-dashed border-border/80">
              <div className="w-[240px] bg-white text-black p-3 rounded-lg shadow-lg border border-slate-200 flex flex-col items-center text-center font-sans">
                {showStoreName && (
                  <div className="text-[11px] font-bold text-slate-700 tracking-tight leading-none mb-1">
                    {storeName}
                  </div>
                )}
                <div className="text-[12px] font-semibold text-slate-900 leading-snug line-clamp-1 max-w-[210px] mb-1">
                  {product.name}
                </div>

                <div className="py-1 flex justify-center items-center w-full">
                  <Barcode
                    value={product.barcode}
                    format="CODE128"
                    width={1.3}
                    height={36}
                    fontSize={12}
                    textMargin={4}
                    marginTop={4}
                    marginBottom={8}
                    marginLeft={4}
                    marginRight={4}
                    displayValue={showBarcodeValue}
                    renderer="svg"
                  />
                </div>

                {showPrice && (
                  <div className="text-[12px] font-bold text-black mt-1 leading-none">
                    السعر: {product.sale_price.toLocaleString('ar-EG')} ج.م
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hidden Printable Container for react-to-print */}
          <div className="hidden">
            <div ref={printRef} className="barcode-print-container">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page {
                    size: auto;
                    margin: 2mm;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    background: #fff !important;
                    color: #000 !important;
                  }
                  .barcode-print-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 3mm;
                    padding: 0;
                    margin: 0;
                  }
                  .barcode-print-label {
                    width: 48mm;
                    padding: 2mm 1mm;
                    margin: 0;
                    box-sizing: border-box;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    page-break-inside: avoid;
                    break-inside: avoid;
                    font-family: system-ui, -apple-system, sans-serif;
                  }
                }
              `}} />

              {copiesArray.map((_, index) => (
                <div key={index} className="barcode-print-label text-center">
                  {showStoreName && (
                    <div style={{ fontSize: '9px', fontWeight: 'bold', marginBottom: '2px', color: '#000' }}>
                      {storeName}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: '600',
                      lineHeight: '1.2',
                      marginBottom: '2px',
                      maxWidth: '44mm',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      color: '#000',
                    }}
                  >
                    {product.name}
                  </div>

                  <div style={{ margin: '1px 0', display: 'flex', justifyContent: 'center' }}>
                    <Barcode
                      value={product.barcode!}
                      format="CODE128"
                      width={1.2}
                      height={30}
                      fontSize={10}
                      textMargin={3}
                      marginTop={2}
                      marginBottom={6}
                      marginLeft={2}
                      marginRight={2}
                      displayValue={showBarcodeValue}
                      renderer="svg"
                    />
                  </div>

                  {showPrice && (
                    <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '2px', color: '#000' }}>
                      السعر: {product.sale_price} ج.م
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          <Button type="button" onClick={() => handlePrint()} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة ({copies} {copies === 1 ? 'ملصق' : 'ملصقات'})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
