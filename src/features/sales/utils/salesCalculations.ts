/**
 * Financial calculation utilities for sales, returns, and credit transactions.
 * Ensures consistent accounting across Sales Ledger, Dashboard, and Customer accounts:
 *
 * Equation: Net Sales (صافي المبيعات) = Net Paid (المحصل الفعلي) + Net Remaining (المتبقي بالأجل)
 * Equation: Net Sales = Gross Total (الإجمالي قبل المرتجع) - Return Amount (المرتجع)
 */

export interface SaleFinancials {
  grossTotal: number        // Original invoice total (total_amount)
  discount: number          // Discount granted on invoice
  returnAmount: number      // Amount returned
  isFullyReturned: boolean  // Is invoice completely returned
  netTotal: number          // Net sales after returns
  netPaid: number           // Net cash/card collected and retained
  netRemaining: number      // Net credit debt still owed
}

export interface SaleLike {
  total_amount: number | string | null
  discount?: number | string | null
  return_amount?: number | string | null
  is_fully_returned?: boolean | null
  amount_paid?: number | string | null
  remaining_amount?: number | string | null
  payment_method?: string | null
}

/**
 * Calculates accurate financial metrics for a single sale row.
 * Handles returns on cash, card, and credit sales seamlessly.
 */
export function computeSaleFinancials(sale: SaleLike): SaleFinancials {
  const grossTotal = Math.max(0, Number(sale.total_amount || 0))
  const discount = Math.max(0, Number(sale.discount || 0))
  const isFullyReturned = Boolean(sale.is_fully_returned)
  const rawReturnAmount = Math.max(0, Number(sale.return_amount || 0))
  const returnAmount = isFullyReturned
    ? grossTotal
    : Math.min(grossTotal, rawReturnAmount)

  // 1. If fully returned, all net values become zero
  if (isFullyReturned || returnAmount >= grossTotal) {
    return {
      grossTotal,
      discount,
      returnAmount: grossTotal,
      isFullyReturned: true,
      netTotal: 0,
      netPaid: 0,
      netRemaining: 0,
    }
  }

  // 2. Net sales amount
  const netTotal = Math.max(0, grossTotal - returnAmount)

  const isCredit = sale.payment_method === 'credit'
  const rawPaid = Number(
    sale.amount_paid !== null && sale.amount_paid !== undefined
      ? sale.amount_paid
      : isCredit ? 0 : grossTotal
  )
  const rawRemaining = Number(
    sale.remaining_amount !== null && sale.remaining_amount !== undefined
      ? sale.remaining_amount
      : isCredit ? Math.max(0, grossTotal - rawPaid) : 0
  )

  let netRemaining = Math.max(0, rawRemaining)
  let netPaid = Math.max(0, rawPaid)

  // 3. Reconcile returns against debt and collected cash:
  // If the DB already adjusted them, rawRemaining + rawPaid <= netTotal.
  // If the DB hasn't adjusted them yet (old return records), the return
  // reduces remaining debt first, and any leftover return refunds collected cash.
  const excess = (netRemaining + netPaid) - netTotal
  if (excess > 0.001) {
    const debtReduction = Math.min(netRemaining, excess)
    netRemaining = Math.max(0, netRemaining - debtReduction)
    const cashRefund = excess - debtReduction
    netPaid = Math.max(0, netPaid - cashRefund)
  }

  return {
    grossTotal,
    discount,
    returnAmount,
    isFullyReturned: false,
    netTotal,
    netPaid,
    netRemaining,
  }
}

export interface AggregatedSalesStats {
  totalCount: number
  activeCount: number
  returnedCount: number
  totalGrossSales: number
  totalNetSales: number
  totalPaid: number
  totalCreditRemaining: number
  totalReturns: number
  totalDiscounts: number
}

/**
 * Aggregates a list of sales into clean financial KPIs.
 */
export function aggregateSalesStats(sales: SaleLike[]): AggregatedSalesStats {
  let totalGrossSales = 0
  let totalNetSales = 0
  let totalPaid = 0
  let totalCreditRemaining = 0
  let totalReturns = 0
  let totalDiscounts = 0
  let activeCount = 0
  let returnedCount = 0

  sales.forEach((s) => {
    const fin = computeSaleFinancials(s)

    totalGrossSales += fin.grossTotal
    totalNetSales += fin.netTotal
    totalPaid += fin.netPaid
    totalCreditRemaining += fin.netRemaining
    totalReturns += fin.returnAmount
    totalDiscounts += fin.discount

    if (fin.isFullyReturned) {
      returnedCount += 1
    } else {
      activeCount += 1
    }
  })

  return {
    totalCount: sales.length,
    activeCount,
    returnedCount,
    totalGrossSales,
    totalNetSales,
    totalPaid,
    totalCreditRemaining,
    totalReturns,
    totalDiscounts,
  }
}
