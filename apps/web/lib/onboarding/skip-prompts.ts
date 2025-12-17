/**
 * Utility functions to check skipped steps and show future prompts
 */

export interface TenantSettings {
  skippedOnboardingSteps?: number[]
  [key: string]: any
}

/**
 * Check if a step was skipped during onboarding
 */
export function wasStepSkipped(stepNumber: number, settings: TenantSettings | null | undefined): boolean {
  if (!settings?.skippedOnboardingSteps) {
    return false
  }
  return settings.skippedOnboardingSteps.includes(stepNumber)
}

/**
 * Get prompt message for a skipped step
 */
export function getSkipPromptMessage(stepNumber: number): string {
  const prompts: Record<number, string> = {
    3: 'Add a location to schedule shifts',
    6: 'Configure compliance tracking',
    4: 'Tell us about your team size',
  }
  return prompts[stepNumber] || 'Complete this step to unlock more features'
}

/**
 * Check if user should see a prompt for a skipped step
 */
export function shouldShowSkipPrompt(
  stepNumber: number,
  settings: TenantSettings | null | undefined,
  context: string
): boolean {
  if (!wasStepSkipped(stepNumber, settings)) {
    return false
  }

  // Context-specific checks
  if (stepNumber === 3 && context === 'scheduling') {
    return true
  }
  if (stepNumber === 6 && context === 'documents') {
    return true
  }
  if (stepNumber === 4 && context === 'staff') {
    return true
  }

  return false
}



