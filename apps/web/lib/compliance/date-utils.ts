// Date utilities for compliance document expiry dates
// Handles conversion between dd/mm/yyyy (UI) and ISO YYYY-MM-DD (database)

/**
 * Validates a date string in dd/mm/yyyy format
 * @param dateString - Date in dd/mm/yyyy format
 * @returns true if valid, false otherwise
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') return false

  // Check format with regex: dd/mm/yyyy
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateString.match(regex)

  if (!match) return false

  const day = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const year = parseInt(match[3], 10)

  // Check valid ranges
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (year < 1900 || year > 2100) return false

  // Check if date exists (e.g., not 31/02/2024)
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false
  }

  return true
}

/**
 * Converts dd/mm/yyyy to ISO date string (YYYY-MM-DD)
 * @param ddmmyyyy - Date in dd/mm/yyyy format
 * @returns ISO date string or null if invalid
 */
export function convertDDMMYYYYtoISO(ddmmyyyy: string): string | null {
  if (!isValidDateFormat(ddmmyyyy)) return null

  const [day, month, year] = ddmmyyyy.split('/')
  // Pad day and month with leading zeros if needed
  const paddedDay = day.padStart(2, '0')
  const paddedMonth = month.padStart(2, '0')

  return `${year}-${paddedMonth}-${paddedDay}`
}

/**
 * Converts ISO date string (YYYY-MM-DD) to dd/mm/yyyy
 * @param isoDate - ISO date string
 * @returns Date in dd/mm/yyyy format or null if invalid
 */
export function convertISOtoDDMMYYYY(isoDate: string | null): string | null {
  if (!isoDate) return null

  try {
    // Parse ISO date (YYYY-MM-DD)
    const regex = /^(\d{4})-(\d{2})-(\d{2})$/
    const match = isoDate.match(regex)

    if (!match) return null

    const year = match[1]
    const month = match[2]
    const day = match[3]

    // Validate it's a real date
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    if (
      date.getFullYear() !== parseInt(year) ||
      date.getMonth() !== parseInt(month) - 1 ||
      date.getDate() !== parseInt(day)
    ) {
      return null
    }

    // Remove leading zeros from day and month for display
    const displayDay = parseInt(day, 10).toString()
    const displayMonth = parseInt(month, 10).toString()

    return `${displayDay.padStart(2, '0')}/${displayMonth.padStart(2, '0')}/${year}`
  } catch {
    return null
  }
}

/**
 * Auto-formats user input to dd/mm/yyyy as they type
 * Best-effort feature - may not work on all browsers
 * @param input - User input string
 * @returns Formatted string
 */
export function autoFormatDateInput(input: string): string {
  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, '')

  // Don't format if too short
  if (digitsOnly.length <= 2) return digitsOnly

  // Add first slash after day (DD/)
  if (digitsOnly.length <= 4) {
    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`
  }

  // Add second slash after month (DD/MM/)
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`
}

/**
 * Normalizes date input - accepts slashes or hyphens
 * @param input - User input (can be with - or /)
 * @returns Normalized date with slashes
 */
export function normalizeDateInput(input: string): string {
  return input.replace(/-/g, '/')
}

/**
 * Gets today's date in dd/mm/yyyy format
 * @returns Today's date
 */
export function getTodayDDMMYYYY(): string {
  const today = new Date()
  const day = today.getDate().toString().padStart(2, '0')
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const year = today.getFullYear().toString()
  return `${day}/${month}/${year}`
}

/**
 * Gets today's date in ISO format (YYYY-MM-DD)
 * @returns Today's date in ISO format
 */
export function getTodayISO(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = (today.getMonth() + 1).toString().padStart(2, '0')
  const day = today.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Checks if a date is in the past
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns true if date is before today
 */
export function isDateInPast(isoDate: string): boolean {
  try {
    const date = new Date(isoDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date < today
  } catch {
    return false
  }
}

/**
 * Checks if a date is in the future
 * @param isoDate - ISO date string (YYYY-MM-DD)
 * @returns true if date is after today
 */
export function isDateInFuture(isoDate: string): boolean {
  try {
    const date = new Date(isoDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    date.setHours(0, 0, 0, 0)
    return date > today
  } catch {
    return false
  }
}

