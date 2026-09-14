import { forwardRef } from 'react'
import Barcode from 'react-barcode'
import type { SaleWithDetails, SettingsRow } from '../types/pos.types'

interface ReceiptPrintTemplateProps {
  sale: SaleWithDetails | null
  settings: SettingsRow | null
}

export const ReceiptPrintTemplate = forwardRef<
  HTMLDivElement,
  ReceiptPrintTemplateProps
>(({ sale, settings }, ref) => {
  if (!sale) return null

  const storeName = settings?.store_name || 'Crash Store'
  const phone = settings?.phone
  const address = settings?.address
  const footerNote =
    settings?.invoice_footer_note ||
    'شكراً لتعاملكم معنا! البضاعة المباعة ترد وتستبدل خلال 14 يوماً بموجب أصل الفاتورة.'

  // Format date and time
  const saleDate = new Date(sale.created_at)
  const formattedDate = saleDate.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const formattedTime = saleDate.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Calculate items subtotal
  const items = sale.sale_items || []
  const subtotal = items.reduce(
    (acc, itm) => acc + Number(itm.quantity) * Number(itm.unit_price),
    0
  )
  const discount = Number(sale.discount || 0)
  const grandTotal = Number(sale.total_amount)
  const cashierName = sale.cashier?.full_name || 'كاشير'
  const paymentMethodLabel =
    sale.payment_method === 'credit'
      ? 'بالأجل (دين)'
      : sale.payment_method === 'card'
      ? 'بطاقة بنكية'
      : 'نقداً'

  return (
    <div className="hidden print:block">
      {/* 80mm Thermal Receipt Layout */}
      <style type="text/css" media="print">
        {`
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}
      </style>

      <div
        ref={ref}
        className="w-[80mm] max-w-[80mm] mx-auto p-4 text-black bg-white text-xs leading-tight"
        style={{ direction: 'rtl' }}
      >
        {/* Header: Store Info */}
        <div className="text-center pb-2 border-b border-dashed border-black/60 space-y-1">
          {settings?.logo_url && (
            <div className="flex justify-center mb-1">
              <img
                src={settings.logo_url}
                alt="Store Logo"
                className="h-12 w-auto object-contain max-w-[50mm]"
              />
            </div>
          )}
          <h1 className="text-lg font-black tracking-tight">{storeName}</h1>
          <p className="text-[11px] font-medium text-gray-700">
            لصيانة وبيع أجهزة وإكسسوارات PlayStation
          </p>
          {phone && <p className="text-[11px] font-mono">هاتف: {phone}</p>}
          {address && <p className="text-[10px] text-gray-600">{address}</p>}
        </div>

        {/* Invoice Info */}
        <div className="py-2 border-b border-dashed border-black/60 space-y-1 text-[11px]">
          <div className="flex justify-between items-center font-bold">
            <span>فاتورة مبيعات:</span>
            <span className="font-mono text-sm">{sale.invoice_number}</span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>التاريخ:</span>
            <span>
              {formattedDate} - {formattedTime}
            </span>
          </div>
          <div className="flex justify-between items-center text-gray-700">
            <span>الكاشير:</span>
            <span className="font-medium">{cashierName}</span>
          </div>
          {sale.customer_name && (
            <div className="flex justify-between items-center font-bold text-black">
              <span>العميل:</span>
              <span>{sale.customer_name}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-gray-700">
            <span>طريقة الدفع:</span>
            <span className="font-bold">{paymentMethodLabel}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="py-2 border-b border-dashed border-black/60">
          <table className="w-full text-right text-[11px]">
            <thead>
              <tr className="border-b border-black text-black">
                <th className="pb-1 text-right font-black">الصنف</th>
                <th className="pb-1 text-center font-black w-10">الكمية</th>
                <th className="pb-1 text-left font-black w-12">السعر</th>
                <th className="pb-1 text-left font-black w-14">الإجمالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, idx) => {
                const lineTotal =
                  Number(item.quantity) * Number(item.unit_price)
                const productName = item.products?.name || 'صنف'
                return (
                  <tr key={idx} className="align-top">
                    <td className="py-1 pr-0.5">
                      <div className="font-bold text-gray-900 leading-snug">
                        {productName}
                      </div>
                    </td>
                    <td className="py-1 text-center font-mono font-bold">
                      {item.quantity}
                    </td>
                    <td className="py-1 text-left font-mono">
                      {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-1 text-left font-mono font-bold">
                      {lineTotal.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="py-2 border-b border-dashed border-black/60 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-gray-700">
            <span>المجموع الفرعي:</span>
            <span className="font-mono font-bold">{subtotal.toFixed(2)} ج.م</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between items-center text-red-600 font-medium">
              <span>الخصم:</span>
              <span className="font-mono font-bold">-{discount.toFixed(2)} ج.م</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-1 border-t border-black text-sm font-black">
            <span>الصافي المطلوب:</span>
            <span className="font-mono text-base">
              {grandTotal.toFixed(2)} ج.م
            </span>
          </div>

          {sale.payment_method === 'credit' && (
            <div className="pt-1.5 mt-1 border-t border-dashed border-black/60 space-y-1 font-bold">
              <div className="flex justify-between items-center text-xs">
                <span>المدفوع مقدماً:</span>
                <span className="font-mono">{Number(sale.amount_paid || 0).toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border-t border-black pt-1">
                <span>المتبقي عليه (دين):</span>
                <span className="font-mono text-base">{Number(sale.remaining_amount || 0).toFixed(2)} ج.م</span>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center text-[10px] text-gray-500 pt-0.5">
            <span>عدد الأصناف:</span>
            <span>
              {items.length} صنف ({items.reduce((s, i) => s + i.quantity, 0)} قطعة)
            </span>
          </div>
        </div>

        {/* Barcode representation */}
        <div className="py-3 flex flex-col items-center justify-center">
          <Barcode
            value={sale.invoice_number}
            width={1.2}
            height={32}
            fontSize={10}
            margin={0}
            displayValue={false}
          />
          <span className="font-mono text-[10px] tracking-widest mt-1">
            *{sale.invoice_number}*
          </span>
        </div>

        {/* Footer Policy Note */}
        <div className="pt-1 text-center space-y-1 text-[9px] text-gray-600 leading-tight">
          <p className="font-medium">{footerNote}</p>
          <p className="text-[8px] text-gray-400 font-mono">
            نظام كراش ستور - Crash Store POS
          </p>
        </div>
      </div>
    </div>
  )
})

ReceiptPrintTemplate.displayName = 'ReceiptPrintTemplate'
