import React, { useState, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useReactToPrint } from 'react-to-print'
import { QRCodeSVG } from 'qrcode.react'
import { getPublicMenu, getPublicStoreInfo } from '../api/menuApi'
import {
  Gamepad2,
  Search,
  Phone,
  MapPin,
  Sparkles,
  Layers,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Printer,
  Calendar,
} from 'lucide-react'

export const PublicMenuPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const printMenuRef = useRef<HTMLDivElement>(null)

  const handlePrintMenu = useReactToPrint({
    contentRef: printMenuRef,
    documentTitle: `Crash-Store-Menu-${new Date().toISOString().slice(0, 10)}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 10mm 12mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: white !important;
          color: #0f172a !important;
        }
      }
    `,
  })

  const {
    data: menuItems = [],
    isLoading: isLoadingMenu,
    refetch: refetchMenu,
    isFetching,
  } = useQuery({
    queryKey: ['public-menu'],
    queryFn: getPublicMenu,
    staleTime: 1000 * 30, // 30s
  })

  const { data: storeInfo } = useQuery({
    queryKey: ['public-store-info'],
    queryFn: getPublicStoreInfo,
    staleTime: 1000 * 60 * 5,
  })

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set<string>()
    menuItems.forEach((item) => {
      if (item.category_name) set.add(item.category_name)
    })
    return Array.from(set).sort()
  }, [menuItems])

  // Filtered items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category_name === selectedCategory

      if (!matchesCategory) return false

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase()
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesCat = item.category_name.toLowerCase().includes(q)
        return matchesName || matchesCat
      }

      return true
    })
  }, [menuItems, selectedCategory, searchTerm])

  const storeName = storeInfo?.store_name || 'Crash Store (كراش ستور)'
  const storePhone = storeInfo?.phone || ''
  const storeAddress = storeInfo?.address || 'صيانة وبيع أجهزة واكسسوارات بلايستيشن'
  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white"
      dir="rtl"
    >
      {/* Background glowing gradient accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-6 sm:py-8 flex flex-col min-h-screen">
        {/* Top Header Card */}
        <header className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-emerald-950/20 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                <Gamepad2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{storeName}</span>
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  قائمة المنتجات والأسعار المتوفرة حالياً
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handlePrintMenu()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700/80 transition-colors text-xs font-bold"
                title="طباعة قائمة الأسعار"
              >
                <Printer className="h-3.5 w-3.5 text-emerald-400" />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={() => refetchMenu()}
                disabled={isFetching}
                className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 hover:text-white transition-colors"
                title="تحديث القائمة"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? 'animate-spin text-emerald-400' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Quick Contact Chips */}
          {(storePhone || storeAddress) && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap text-xs">
              {storePhone && (
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${storePhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold hover:bg-emerald-500/20 transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{storePhone}</span>
                  </a>

                  <a
                    href={`https://wa.me/${storePhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold hover:bg-green-500/20 transition-colors"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>واتساب</span>
                  </a>
                </div>
              )}

              {storeAddress && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate max-w-[200px]">{storeAddress}</span>
                </span>
              )}
            </div>
          )}
        </header>

        {/* Search Bar */}
        <div className="relative mb-3 sticky top-3 z-20">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن منتج، دراع، لعبة، صيانة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pr-10 pl-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 shadow-lg transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs bg-slate-800 h-6 w-6 rounded-full flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>الكل ({menuItems.length})</span>
          </button>

          {categories.map((category) => {
            const count = menuItems.filter((i) => i.category_name === category).length
            return (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === category
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {category} ({count})
              </button>
            )
          })}
        </div>

        {/* Count info */}
        <div className="flex items-center justify-between px-1 mb-3 text-xs text-slate-400 font-medium">
          <span>المنتجات المعروضة:</span>
          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            {filteredItems.length} متوفر
          </span>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 space-y-2.5 mb-6">
          {isLoadingMenu ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-slate-900/60 border border-slate-800/80 animate-pulse"
              />
            ))
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800/60 p-6">
              <Gamepad2 className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-300">لا توجد منتجات مطابقة</p>
              <p className="text-xs text-slate-500 mt-1">
                جرّب البحث باسم آخر أو اختر قسماً مختلفاً
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 flex items-center justify-between gap-3 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-sm text-slate-100 leading-snug group-hover:text-emerald-400 transition-colors">
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/50">
                      {item.category_name}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400/90 flex items-center gap-1">
                      <PackageCheck className="h-3 w-3" />
                      متوفر في المخزن
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="text-left shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl">
                  <span className="block text-base sm:text-lg font-black font-mono text-emerald-400 leading-none">
                    {item.sale_price.toLocaleString('ar-EG', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500/80 block text-center mt-0.5">
                    ج.م
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="mt-auto pt-4 border-t border-slate-900 text-center text-xs text-slate-500 font-medium">
          <p>
            الأسعار تخضع للتحديث المباشر وفقاً للمتوفر بمخزن {storeName}
          </p>
        </footer>
      </div>

      {/* Hidden off-screen printable container for A4 printing */}
      <div
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '210mm',
        }}
        aria-hidden="true"
      >
        <div
          ref={printMenuRef}
          className="p-8 bg-white text-slate-900 font-sans"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl">
                <Gamepad2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {storeName}
                </h1>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">
                  صيانة وبيع أجهزة ودراعات وإكسسوارات وقطع غيار بلايستيشن
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3" dir="ltr">
              <div className="bg-white p-1 rounded-lg border border-slate-300">
                <QRCodeSVG
                  value={typeof window !== 'undefined' ? window.location.href : '/menu'}
                  size={70}
                  level="M"
                />
              </div>
              <div className="text-right" dir="rtl">
                <p className="text-xs font-bold text-slate-900">المنيو الرقمي المباشر</p>
                <p className="text-[10px] text-slate-500">امسح الكود لتحديث الأسعار</p>
                <p className="text-[10px] text-slate-600 font-medium mt-1 flex items-center justify-end gap-1">
                  <Calendar className="h-3 w-3 text-slate-500" />
                  <span>تاريخ الطباعة: {currentDate}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Info bar */}
          <div className="bg-slate-100 rounded-xl p-3 mb-4 flex items-center justify-between text-xs border border-slate-200">
            <div className="font-bold text-slate-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>
                قائمة الأسعار والمنتجات المتوفرة حالياً
                {selectedCategory !== 'all' ? ` (قسم: ${selectedCategory})` : ''}:
              </span>
            </div>
            <span className="font-bold text-emerald-700 bg-white px-3 py-1 rounded-md border border-slate-200 text-xs">
              {filteredItems.length} صنف متوفر
            </span>
          </div>

          {/* Products Table */}
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2.5 border border-slate-800 text-center w-12 font-bold">#</th>
                <th className="p-2.5 border border-slate-800 font-bold">اسم المنتج</th>
                <th className="p-2.5 border border-slate-800 w-40 font-bold">القسم</th>
                <th className="p-2.5 border border-slate-800 text-center w-28 font-bold">الحالة</th>
                <th className="p-2.5 border border-slate-800 text-center w-32 font-bold">السعر (ج.م)</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr
                  key={item.id}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  style={{ pageBreakInside: 'avoid' }}
                >
                  <td className="p-2.5 border border-slate-200 text-center font-bold text-slate-500">
                    {index + 1}
                  </td>
                  <td className="p-2.5 border border-slate-200 font-black text-slate-900 text-[13px]">
                    {item.name}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-slate-700 font-medium">
                    {item.category_name}
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center text-emerald-700 font-bold">
                    متوفر بالمخزن
                  </td>
                  <td className="p-2.5 border border-slate-200 text-center font-black text-slate-900 font-mono text-sm">
                    {item.sale_price.toLocaleString('ar-EG', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{' '}
                    <span className="text-[11px] font-bold text-slate-600">ج.م</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t-2 border-slate-300 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-4">
              {storePhone && (
                <span className="font-bold text-slate-900">
                  هاتف / واتساب: {storePhone}
                </span>
              )}
              {storeAddress && <span>العنوان: {storeAddress}</span>}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              الأسعار قابلة للتحديث وفقاً لتغيرات السوق وتوافر المخزون
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
