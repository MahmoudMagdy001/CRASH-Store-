import React, { useState, useRef, useEffect } from 'react'
import type { ProductWithCategory } from '@/features/products/api/productsApi'
import { Input } from '@/components/ui/input'
import { Search, Sparkles, Check, X, ChevronDown, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectedProductValue {
  product_id: string | null // null if it's a new product
  name: string
  is_new: boolean
}

interface ProductComboboxProps {
  products: ProductWithCategory[]
  value: SelectedProductValue
  onChange: (val: SelectedProductValue, matchedProduct?: ProductWithCategory) => void
  disabled?: boolean
  placeholder?: string
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  value,
  onChange,
  disabled = false,
  placeholder = 'ابحث باسم المنتج أو الباركود، أو اكتب اسم منتج جديد...',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(value.name || '')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep search term in sync with external value
  useEffect(() => {
    setSearchTerm(value.name || '')
  }, [value.name])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        // If user typed something and closed without explicitly selecting, but there's a typed value:
        if (searchTerm.trim() && !value.name) {
          // Check if it matches an existing product exactly
          const exact = products.find(
            (p) => p.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
          )
          if (exact) {
            onChange({ product_id: exact.id, name: exact.name, is_new: false }, exact)
          } else {
            onChange({ product_id: null, name: searchTerm.trim(), is_new: true })
          }
        } else if (!searchTerm.trim()) {
          onChange({ product_id: null, name: '', is_new: false })
        } else {
          // Reset search term back to confirmed value
          setSearchTerm(value.name)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchTerm, value.name, products, onChange])

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase().trim()
    const nameMatch = p.name.toLowerCase().includes(term)
    const barcodeMatch = p.barcode?.toLowerCase().includes(term)
    return nameMatch || barcodeMatch
  })

  const exactMatch = products.find(
    (p) => p.name.trim().toLowerCase() === searchTerm.trim().toLowerCase()
  )

  const handleSelectExisting = (product: ProductWithCategory) => {
    setSearchTerm(product.name)
    onChange(
      {
        product_id: product.id,
        name: product.name,
        is_new: false,
      },
      product
    )
    setIsOpen(false)
  }

  const handleSelectAsNew = (nameToUse?: string) => {
    const finalName = (nameToUse || searchTerm).trim()
    if (!finalName) return

    setSearchTerm(finalName)
    onChange({
      product_id: null,
      name: finalName,
      is_new: true,
    })
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    onChange({ product_id: null, name: '', is_new: false })
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredProducts.length === 1 && !exactMatch) {
        handleSelectExisting(filteredProducts[0])
      } else if (exactMatch) {
        handleSelectExisting(exactMatch)
      } else if (searchTerm.trim()) {
        handleSelectAsNew()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'pl-16 pr-8 text-sm transition-all',
            value.is_new && 'border-primary/50 bg-primary/5 font-medium'
          )}
        />

        {/* Search Icon */}
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

        {/* Right side status icons / clear button */}
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value.is_new && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground">
              <Sparkles className="h-2.5 w-2.5" />
              جديد
            </span>
          )}

          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Quick Add As New Product Option */}
          {searchTerm.trim() && !exactMatch && (
            <div className="p-1.5 border-b border-border/60 bg-primary/5">
              <button
                type="button"
                onClick={() => handleSelectAsNew()}
                className="w-full text-right px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-lg flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>
                    إضافة كمنتج جديد للمحل: <span className="underline font-black">&ldquo;{searchTerm.trim()}&rdquo;</span>
                  </span>
                </div>
                <span className="text-[10px] font-normal px-2 py-0.5 bg-primary/10 rounded text-primary">
                  اضغط Enter أو انقر هنا
                </span>
              </button>
            </div>
          )}

          {/* Existing Products List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40 p-1">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {searchTerm.trim() ? (
                  <p>لا يوجد منتج مطابق في المخزن — يمكنك اختياره كمنتج جديد أعلاه 👆</p>
                ) : (
                  <p>لا توجد منتجات مسجلة حتى الآن</p>
                )}
              </div>
            ) : (
              filteredProducts.map((prod) => {
                const isSelected = value.product_id === prod.id
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleSelectExisting(prod)}
                    className={cn(
                      'w-full text-right px-3 py-2 text-xs rounded-lg flex items-center justify-between hover:bg-accent transition-colors cursor-pointer',
                      isSelected && 'bg-primary/10 text-primary font-semibold'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-muted text-muted-foreground">
                        <Package className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{prod.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          {prod.barcode && <span className="font-mono">#{prod.barcode}</span>}
                          <span>المخزون الحالي: {prod.quantity} قطعة</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left flex items-center gap-2">
                      <div>
                        <div className="font-mono font-bold text-foreground">
                          {prod.purchase_price > 0 ? `${prod.purchase_price} ج.م تكلفة` : ''}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          بيع: {prod.sale_price} ج.م
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
