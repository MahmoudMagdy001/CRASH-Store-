import React from 'react'
import { Loader2 } from 'lucide-react'

export const PageLoader: React.FC<{ message?: string }> = ({
  message = 'جاري تحميل الصفحة...',
}) => {
  return (
    <div className="flex-1 w-full h-[60vh] min-h-[300px] flex flex-col items-center justify-center gap-3 select-none">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-pulse">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  )
}
