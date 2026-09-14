import React from 'react'
import type { PosProduct } from '../types/pos.types'
import { Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

interface PosProductCardProps {
  product: PosProduct
  onSelect: (product: PosProduct) => void
  currentInCartCount?: number
}

export const PosProductCard: React.FC<PosProductCardProps> = ({
  product,
  onSelect,
  currentInCartCount = 0,
}) => {
  const isOutOfStock = product.quantity <= 0
  const isMaxInCart = currentInCartCount >= product.quantity
  const isLowStock =
    !isOutOfStock && product.quantity <= (product.min_quantity_alert || 3)

  const handleClick = () => {
    if (isOutOfStock || isMaxInCart) return
    onSelect(product)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOutOfStock || isMaxInCart}
      className={`relative flex flex-col justify-between p-3.5 rounded-xl border text-right transition-colors duration-150 h-32 select-none group focus:outline-none overflow-hidden ${
        isOutOfStock
          ? 'bg-muted/30 border-dashed border-border opacity-50 cursor-not-allowed'
          : isMaxInCart
          ? 'bg-primary/5 border-primary/40 cursor-not-allowed'
          : 'bg-card border-border hover:border-primary hover:bg-primary/[0.03] cursor-pointer'
      }`}
    >
      {/* Top row: Category badge and Stock badge */}
      <div className="flex items-center justify-between w-full gap-1">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground truncate max-w-[120px]">
          {product.categories?.name || 'عام'}
        </span>

        {isOutOfStock ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
            <XCircle className="h-3 w-3" />
            نفد
          </span>
        ) : isLowStock ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
            <AlertTriangle className="h-3 w-3" />
            متبقي {product.quantity}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            مخزون: {product.quantity}
          </span>
        )}
      </div>

      {/* Middle row: Product name */}
      <div className="my-auto py-1">
        <h3
          className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors"
          title={product.name}
        >
          {product.name}
        </h3>
        {product.barcode && (
          <span className="text-[10px] font-mono text-muted-foreground block truncate mt-0.5">
            {product.barcode}
          </span>
        )}
      </div>

      {/* Bottom row: Price and cart badge / add icon */}
      <div className="flex items-center justify-between w-full pt-1.5 border-t border-border/50">
        <div className="flex items-baseline gap-1">
          <span className="font-extrabold text-base text-primary">
            {product.sale_price.toLocaleString('ar-EG', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            ج.م
          </span>
        </div>

        {currentInCartCount > 0 ? (
          <span className="flex items-center gap-1 text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            {currentInCartCount}
          </span>
        ) : (
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground'
                : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
            }`}
          >
            <Plus className="h-4 w-4" />
          </div>
        )}
      </div>
    </button>
  )
}
