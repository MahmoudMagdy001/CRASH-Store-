/**
 * Centralized formatting utilities for Arabic digits and Egyptian localization (Crash Store)
 */

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const ENGLISH_DIGITS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
}

/**
 * Convert any string or number containing Latin digits (0-9) to Eastern Arabic digits (٠-٩)
 */
export function toArabicDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[0-9]/g, (d) => ARABIC_DIGITS[Number(d)])
}

/**
 * Convert Eastern Arabic digits (٠-٩) to Latin digits (0-9) for calculations and input parsing
 */
export function toEnglishDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[٠-٩]/g, (d) => ENGLISH_DIGITS[d] || d)
}

/**
 * Parse a string or number that may contain Arabic or English digits into a safe JavaScript number
 */
export function parseArabicNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return isNaN(value) ? 0 : value
  const normalized = toEnglishDigits(value).replace(/,/g, '').replace(/٫/g, '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? 0 : parsed
}

export interface FormatCurrencyOptions {
  showCurrency?: boolean
  currencySymbol?: string
  decimals?: number
  compact?: boolean
}

/**
 * Format currency with Arabic digits and Egyptian Pound symbol
 * Example: 150.5 -> "١٥٠٫٥٠ ج.م"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  const {
    showCurrency = true,
    currencySymbol = 'ج.م',
    decimals = 2,
  } = options

  const num = typeof value === 'number' ? value : parseArabicNumber(value)
  
  // Use ar-EG locale to format with proper decimal & thousand separators
  const formatted = num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return showCurrency ? `${formatted} ${currencySymbol}` : formatted
}

export interface FormatNumberOptions {
  decimals?: number
  useGrouping?: boolean
}

/**
 * Format a number/count into Eastern Arabic digits
 * Example: 25 -> "٢٥", 1234 -> "١٬٢٣٤"
 */
export function formatNumber(
  value: number | string | null | undefined,
  options: FormatNumberOptions = {}
): string {
  const { decimals = 0, useGrouping = true } = options
  const num = typeof value === 'number' ? value : parseArabicNumber(value)

  return num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping,
  })
}

/**
 * Format percentage into Eastern Arabic digits
 * Example: 15.5 -> "١٥٫٥٪"
 */
export function formatPercent(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  const num = typeof value === 'number' ? value : parseArabicNumber(value)
  const formatted = num.toLocaleString('ar-EG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return `${formatted}٪`
}

/**
 * Format date/time in Egyptian Arabic locale with Arabic digits
 * Example: "١٤ سبتمبر ٢٠٢٦" or "١٤/٠٩/٢٠٢٦ ٠٤:٣٠ م"
 */
export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }
): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('ar-EG', options)
  } catch {
    return '-'
  }
}

/**
 * Format full date and time in Egyptian Arabic locale
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  if (!date) return '-'
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleString('ar-EG', options)
  } catch {
    return '-'
  }
}
