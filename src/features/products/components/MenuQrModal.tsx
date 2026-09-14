import React, { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
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
import type { SettingsRow } from '@/features/pos/types/pos.types'
import {
  QrCode,
  Printer,
  Gamepad2,
  Phone,
  MapPin,
  Sparkles,
} from 'lucide-react'

interface MenuQrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: SettingsRow | null
}

export const MenuQrModal: React.FC<MenuQrModalProps> = ({
  open,
  onOpenChange,
  settings,
}) => {
  const printRef = useRef<HTMLDivElement>(null)

  // Construct menu URL based on current origin
  const menuUrl = typeof window !== 'undefined' ? `${window.location.origin}/menu` : '/menu'

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Crash-Store-Menu-QRCode',
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 15mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: white !important;
        }
        .print-qr-stand {
          width: 100% !important;
          max-width: 480px !important;
          margin: 30px auto !important;
          padding: 36px !important;
          border: 3px solid #0f172a !important;
          box-shadow: none !important;
        }
      }
    `,
  })

  const storeName = settings?.store_name || 'Crash Store (كراش ستور)'
  const storePhone = settings?.phone || '01000000000'
  const storeAddress = settings?.address || 'صيانة وبيع أجهزة واكسسوارات بلايستيشن'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="lg" className="max-h-[85vh]">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 flex-wrap p-5 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <QrCode className="h-5 w-5" />
              <DialogTitle>باركود منيو العملاء الرقمي (QR Code)</DialogTitle>
            </div>
            <DialogDescription className="mt-1 text-xs">
              امسح الباركود بكاميرا الموبايل لفتح صفحة المنيو والأسعار.
            </DialogDescription>
          </div>
          <Button
            onClick={() => handlePrint()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shrink-0 h-10 px-4"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة الستاند الآن (A4)</span>
          </Button>
        </DialogHeader>

        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto">
          {/* Printable Table Stand Preview */}
          <div className="border border-border/80 rounded-2xl bg-muted/30 p-4">
            <div className="pb-3 mb-2 border-b border-border/60">
              <p className="text-xs text-muted-foreground font-medium">
                معاينة ستاند الطاولة (لوضعه على الكاونتر أو طاولة الاستقبال):
              </p>
            </div>

            <div
              ref={printRef}
              className="print-qr-stand bg-white text-slate-900 p-8 rounded-2xl border-2 border-slate-900 shadow-sm max-w-[420px] mx-auto text-center"
              dir="rtl"
            >
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 20mm;
                  }
                  body {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-qr-stand {
                    width: 100% !important;
                    max-width: 480px !important;
                    margin: 40px auto !important;
                    padding: 36px !important;
                    border: 3px solid #0f172a !important;
                    box-shadow: none !important;
                  }
                }
              `}</style>

              {/* Logo / Header */}
              <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                <Gamepad2 className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {storeName}
              </h2>
              <p className="text-xs text-slate-600 font-semibold mt-1">
                متخصصون في بيع وصيانة أجهزة ودراعات وإكسسوارات البلايستيشن
              </p>

              {/* Action Banner */}
              <div className="my-5 py-2.5 px-4 bg-slate-100 rounded-xl border border-slate-200">
                <p className="text-xs font-black text-slate-900 flex items-center justify-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <span>امسح الباركود بكاميرا الموبايل</span>
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  لتصفح قائمة الأسعار والمنتجات المتوفرة حالياً في المتجر
                </p>
              </div>

              {/* The QR Code */}
              <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-300 inline-block shadow-xs my-2">
                <QRCodeSVG
                  value={menuUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Footer details */}
              <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                {storePhone && (
                  <p className="font-bold text-slate-900 flex items-center justify-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-700" />
                    <span>للاستفسار والدعم: {storePhone}</span>
                  </p>
                )}
                {storeAddress && (
                  <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span>{storeAddress}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-3.5 px-6 bg-muted/20 border-t border-border flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground hidden sm:block">
            امسح الكود بكاميرا الموبايل لتصفح الأسعار والمنتجات مباشرة
          </p>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-6 font-bold border-border shadow-xs hover:bg-muted"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
