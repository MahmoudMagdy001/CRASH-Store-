import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getPosProducts,
  getStoreSettings,
  submitSale,
  getSaleById,
} from '../api/posApi'
import type {
  PosProduct,
  CartItem,
  SettingsRow,
  SaleWithDetails,
} from '../types/pos.types'
import { PosProductCard } from '../components/PosProductCard'
import { PosCart } from '../components/PosCart'
import { ReceiptModal } from '../components/ReceiptModal'
import { Input } from '@/components/ui/input'
import {
  Barcode,
  Layers,
  PackageX,
} from 'lucide-react'

export const PosPage: React.FC = () => {
  const queryClient = useQueryClient()

  // State
  const [products, setProducts] = useState<PosProduct[]>([])
  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false)

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Cart
  const [cart, setCart] = useState<CartItem[]>([])

  // Completed sale for receipt modal
  const [completedSale, setCompletedSale] = useState<SaleWithDetails | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false)
  const [barcodeError, setBarcodeError] = useState<string | null>(null)

  // Scanner input ref
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  // Initial load
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [prods, storeSet] = await Promise.all([
        getPosProducts(),
        getStoreSettings(),
      ])
      setProducts(prods)
      setSettings(storeSet)
    } catch (err) {
      console.error('Failed to load POS data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for refresh event triggered from PosHeaderSummary
  useEffect(() => {
    const handleRefresh = () => {
      loadData()
    }
    window.addEventListener('pos-refresh', handleRefresh)
    return () => window.removeEventListener('pos-refresh', handleRefresh)
  }, [loadData])

  // Focus barcode input on mount and when receipt modal closes
  useEffect(() => {
    if (!isReceiptOpen) {
      setTimeout(() => {
        barcodeInputRef.current?.focus()
      }, 100)
    }
  }, [isReceiptOpen])

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>()
    products.forEach((p) => {
      if (p.categories) {
        const existing = map.get(p.categories.id)
        if (existing) {
          existing.count += 1
        } else {
          map.set(p.categories.id, {
            id: p.categories.id,
            name: p.categories.name,
            count: 1,
          })
        }
      }
    })
    return Array.from(map.values())
  }, [products])

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return products.filter((p) => {
      const matchesCat =
        selectedCategory === 'all' || p.category_id === selectedCategory
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      return matchesCat && matchesSearch
    })
  }, [products, searchQuery, selectedCategory])

  // Add product to cart handler
  const handleAddToCart = useCallback((product: PosProduct) => {
    if (product.quantity <= 0) return

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        // Prevent exceeding available stock
        if (existing.quantity >= product.quantity) {
          return prev
        }
        return prev.map((item) =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            name: product.name,
            barcode: product.barcode,
            unit_price: product.sale_price,
            quantity: 1,
            max_stock: product.quantity,
            category_name: product.categories?.name,
          },
        ]
      }
    })

    setBarcodeError(null)
  }, [])

  // Barcode scanner keydown handler (Auto-add on Enter)
  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const rawCode = searchQuery.trim()
      if (!rawCode) return

      // Find by exact barcode first
      const exactByBarcode = products.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === rawCode.toLowerCase()
      )

      if (exactByBarcode) {
        if (exactByBarcode.quantity <= 0) {
          setBarcodeError(`المنتج "${exactByBarcode.name}" نفد من المخزن!`)
        } else {
          handleAddToCart(exactByBarcode)
          setSearchQuery('')
          setBarcodeError(null)
        }
        return
      }

      // If no exact barcode match, check if there's only 1 matching product in filtered list
      if (filteredProducts.length === 1) {
        const prod = filteredProducts[0]
        if (prod.quantity > 0) {
          handleAddToCart(prod)
          setSearchQuery('')
          setBarcodeError(null)
        } else {
          setBarcodeError(`المنتج "${prod.name}" نفد من المخزن!`)
        }
        return
      }

      // If not found
      setBarcodeError(`لم يتم العثور على باركود: ${rawCode}`)
    }
  }

  // Update quantity
  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(productId)
      return
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const boundedQty = Math.min(newQty, item.max_stock)
          return { ...item, quantity: boundedQty }
        }
        return item
      })
    )
  }

  // Remove item
  const handleRemoveItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId))
  }

  // Clear cart
  const handleClearCart = () => {
    setCart([])
    setBarcodeError(null)
    barcodeInputRef.current?.focus()
  }

  // Complete checkout
  const handleCheckout = async (checkoutData: {
    paymentMethod: 'cash' | 'card' | 'credit'
    customerName?: string
    amountPaid?: number
    remainingAmount?: number
    discountType: 'fixed' | 'percentage'
    discountValue: number
    calculatedDiscount: number
    netTotal: number
    receivedAmount?: number
  }) => {
    setIsCheckingOut(true)
    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      const saleId = await submitSale({
        subtotal: checkoutData.netTotal + checkoutData.calculatedDiscount,
        discount: checkoutData.calculatedDiscount,
        discount_type: checkoutData.discountType,
        discount_value: checkoutData.discountValue,
        total_amount: checkoutData.netTotal,
        payment_method: checkoutData.paymentMethod,
        customer_name: checkoutData.customerName,
        amount_paid: checkoutData.amountPaid,
        remaining_amount: checkoutData.remainingAmount,
        items: itemsPayload,
      })

      // Fetch sale details for receipt modal
      const saleDetails = await getSaleById(saleId)
      setCompletedSale(saleDetails)
      setIsReceiptOpen(true)

      // Refresh product quantities and update daily summary in header
      const freshProds = await getPosProducts()
      setProducts(freshProds)
      queryClient.invalidateQueries({ queryKey: ['pos-daily-summary'] })

      // Reset cart
      setCart([])
      setBarcodeError(null)
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="h-full flex flex-col select-none">
      {/* Main POS Split Layout: Left = Cart, Right = Products & Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* Right Side (Catalog & Barcode Search) - 7 Cols on LG, 8 on XL */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-2.5 min-h-0">
          {/* Search and Barcode Scanner Input */}
          <div className="flex flex-col gap-1 bg-card p-2 rounded-2xl border border-border shrink-0 shadow-xs">
            <div className="relative flex-1">
              <Barcode className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
              <Input
                ref={barcodeInputRef}
                type="text"
                placeholder="امسح الباركود أو ابحث باسم المنتج واضغط Enter..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setBarcodeError(null)
                }}
                onKeyDown={handleBarcodeKeyDown}
                className={`pr-11 pl-4 h-11 text-sm bg-background rounded-xl focus-visible:ring-primary font-medium ${
                  barcodeError ? 'border-destructive' : 'border-border/80'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setBarcodeError(null)
                    barcodeInputRef.current?.focus()
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>
            {barcodeError && (
              <p className="text-xs text-destructive font-medium px-2 py-0.5">
                {barcodeError}
              </p>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              الكل ({products.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.name} ({cat.count})
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-1 pl-1">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-36 rounded-2xl bg-muted/50 animate-pulse border border-border/50"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground bg-card/50 rounded-2xl border border-dashed">
                <PackageX className="h-12 w-12 stroke-1 mb-2 opacity-40" />
                <p className="text-sm font-bold text-foreground">
                  لا توجد منتجات مطابقة
                </p>
                <p className="text-xs mt-1">
                  تأكد من كتابة الاسم أو الباركود بشكل صحيح
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find(
                    (item) => item.product_id === product.id
                  )
                  return (
                    <PosProductCard
                      key={product.id}
                      product={product}
                      onSelect={handleAddToCart}
                      currentInCartCount={cartItem?.quantity || 0}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Left Side (Cart & Checkout) - 5 Cols on LG, 4 on XL */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-h-0">
          <PosCart
            items={cart}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            onCheckout={handleCheckout}
            isCheckingOut={isCheckingOut}
          />
        </div>
      </div>

      {/* Post-sale Thermal Receipt Modal */}
      <ReceiptModal
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        sale={completedSale}
        settings={settings}
        onNewSale={() => {
          setIsReceiptOpen(false)
          setCompletedSale(null)
          barcodeInputRef.current?.focus()
        }}
      />
    </div>
  )
}
