// Helper utilities for ID formatting and data handling

/**
 * Convert UUID to short display format
 * @param uuid Full UUID string
 * @returns Last 4 characters of UUID for display
 */
export function shortId(uuid: string | undefined | null): string {
  if (!uuid) return '----';
  // Get last 4 characters of UUID
  return uuid.slice(-4).toUpperCase();
}

/**
 * Format branch ID for display
 * @param branchId UUID or short code
 * @returns Formatted short code like "0001"
 */
export function formatBranchId(branchId: string | undefined | null): string {
  if (!branchId) return '----';
  // If already short (less than 10 chars), return as-is
  if (branchId.length <= 10) return branchId;
  // Otherwise extract last 4 digits
  return branchId.slice(-4).toUpperCase();
}

/**
 * Safe number parser that never returns NaN
 * @param value Any value to parse as number
 * @param defaultValue Fallback value (default 0)
 * @returns Parsed number or default
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number') return isNaN(value) ? defaultValue : value;
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Format currency safely (handles undefined/NaN)
 * @param value Number to format
 * @returns Formatted IDR string
 */
export function formatCurrency(value: unknown): string {
  const num = safeNumber(value, 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Generate transaction/invoice number
 * @param branchCode Short branch code
 * @param date Date for the transaction
 * @param sequence Sequence number for the day
 * @returns Formatted invoice number like "BGL-20240207-001"
 */
export function generateInvoiceNumber(
  branchCode: string,
  date: Date = new Date(),
  sequence: number = 1
): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const seqStr = String(sequence).padStart(3, '0');
  return `${branchCode.toUpperCase()}-${dateStr}-${seqStr}`;
}
