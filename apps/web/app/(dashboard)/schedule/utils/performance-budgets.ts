/**
 * Performance budget checks (dev-only)
 * 
 * Logs warnings when performance budgets are exceeded
 */

const DEV_MODE = process.env.NODE_ENV === 'development'

// Performance budgets
const BUDGETS = {
  RENDER_TIME_MS: 16, // 60fps = 16ms per frame
  RERENDER_COUNT: 10, // Max rerenders per interaction
  NETWORK_TIME_MS: 500, // Max network call time
}

export function checkRenderBudget(componentName: string, renderTime: number) {
  if (!DEV_MODE) return

  if (renderTime > BUDGETS.RENDER_TIME_MS) {
    console.warn(
      `[Performance] ${componentName} render took ${renderTime.toFixed(2)}ms (budget: ${BUDGETS.RENDER_TIME_MS}ms)`
    )
  }
}

export function checkRerenderCount(componentName: string, count: number) {
  if (!DEV_MODE) return

  if (count > BUDGETS.RERENDER_COUNT) {
    console.warn(
      `[Performance] ${componentName} rerendered ${count} times (budget: ${BUDGETS.RERENDER_COUNT})`
    )
  }
}

export function checkNetworkBudget(endpoint: string, duration: number) {
  if (!DEV_MODE) return

  if (duration > BUDGETS.NETWORK_TIME_MS) {
    console.warn(
      `[Performance] ${endpoint} took ${duration.toFixed(2)}ms (budget: ${BUDGETS.NETWORK_TIME_MS}ms)`
    )
  }
}

