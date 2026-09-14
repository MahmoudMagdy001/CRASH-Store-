import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPublicMenu, getPublicStoreInfo } from '../api/menuApi'
import {
  Gamepad2,
  Search,
  Phone,
  MapPin,
  Sparkles,
  MessageCircle,
  PackageCheck,
  RefreshCw,
} from 'lucide-react'

export const PublicMenuPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')

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

  // Filtered items by search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return menuItems

    const q = searchTerm.trim().toLowerCase()
    return menuItems.filter((item) => item.name.toLowerCase().includes(q))
  }, [menuItems, searchTerm])

  const storeName = storeInfo?.store_name || 'Crash Store (كراش ستور)'
  const storePhone = storeInfo?.phone || ''
  const storeAddress = storeInfo?.address || 'صيانة وبيع أجهزة واكسسوارات بلايستيشن'

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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 overflow-hidden p-1">
                {storeInfo?.logo_url ? (
                  <img
                    src={storeInfo.logo_url}
                    alt={storeName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Gamepad2 className="h-7 w-7" />
                )}
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
                onClick={() => refetchMenu()}
                disabled={isFetching}
                className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-colors shadow-sm"
                title="تحديث القائمة والأسعار"
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
        <div className="relative mb-4 sticky top-3 z-20">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث عن اسم المنتج..."
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
              <p className="text-sm font-bold text-slate-300">لا توجد منتجات مطابقة للبحث</p>
              <p className="text-xs text-slate-500 mt-1">
                تأكد من كتابة اسم المنتج بشكل صحيح
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
    </div>
  )
}
