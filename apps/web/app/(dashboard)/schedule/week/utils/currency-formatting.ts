/**
 * Format amount as currency
 * @param amount - Amount to format (can be null)
 * @param currency - Currency code (default: USD)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string or "N/A" if amount is null/invalid
 */
export function formatCurrency(
  amount: number | null,
  currency: string = 'USD',
  decimals: number = 2
): string {
  if (amount === null || isNaN(amount)) {
    return 'N/A'
  }
  
  // Handle zero values: show $0.00 (not "-")
  if (amount === 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(0)
  }
  
  // Negative costs not expected in V1, but handle gracefully
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

