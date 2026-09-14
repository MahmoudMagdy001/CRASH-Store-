import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    if (open) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog content wrapper */}
      <div className="relative z-50 w-full flex items-center justify-center pointer-events-auto max-h-[92vh]">
        {children}
      </div>
    </div>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, maxWidth = 'lg', ...props }, ref) => {
    const maxWidthClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '3xl': 'max-w-3xl',
      '4xl': 'max-w-4xl',
      '5xl': 'max-w-5xl',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative w-full mx-auto rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]',
          maxWidthClasses[maxWidth],
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">إغلاق</span>
          </button>
        )}
        {children}
      </div>
    )
  }
)
DialogContent.displayName = 'DialogContent'

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn('flex flex-col space-y-1.5 p-5 pb-4 border-b border-border/50 text-right shrink-0', className)}
    {...props}
  />
)

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  ...props
}) => (
  <h2
    className={cn('text-lg font-bold leading-none tracking-tight text-foreground', className)}
    {...props}
  />
)

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  ...props
}) => (
  <p
    className={cn('text-sm text-muted-foreground mt-1', className)}
    {...props}
  />
)

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => (
  <div
    className={cn(
      'flex items-center justify-end gap-3 p-4 bg-muted/30 border-t border-border/50 shrink-0 mt-auto',
      className
    )}
    {...props}
  />
)
