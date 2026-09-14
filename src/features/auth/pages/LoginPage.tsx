import React, { useState } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '../context/useAuth'
import { getPublicStoreInfo } from '@/features/menu/api/menuApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { ShoppingCart, AlertCircle, Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'يرجى إدخال البريد الإلكتروني' })
    .email({ message: 'صيغة البريد الإلكتروني غير صحيحة' }),
  password: z
    .string()
    .min(1, { message: 'يرجى إدخال كلمة المرور' })
    .min(4, { message: 'كلمة المرور يجب ألا تقل عن 4 أحرف' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginPage: React.FC = () => {
  const { signIn, user, role, isLoading } = useAuth()
  const location = useLocation()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const { data: storeInfo } = useQuery({
    queryKey: ['public-store-info'],
    queryFn: getPublicStoreInfo,
    staleTime: 1000 * 60 * 5,
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // If already authenticated and done loading, redirect based on role
  if (!isLoading && user) {
    if (role === 'cashier') {
      return <Navigate to="/pos" replace />
    }
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const onSubmit = async (data: LoginFormValues) => {
    setErrorMessage(null)
    const { error } = await signIn({
      email: data.email,
      password: data.password,
    })

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setErrorMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMessage('يرجى تأكيد بريدك الإلكتروني أولاً')
      } else {
        setErrorMessage(error.message || 'حدث خطأ أثناء تسجيل الدخول')
      }
      return
    }

    // Role will update via AuthContext listener and redirect automatically
  }

  const storeName = storeInfo?.store_name || 'متجر كراش (Crash Store)'
  const logoUrl = storeInfo?.logo_url || '/logo.webp'

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          {logoUrl ? (
            <div className="h-16 w-16 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg shadow-black/5 mb-3 p-2 overflow-hidden">
              <img src={logoUrl} alt={storeName} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 mb-3 text-primary-foreground">
              <ShoppingCart className="h-8 w-8" />
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {storeName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            نظام إدارة المبيعات ونقاط البيع الذكي
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/60 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">تسجيل الدخول</CardTitle>
            <CardDescription className="text-center">
              أدخل بيانات حسابك للمتابعة إلى النظام
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  dir="ltr"
                  className="text-left font-sans"
                  disabled={isSubmitting}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    dir="ltr"
                    className="text-left font-sans pr-3 pl-10"
                    disabled={isSubmitting}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button
                type="submit"
                className="w-full text-base font-semibold h-11"
                isLoading={isSubmitting}
              >
                تسجيل الدخول
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          جميع الحقوق محفوظة © {new Date().getFullYear()} Crash Store POS
        </p>
      </div>
    </div>
  )
}
