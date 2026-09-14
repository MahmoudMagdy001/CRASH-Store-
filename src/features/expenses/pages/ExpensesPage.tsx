import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/context/useAuth'
import {
  getExpenses,
  getExpensesSummary,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseWithCreator,
} from '../api/expensesApi'
import { ExpenseModal, type ExpenseFormValues } from '../components/ExpenseModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  WalletCards,
  Plus,
  Search,
  Calendar,
  Layers,
  Coins,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Receipt,
} from 'lucide-react'

export const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseWithCreator | null>(null)
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithCreator | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  )

  // Fetch Expenses
  const {
    data: expenses = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
  })

  // Fetch Summary
  const { data: summary } = useQuery({
    queryKey: ['expensesSummary'],
    queryFn: getExpensesSummary,
  })

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormValues) => createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] })
      setStatusMessage({ type: 'success', text: 'تم تسجيل المصروف بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormValues }) =>
      updateExpense({ id, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] })
      setStatusMessage({ type: 'success', text: 'تم تعديل بيانات المصروف بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expensesSummary'] })
      setExpenseToDelete(null)
      setStatusMessage({ type: 'success', text: 'تم حذف المصروف بنجاح' })
      setTimeout(() => setStatusMessage(null), 4000)
    },
    onError: (err: Error) => {
      setStatusMessage({ type: 'error', text: err.message })
    },
  })

  const handleOpenCreate = () => {
    setExpenseToEdit(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (expense: ExpenseWithCreator) => {
    setExpenseToEdit(expense)
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (values: ExpenseFormValues) => {
    if (expenseToEdit) {
      await updateMutation.mutateAsync({ id: expenseToEdit.id, data: values })
    } else {
      await createMutation.mutateAsync(values)
    }
  }

  // Filter expenses by search
  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.creator?.full_name && e.creator.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <WalletCards className="h-6 w-6 text-primary" />
            المصروفات التشغيلية
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تسجيل ومتابعة المصروفات اليومية والشهرية (إيجار، كهرباء، صيانة، نثريات)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            تحديث
          </Button>

          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            تسجيل مصروف جديد
          </Button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-2 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs hover:underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today's Expenses */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مصروفات اليوم</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {Number(summary?.todayTotal || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Month's Expenses */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">مصروفات الشهر الحالي</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {Number(summary?.monthTotal || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">ج.م</span>
              </h3>
            </div>
            <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
              <Coins className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Records */}
        <Card className="bg-card/50 border shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">إجمالي قيود المصروفات</p>
              <h3 className="text-2xl font-black text-foreground mt-1 font-mono tracking-tight">
                {summary?.totalCount || expenses.length}{' '}
                <span className="text-xs font-bold font-sans text-muted-foreground">قيد</span>
              </h3>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <Layers className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث ببند المصروف أو الملاحظات أو اسم المسئول..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-muted/50 text-muted-foreground font-semibold text-xs border-b">
              <tr>
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">بند المصروف</th>
                <th className="py-3.5 px-4 text-center">المبلغ</th>
                <th className="py-3.5 px-4">التاريخ والوقت</th>
                <th className="py-3.5 px-4">ملاحظات</th>
                <th className="py-3.5 px-4">مسجل المصروف</th>
                {isAdmin && <th className="py-3.5 px-4 text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      <span>جاري تحميل المصروفات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="h-10 w-10 text-muted-foreground/40 stroke-1" />
                      <p className="font-semibold text-foreground">لا توجد مصروفات مسجلة</p>
                      <p className="text-xs text-muted-foreground">
                        {searchTerm
                          ? 'لا توجد مصروفات تطابق البحث'
                          : 'اضغط على "تسجيل مصروف جديد" لإضافة قيد مصروفات'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense, index) => (
                  <tr key={expense.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {index + 1}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-foreground">{expense.title}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-destructive">
                      {Number(expense.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      <span className="text-xs text-muted-foreground font-sans">ج.م</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                      {new Date(expense.created_at).toLocaleString('ar-EG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground max-w-[200px] truncate">
                      {expense.notes || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      {expense.creator?.full_name?.trim() ||
                        (expense.creator?.role === 'admin' ? 'مدير النظام' : 'كاشير')}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(expense)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="تعديل المصروف"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpenseToDelete(expense)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="حذف المصروف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        expenseToEdit={expenseToEdit}
        onSubmit={handleModalSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(expenseToDelete)} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <DialogContent onClose={() => setExpenseToDelete(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              تأكيد حذف المصروف
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف مصروف &quot;{expenseToDelete?.title}&quot; بقيمة{' '}
              {Number(expenseToDelete?.amount || 0).toLocaleString('en-US')} ج.م؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => expenseToDelete && deleteMutation.mutate(expenseToDelete.id)}
              isLoading={deleteMutation.isPending}
            >
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
