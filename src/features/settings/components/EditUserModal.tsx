import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { AdminUserItem } from '../api/settingsApi'
import { UserCheck, Shield, UserX, AlertCircle, Loader2 } from 'lucide-react'

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: AdminUserItem | null
  currentAdminId?: string
  onSave: (data: {
    userId: string
    role: 'admin' | 'cashier'
    isActive: boolean
    fullName: string
  }) => Promise<void>
  isSaving: boolean
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onOpenChange,
  user,
  currentAdminId,
  onSave,
  isSaving,
}) => {
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'cashier'>('cashier')
  const [isActive, setIsActive] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setRole(user.role)
      setIsActive(user.is_active)
      setErrorMsg(null)
    }
  }, [user])

  if (!user) return null

  const isSelf = currentAdminId === user.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!fullName.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم.')
      return
    }

    if (isSelf && !isActive) {
      setErrorMsg('لا يمكنك تعطيل حسابك الشخصي.')
      return
    }

    if (isSelf && role !== 'admin') {
      setErrorMsg('لا يمكنك إزالة صلاحية المدير عن حسابك الشخصي.')
      return
    }

    try {
      await onSave({
        userId: user.id,
        fullName: fullName.trim(),
        role,
        isActive,
      })
      onOpenChange(false)
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تحديث بيانات المستخدم')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} maxWidth="md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <DialogTitle>تعديل صلاحيات وحساب المستخدم</DialogTitle>
            </div>
            <DialogDescription>
              تعديل الرتبة، الاسم، وحالة تنشيط الحساب للبريد: {user.email}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* User Email (Read-only) */}
            <div>
              <label className="text-xs font-bold text-muted-foreground block mb-1">
                البريد الإلكتروني المسجل:
              </label>
              <Input
                type="text"
                value={user.email}
                disabled
                className="h-9 text-xs bg-muted/50 cursor-not-allowed font-mono"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                اسم المستخدم / الكاشير:
              </label>
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="اسم الكاشير أو المسؤول..."
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Role Selector */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                الرتبة والصلاحية:
              </label>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'cashier')}
                disabled={isSelf}
                className="h-9 text-xs font-bold"
              >
                <option value="cashier">كاشير (POS ونقطة البيع فقط)</option>
                <option value="admin">مدير نظام (صلاحيات كاملة لكل الشاشات)</option>
              </Select>
              {isSelf && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  لا يمكنك تعديل رتبتك الشخصية من هنا لأسباب أمنية.
                </p>
              )}
            </div>

            {/* Account Status Toggle */}
            <div className="pt-2 border-t border-border">
              <label className="text-xs font-bold text-foreground block mb-1.5">
                حالة الحساب:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsActive(true)}
                  disabled={isSelf}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:border-emerald-500/40'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>نشط ومفعل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsActive(false)}
                  disabled={isSelf}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    !isActive
                      ? 'bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 shadow-xs'
                      : 'bg-background border-border text-muted-foreground hover:border-rose-500/40'
                  }`}
                >
                  <UserX className="h-4 w-4" />
                  <span>معطل (محظور)</span>
                </button>
              </div>
              {isSelf ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  حسابك الشخصي لا يمكن تعطيله.
                </p>
              ) : !isActive ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-medium">
                  الحساب المعطل لن يتمكن من تسجيل الدخول للنظام أو استخدام نقطة البيع.
                </p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isSaving} className="font-bold gap-1.5">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>حفظ التعديلات</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
