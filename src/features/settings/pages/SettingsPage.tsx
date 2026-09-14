import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  getStoreSettings,
  updateStoreSettings,
  getAdminUsersList,
  adminUpdateUser,
  type AdminUserItem,
} from '../api/settingsApi'
import { EditUserModal } from '../components/EditUserModal'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Settings,
  Store,
  Users,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Edit2,
  Info,
  Receipt,
  Gamepad2,
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user: currentAuthUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'store' | 'users'>('store')

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback(null), 4000)
  }

  // --- 1. Store Settings State ---
  const {
    data: storeSettings,
    isLoading: isLoadingSettings,
    refetch: refetchSettings,
  } = useQuery({
    queryKey: ['store-settings'],
    queryFn: getStoreSettings,
  })

  const [storeName, setStoreName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [currency, setCurrency] = useState('EGP')
  const [logoUrl, setLogoUrl] = useState('')
  const [footerNote, setFooterNote] = useState('')

  useEffect(() => {
    if (storeSettings) {
      setStoreName(storeSettings.store_name || '')
      setPhone(storeSettings.phone || '')
      setAddress(storeSettings.address || '')
      setCurrency(storeSettings.currency || 'EGP')
      setLogoUrl(storeSettings.logo_url || '')
      setFooterNote(storeSettings.invoice_footer_note || '')
    }
  }, [storeSettings])

  const settingsMutation = useMutation({
    mutationFn: async () => {
      if (!storeSettings?.id) {
        throw new Error('لم يتم العثور على سجل الإعدادات')
      }
      return updateStoreSettings(storeSettings.id, {
        store_name: storeName,
        phone,
        address,
        currency,
        logo_url: logoUrl,
        invoice_footer_note: footerNote,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] })
      queryClient.invalidateQueries({ queryKey: ['report-store-settings'] })
      queryClient.invalidateQueries({ queryKey: ['public-store-info'] })
      showFeedback('success', 'تم حفظ وتحديث إعدادات المتجر بنجاح')
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل حفظ الإعدادات')
    },
  })

  // --- 2. User Management State ---
  const {
    data: usersList = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
    isFetching: isFetchingUsers,
  } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAdminUsersList,
  })

  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const updateUserMutation = useMutation({
    mutationFn: adminUpdateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] })
      queryClient.invalidateQueries({ queryKey: ['report-cashiers'] })
      showFeedback('success', 'تم تحديث بيانات وصلاحيات المستخدم بنجاح')
    },
    onError: (err: any) => {
      showFeedback('error', err?.message || 'فشل تحديث المستخدم')
    },
  })

  const handleOpenEditUser = (u: AdminUserItem) => {
    setEditingUser(u)
    setIsEditModalOpen(true)
  }

  const handleToggleUserStatus = (u: AdminUserItem) => {
    if (u.id === currentAuthUser?.id) {
      showFeedback('error', 'لا يمكنك تعطيل حسابك الشخصي!')
      return
    }

    updateUserMutation.mutate({
      userId: u.id,
      role: u.role,
      isActive: !u.is_active,
      fullName: u.full_name,
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-7 w-7 text-primary" />
            <span>إعدادات المتجر والمستخدمين</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-medium">
            بيانات المتجر الرسمية، تذييل الفاتورة، العملة، وإدارة حسابات الكاشيرات
          </p>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="bg-muted/50 p-1 rounded-xl border border-border flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'store'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>بيانات المتجر والفواتير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>المستخدمين والكاشيرات ({usersList.length})</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-destructive/10 border-destructive/30 text-destructive'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* --- TAB 1: STORE SETTINGS --- */}
      {activeTab === 'store' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings Form (2 cols) */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-black">
                    البيانات الرسمية للمتجر والفاتورة
                  </CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSettings()}
                  className="h-8 text-xs text-muted-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5 ml-1" />
                  إعادة ضبط
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {isLoadingSettings ? (
                <div className="space-y-4 py-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    settingsMutation.mutate()
                  }}
                  className="space-y-4"
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Store Name */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        اسم المتجر (يظهر في الترويسة والفواتير):
                      </label>
                      <Input
                        type="text"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="Crash Store (كراش ستور)"
                        className="h-9 text-xs"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        رقم هاتف المتجر / واتساب:
                      </label>
                      <Input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="01000000000"
                        className="h-9 text-xs font-mono text-right"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Address */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        العنوان والموقع:
                      </label>
                      <Input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="المحلة الكبرى - شارع البحر"
                        className="h-9 text-xs"
                      />
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1">
                        العملة الافتراضية:
                      </label>
                      <Input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="EGP أو ج.م"
                        className="h-9 text-xs font-bold"
                        required
                      />
                    </div>
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      رابط الشعار / اللوجو (اختياري):
                    </label>
                    <Input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="h-9 text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      اتركه فارغاً لاستخدام أيقونة البلايستيشن وشعار Crash Store التلقائي.
                    </p>
                  </div>

                  {/* Invoice Footer Note */}
                  <div>
                    <label className="text-xs font-bold text-foreground block mb-1">
                      ملاحظة وسياسة الاسترجاع في أسفل الفاتورة (Footer Note):
                    </label>
                    <textarea
                      rows={3}
                      value={footerNote}
                      onChange={(e) => setFooterNote(e.target.value)}
                      placeholder="شكراً لتعاملكم معنا! البضاعة المباعة ترد وتستبدل خلال 14 يوماً بموجب أصل الفاتورة."
                      className="w-full p-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      type="submit"
                      disabled={settingsMutation.isPending}
                      className="gap-2 font-bold px-6 shadow-sm"
                    >
                      {settingsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>حفظ إعدادات المتجر</span>
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Receipt Live Preview (1 col) */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black">
                  معاينة ترويسة الفاتورة المطبوعة
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-xs text-center font-sans space-y-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-1">
                  <Gamepad2 className="h-6 w-6" />
                </div>

                <h3 className="font-black text-lg text-slate-900 leading-tight">
                  {storeName || 'Crash Store'}
                </h3>

                <p className="text-[11px] text-slate-600 font-semibold">
                  {address || 'عنوان المتجر'}
                </p>

                {phone && (
                  <p className="text-[11px] font-bold text-slate-800 font-mono">
                    هاتف: {phone}
                  </p>
                )}

                <div className="py-2 border-y border-dashed border-slate-300 text-xs text-slate-500 flex justify-between font-mono">
                  <span>فاتورة: #10024</span>
                  <span>العملة: {currency || 'EGP'}</span>
                </div>

                <div className="pt-2 text-[10px] text-slate-500 leading-relaxed border-t border-slate-200 font-medium">
                  {footerNote ||
                    'شكراً لتعاملكم معنا! البضاعة المباعة ترد وتستبدل خلال 14 يوماً بموجب أصل الفاتورة.'}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                هكذا ستظهر بيانات متجرك على إيصالات الكاشير الحرارية 80mm وقوائم المنيو.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- TAB 2: USER MANAGEMENT --- */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Info Banner on User Creation */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3 text-xs text-foreground">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black text-sm text-primary">
                كيفية إضافة وتعيين كاشيرات ومستخدمين جدد:
              </p>
              <p className="text-muted-foreground leading-relaxed">
                حفاظاً على أعلى معايير الأمان (وفقاً لـ Supabase RLS)، يمكن للموظف أو الكاشير إنشاء حساب جديد بالبريد وكلمة المرور من صفحة الدخول، وسيقوم النظام تلقائياً بتعيينه برتبة <strong>«كاشير»</strong> بصلاحيات POS فقط.
                ومن هذه الشاشة يمكنك ترقيته إلى <strong>«مدير نظام»</strong>، أو تعديل اسمه، أو <strong>«تعطيل حسابه»</strong> في أي وقت فوراً.
              </p>
            </div>
          </div>

          {/* Users Table Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base font-black">
                    حسابات المستخدمين والكاشيرات ({usersList.length})
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    التحكم في رتب المستخدمين، الصلاحيات، وتنشيط أو إيقاف الحسابات
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchUsers()}
                disabled={isFetchingUsers}
                className="gap-1.5 h-8 text-xs font-bold"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetchingUsers ? 'animate-spin' : ''}`} />
                <span>تحديث القائمة</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : usersList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  لا يوجد مستخدمين مسجلين في النظام
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border font-bold">
                      <tr>
                        <th className="py-3 px-4">المستخدم</th>
                        <th className="py-3 px-4">البريد الإلكتروني</th>
                        <th className="py-3 px-4 text-center">الرتبة / الصلاحية</th>
                        <th className="py-3 px-4 text-center">حالة الحساب</th>
                        <th className="py-3 px-4">تاريخ التسجيل</th>
                        <th className="py-3 px-4">آخر دخول</th>
                        <th className="py-3 px-4 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {usersList.map((u) => {
                        const isSelf = u.id === currentAuthUser?.id
                        const createdDate = new Date(u.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                        const lastLogin = u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'لم يسجل دخول بعد'

                        return (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                                  {u.full_name?.slice(0, 1) || 'U'}
                                </div>
                                <div>
                                  <span className="block font-bold">{u.full_name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] text-emerald-600 font-bold">
                                      (حسابك الحالي)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {u.email}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                    : 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
                                }`}
                              >
                                <Shield className="h-3 w-3" />
                                <span>{u.role === 'admin' ? 'مدير نظام' : 'كاشير'}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={isSelf || updateUserMutation.isPending}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black transition-all ${
                                  u.is_active
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
                                } ${isSelf ? 'cursor-default' : 'cursor-pointer'}`}
                                title={isSelf ? 'حسابك الشخصي' : 'اضغط للتبديل'}
                              >
                                {u.is_active ? (
                                  <>
                                    <UserCheck className="h-3 w-3" />
                                    <span>نشط ومفعل</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-3 w-3" />
                                    <span>معطل ومحظور</span>
                                  </>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-4 text-muted-foreground text-[11px]">
                              {createdDate}
                            </td>

                            <td className="py-3 px-4 text-muted-foreground text-[11px]">
                              {lastLogin}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditUser(u)}
                                className="h-8 text-xs font-bold gap-1"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>تعديل</span>
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={editingUser}
        currentAdminId={currentAuthUser?.id}
        onSave={async (data) => {
          await updateUserMutation.mutateAsync(data)
        }}
        isSaving={updateUserMutation.isPending}
      />
    </div>
  )
}
