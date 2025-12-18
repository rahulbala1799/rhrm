/**
 * WCAG 2.0 Color Contrast Calculation
 * Based on: https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */

/**
 * Convert hex color to RGB values (0-255)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '')
  
  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  
  return { r, g, b }
}

/**
 * Calculate relative luminance for a single RGB component
 * Formula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * Where R, G, B are normalized to 0-1 range
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1
  const normalize = (val: number) => {
    val = val / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }
  
  const rNorm = normalize(r)
  const gNorm = normalize(g)
  const bNorm = normalize(b)
  
  return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm
}

/**
 * Calculate WCAG 2.0 contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05)
 * Where L1 is the lighter color and L2 is the darker color
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1)
  const rgb2 = hexToRgb(color2)
  
  const lum1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)
  
  // Lighter color goes in numerator
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 minimum)
 */
export function meetsWCAGAA(color1: string, color2: string): boolean {
  const ratio = calculateContrastRatio(color1, color2)
  return ratio >= 4.5
}

/**
 * Suggest text color for a given background color
 * Returns a color that meets WCAG AA contrast ratio
 */
export function suggestTextColor(bgColor: string): string {
  const rgb = hexToRgb(bgColor)
  const lum = getRelativeLuminance(rgb.r, rgb.g, rgb.b)
  
  // If background is light (luminance > 0.5), suggest dark text
  // If background is dark (luminance <= 0.5), suggest light text
  if (lum > 0.5) {
    // Light background - suggest dark colors (in order of preference)
    const darkColors = ['#1F2937', '#111827', '#000000']
    for (const color of darkColors) {
      if (meetsWCAGAA(bgColor, color)) {
        return color
      }
    }
    return '#000000' // Fallback to black
  } else {
    // Dark background - suggest light colors (in order of preference)
    const lightColors = ['#FFFFFF', '#F9FAFB', '#E5E7EB']
    for (const color of lightColors) {
      if (meetsWCAGAA(bgColor, color)) {
        return color
      }
    }
    return '#FFFFFF' // Fallback to white
  }
}

