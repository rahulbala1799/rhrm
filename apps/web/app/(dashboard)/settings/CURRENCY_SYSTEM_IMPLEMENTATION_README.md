# Currency System Implementation - Detailed Plan

## Overview

This document outlines the comprehensive plan to implement a dynamic currency system where administrators can configure the currency (USD, EUR, or GBP) in settings, and all currency displays throughout the application will use the selected currency symbol and formatting. **No hardcoded currency values should exist in the system.**

### Where is Currency Setting Located?

**Location**: `/settings/company` (Company Settings page)

The currency setting will be added to the **Company Settings** page alongside other company-wide preferences:
- Company Name
- Account Identifier  
- Business Type
- Country
- **Currency** ← New field to be added here

**Navigation Path**: 
```
Dashboard → Settings (sidebar) → Company → Currency dropdown field
```

**Why Company Settings?**
- Currency is a company-wide organizational setting
- Logical grouping with country and business type
- Reduces navigation complexity
- Keeps all company preferences in one place

**Alternative**: A separate `/settings/currency` page can be created if preferred, but adding it to Company Settings is the recommended approach.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Design](#architecture-design)
3. [Database Schema Changes](#database-schema-changes)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Migration Strategy](#migration-strategy)
7. [Testing Plan](#testing-plan)
8. [Rollout Checklist](#rollout-checklist)

---

## Current State Analysis

### Hardcoded Currency Locations Found

#### 1. **Schedule/Week Planner - Budget View**
- **File**: `apps/web/app/(dashboard)/schedule/week/utils/currency-formatting.ts`
  - **Issue**: Default currency hardcoded to `'USD'` (line 10)
  - **Usage**: Used in `formatCurrency()` function
  - **Components Affected**:
    - `ColumnTotalsRow.tsx` - Day totals and grand total
    - `RowTotalCell.tsx` - Row total costs
    - `ShiftCost.tsx` - Individual shift costs

#### 2. **Staff Detail Page - Pay Tab**
- **File**: `apps/web/app/(dashboard)/staff/[id]/components/PayTab.tsx`
  - **Issue**: Currency hardcoded to `'GBP'` with locale `'en-GB'` (lines 42-44)
  - **Usage**: Local `formatCurrency()` function for displaying:
    - Hourly rate
    - Salary amount
    - Overtime flat extra amount

#### 3. **Staff Wages Page**
- **File**: `apps/web/app/(dashboard)/staff/[id]/wages/page.tsx`
  - **Issue**: Hardcoded `£` symbol in multiple places:
    - Line 164: Label "Hourly Rate (£)"
    - Line 167: Input prefix `£`
    - Line 222: Display `£{wages.hourly_rate.toFixed(2)}`
    - Lines 247, 251, 255: Estimated earnings calculations with `£` prefix
  - **Issue**: Hardcoded UK-specific minimum wage reference (line 180)

#### 4. **Staff Profile Page (Staff View)**
- **File**: `apps/web/app/(dashboard)/me/staff-profile/page.tsx`
  - **Issue**: Local `formatCurrency()` function with hardcoded `'GBP'` and `'en-GB'` (line 134)

#### 5. **Pay Tab Input Labels**
- **File**: `apps/web/app/(dashboard)/staff/[id]/components/PayTab.tsx`
  - **Issue**: Hardcoded `£` in labels:
    - Line 108: "Hourly Rate (£)"
    - Line 143: "Salary Amount (£)"
    - Line 238: "Flat Extra Amount (£/hour)"

### Currency Formatting Issues

1. **Inconsistent Locale Usage**:
   - Schedule uses `'en-US'` locale (USD formatting)
   - Staff pages use `'en-GB'` locale (GBP formatting)
   - This causes inconsistent number formatting (e.g., comma vs period for thousands)

2. **No Centralized Currency Management**:
   - Multiple `formatCurrency()` implementations
   - No single source of truth for currency settings
   - Currency must be passed manually to formatting functions

---

## Architecture Design

### Design Principles

1. **Single Source of Truth**: Currency setting stored in `tenants.settings` JSONB column
2. **Centralized Formatting**: Single `formatCurrency()` utility that reads tenant currency
3. **Server-Side Default**: Currency retrieved server-side to avoid client-side delays
4. **Backward Compatible**: Default to USD if currency not set (for existing tenants)
5. **Type Safety**: TypeScript types for supported currencies

### Supported Currencies

- **USD** (United States Dollar) - Symbol: $, Locale: en-US
- **EUR** (Euro) - Symbol: €, Locale: en-EU (or de-DE for consistency)
- **GBP** (British Pound) - Symbol: £, Locale: en-GB

### Data Flow

```
Admin Sets Currency in Settings
    ↓
Stored in tenants.settings.currency
    ↓
Backend API retrieves currency with tenant context
    ↓
Frontend components fetch currency via hook/context
    ↓
formatCurrency() uses tenant currency
    ↓
All currency displays show correct symbol
```

### Settings Location

**Recommended Approach: Add to Company Settings Page**

The currency setting will be added to the **Company Settings** page (`/settings/company`), which already contains company-wide configuration:
- Company Name
- Account Identifier
- Business Type
- Country
- **Currency** (NEW - to be added)

**Rationale:**
- Currency is a company-wide setting, similar to country and business type
- Keeps all company-level preferences in one place
- Reduces navigation complexity
- Logical grouping with other organizational settings

**Alternative Approach: Separate Currency Settings Page**

If preferred, a separate page at `/settings/currency` can be created. This would:
- Provide dedicated focus on currency configuration
- Allow for future expansion (e.g., currency formatting options, exchange rates)
- Be listed in the Settings sidebar menu

**Settings Navigation Structure:**

Current Settings menu items (in `apps/web/components/dashboard/Sidebar.tsx`):
```
Settings Section:
├── Company (/settings/company) ← Currency will be added here
├── Locations (/settings/locations)
├── Job Roles (/settings/job-roles)
├── Roles (/settings/roles)
├── Compliance Docs (/settings/compliance-documents)
├── Review Submissions (/settings/compliance-documents/review)
├── Permissions (/settings/permissions)
├── Invitations (/settings/invitations)
├── Audit Log (/settings/audit)
└── Billing (/settings/billing)
```

**Implementation Decision:**

This README assumes currency will be added to the **Company Settings page** as the primary approach. If a separate page is preferred, the implementation steps remain the same, but the UI component will be in a separate route.

---

## Database Schema Changes

### 1. Update `tenants` Table

**Current State**: `tenants.settings` is a JSONB column that may contain:
```json
{
  "businessType": "Retail",
  "country": "GB"
}
```

**Required Change**: Add `currency` field to settings JSONB. No migration needed (JSONB is flexible), but we should:

1. **Add default currency for existing tenants**: Set `currency: 'USD'` for tenants without currency set
2. **Add constraint validation**: Ensure currency is one of: `USD`, `EUR`, `GBP`

**Migration SQL** (Optional - can be done in application code):
```sql
-- Set default currency for existing tenants without currency
UPDATE tenants
SET settings = COALESCE(settings, '{}'::jsonb) || '{"currency": "USD"}'::jsonb
WHERE settings->>'currency' IS NULL;
```

### 2. Database Validation

**Option A**: Application-level validation (Recommended for JSONB)
- Validate in API route before saving
- Check currency is in allowed list: `['USD', 'EUR', 'GBP']`

**Option B**: Database constraint (If we want strict enforcement)
```sql
ALTER TABLE tenants
ADD CONSTRAINT check_currency_valid
CHECK (
  settings->>'currency' IS NULL OR
  settings->>'currency' IN ('USD', 'EUR', 'GBP')
);
```

**Recommendation**: Use Option A (application-level) for flexibility and easier updates.

---

## Backend Implementation

### 1. Create Currency Utility Functions

**File**: `apps/web/lib/currency/utils.ts`

```typescript
export type SupportedCurrency = 'USD' | 'EUR' | 'GBP'

export interface CurrencyConfig {
  code: SupportedCurrency
  symbol: string
  locale: string
  name: string
}

export const CURRENCY_CONFIGS: Record<SupportedCurrency, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    name: 'US Dollar'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    locale: 'en-EU', // or 'de-DE' for consistent formatting
    name: 'Euro'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    name: 'British Pound'
  }
}

/**
 * Get tenant currency from database
 * Returns USD as default if not set
 */
export async function getTenantCurrency(): Promise<SupportedCurrency> {
  const { tenantId } = await getTenantContext()
  if (!tenantId) return 'USD'
  
  const supabase = await createClient()
  const { data } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  const currency = data?.settings?.currency as SupportedCurrency | undefined
  return currency && ['USD', 'EUR', 'GBP'].includes(currency) 
    ? currency 
    : 'USD'
}

/**
 * Get currency configuration for a currency code
 */
export function getCurrencyConfig(currency: SupportedCurrency): CurrencyConfig {
  return CURRENCY_CONFIGS[currency]
}
```

### 2. Update Company Settings API

**File**: `apps/web/app/api/settings/company/route.ts`

**Changes Needed**:
- Add currency validation in PUT handler
- Ensure currency is saved to `settings.currency`
- Return currency in GET response

**Updated PUT Handler**:
```typescript
export async function PUT(request: Request) {
  // ... existing auth checks ...
  
  const body = await request.json()
  const { name, slug, settings } = body
  
  // Validate currency if provided
  if (settings?.currency) {
    const validCurrencies = ['USD', 'EUR', 'GBP']
    if (!validCurrencies.includes(settings.currency)) {
      return NextResponse.json(
        { error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` },
        { status: 400 }
      )
    }
  }
  
  // ... rest of existing code ...
}
```

### 3. Create Currency Settings API Endpoint

**New File**: `apps/web/app/api/settings/currency/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { NextResponse } from 'next/server'
import { getTenantCurrency, SupportedCurrency } from '@/lib/currency/utils'

/**
 * GET /api/settings/currency
 * Get tenant currency setting
 */
export async function GET() {
  const { tenantId } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const currency = await getTenantCurrency()
    return NextResponse.json({ currency })
  } catch (error: any) {
    console.error('Error fetching currency:', error)
    return NextResponse.json(
      { error: 'Failed to fetch currency' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/currency
 * Update tenant currency setting
 */
export async function PUT(request: Request) {
  const { tenantId, role } = await getTenantContext()
  
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admin and superadmin can update currency
  if (role !== 'admin' && role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  const body = await request.json()
  const { currency } = body
  
  // Validate currency
  const validCurrencies: SupportedCurrency[] = ['USD', 'EUR', 'GBP']
  if (!validCurrencies.includes(currency)) {
    return NextResponse.json(
      { error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` },
      { status: 400 }
    )
  }
  
  const supabase = await createClient()
  
  // Get current settings
  const { data: current } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  // Merge currency into settings
  const updatedSettings = {
    ...(current?.settings || {}),
    currency
  }
  
  // Update tenant
  const { data: tenant, error } = await supabase
    .from('tenants')
    .update({ settings: updatedSettings })
    .eq('id', tenantId)
    .select('id, settings')
    .single()
  
  if (error) {
    console.error('Error updating currency:', error)
    return NextResponse.json(
      { error: 'Failed to update currency' },
      { status: 500 }
    )
  }
  
  return NextResponse.json({ currency, tenant })
}
```

### 4. Update Tenant Settings Utility

**File**: `apps/web/lib/schedule/utils.ts`

**Add currency to TenantSettings interface**:
```typescript
export interface TenantSettings {
  timezone: string
  staff_can_accept_decline_shifts: boolean
  currency?: 'USD' | 'EUR' | 'GBP'  // Add this
}
```

**Update getTenantSettings()**:
```typescript
export async function getTenantSettings(): Promise<TenantSettings | null> {
  // ... existing code ...
  
  // Also fetch currency from tenants table
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single()
  
  const currency = tenant?.settings?.currency || 'USD'
  
  return {
    timezone: data.timezone || 'UTC',
    staff_can_accept_decline_shifts: data.staff_can_accept_decline_shifts || false,
    currency: currency as 'USD' | 'EUR' | 'GBP'
  }
}
```

---

## Frontend Implementation

### 1. Create Currency Context/Hook

**New File**: `apps/web/app/(dashboard)/hooks/useCurrency.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { SupportedCurrency } from '@/lib/currency/utils'

export function useCurrency() {
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/settings/currency')
        
        if (!response.ok) {
          // Default to USD on error
          setCurrency('USD')
          return
        }
        
        const data = await response.json()
        setCurrency(data.currency || 'USD')
      } catch (err: any) {
        console.error('Error fetching currency:', err)
        setError(err.message)
        setCurrency('USD') // Default fallback
      } finally {
        setLoading(false)
      }
    }
    
    fetchCurrency()
  }, [])
  
  return { currency, loading, error }
}
```

### 2. Update Centralized Currency Formatting

**File**: `apps/web/app/(dashboard)/schedule/week/utils/currency-formatting.ts`

**Complete Rewrite**:
```typescript
import { SupportedCurrency, CURRENCY_CONFIGS } from '@/lib/currency/utils'

/**
 * Format amount as currency using tenant's currency setting
 * This function should be called from client components that have access to currency context
 * 
 * @param amount - Amount to format (can be null)
 * @param currency - Currency code (default: USD)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string or "N/A" if amount is null/invalid
 */
export function formatCurrency(
  amount: number | null,
  currency: SupportedCurrency = 'USD',
  decimals: number = 2
): string {
  if (amount === null || isNaN(amount)) {
    return 'N/A'
  }
  
  const config = CURRENCY_CONFIGS[currency]
  
  // Handle zero values: show currency symbol with 0.00
  if (amount === 0) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(0)
  }
  
  // Format with proper locale and currency
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

/**
 * Get currency symbol for a given currency code
 */
export function getCurrencySymbol(currency: SupportedCurrency = 'USD'): string {
  return CURRENCY_CONFIGS[currency].symbol
}
```

### 3. Create Shared Currency Formatting Hook

**New File**: `apps/web/app/(dashboard)/hooks/useFormatCurrency.ts`

```typescript
'use client'

import { useCurrency } from './useCurrency'
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../schedule/week/utils/currency-formatting'
import { SupportedCurrency } from '@/lib/currency/utils'

export function useFormatCurrency() {
  const { currency } = useCurrency()
  
  const format = (amount: number | null, decimals: number = 2) => {
    return formatCurrencyUtil(amount, currency, decimals)
  }
  
  const symbol = getCurrencySymbol(currency)
  
  return {
    format,
    symbol,
    currency
  }
}
```

### 4. Update Schedule Week Components

#### Update `ColumnTotalsRow.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'
// Remove: import { formatCurrency } from '../utils/currency-formatting'

export default function ColumnTotalsRow({ ... }) {
  const { format } = useFormatCurrency()
  
  // Replace all formatCurrency() calls with format()
  // Example: formatCurrency(dayTotals[index] || 0) → format(dayTotals[index] || 0)
}
```

#### Update `RowTotalCell.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

export default function RowTotalCell({ ... }) {
  const { format } = useFormatCurrency()
  
  // Replace formatCurrency(totalCost) with format(totalCost)
}
```

#### Update `ShiftCost.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

export default function ShiftCost({ ... }) {
  const { format } = useFormatCurrency()
  
  // Replace formatCurrency(cost) with format(cost)
}
```

### 5. Update Staff Detail Components

#### Update `PayTab.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

export default function PayTab({ ... }) {
  const { format, symbol } = useFormatCurrency()
  
  // Remove local formatCurrency function (lines 40-46)
  
  // Replace all formatCurrency() calls with format()
  // Replace hardcoded £ in labels with {symbol}
  // Example: "Hourly Rate (£)" → `Hourly Rate (${symbol})`
  // Example: formatCurrency(staff.hourly_rate) → format(staff.hourly_rate)
}
```

#### Update `wages/page.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

export default function StaffWagesPage() {
  const { format, symbol } = useFormatCurrency()
  
  // Replace all hardcoded £ with {symbol}
  // Replace manual .toFixed(2) formatting with format()
  // Example: `£{wages.hourly_rate.toFixed(2)}` → format(wages.hourly_rate)
  // Example: "Hourly Rate (£)" → `Hourly Rate (${symbol})`
  
  // Remove or update UK-specific minimum wage reference (line 180)
  // Could make this dynamic based on currency/country, or remove it
}
```

#### Update `me/staff-profile/page.tsx`:
```typescript
'use client'

import { useFormatCurrency } from '@/app/(dashboard)/hooks/useFormatCurrency'

export default function StaffProfilePage() {
  const { format } = useFormatCurrency()
  
  // Remove local formatCurrency function (line 134)
  // Replace all formatCurrency() calls with format()
}
```

### 6. Create Currency Settings UI

**Option A: Add to Company Settings (Recommended)**

**File**: `apps/web/app/(dashboard)/settings/company/page.tsx`

Add currency field to the existing Company Settings form:

```typescript
// Add currency to formData state
const [formData, setFormData] = useState({
  name: '',
  slug: '',
  businessType: '',
  country: '',
  currency: 'USD', // Add this
})

// Add currency to fetchTenant
setFormData({
  name: tenant.name || '',
  slug: tenant.slug || '',
  businessType: tenant.settings?.businessType || '',
  country: tenant.settings?.country || '',
  currency: tenant.settings?.currency || 'USD', // Add this
})

// Add currency field in the form JSX (after Country field)
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Currency <span className="text-red-500">*</span>
  </label>
  <select
    value={formData.currency}
    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    required
  >
    <option value="USD">USD - US Dollar ($)</option>
    <option value="EUR">EUR - Euro (€)</option>
    <option value="GBP">GBP - British Pound (£)</option>
  </select>
  <p className="text-xs text-gray-500 mt-1">
    This currency will be used for all financial displays including wages, budgets, and shift costs.
  </p>
  
  {/* Currency Preview */}
  <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
    <h4 className="text-xs font-semibold text-blue-900 mb-1">Preview</h4>
    <p className="text-xs text-blue-800">
      Example: {new Intl.NumberFormat(
        formData.currency === 'USD' ? 'en-US' : formData.currency === 'EUR' ? 'en-EU' : 'en-GB',
        { style: 'currency', currency: formData.currency }
      ).format(1234.56)}
    </p>
  </div>
</div>

// Update handleSubmit to include currency in settings
body: JSON.stringify({
  name: formData.name,
  slug: formData.slug,
  settings: {
    businessType: formData.businessType,
    country: formData.country,
    currency: formData.currency, // Add this
  },
}),
```

**Option B: Separate Currency Settings Page**

**New File**: `apps/web/app/(dashboard)/settings/currency/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { SupportedCurrency } from '@/lib/currency/utils'

export default function CurrencySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currency, setCurrency] = useState<SupportedCurrency>('USD')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  useEffect(() => {
    fetchCurrency()
  }, [])
  
  const fetchCurrency = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/currency')
      if (response.ok) {
        const data = await response.json()
        setCurrency(data.currency || 'USD')
      }
    } catch (error) {
      console.error('Error fetching currency:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    
    try {
      const response = await fetch('/api/settings/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save')
      }
      
      setSuccess('Currency setting saved successfully!')
      router.refresh()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error: any) {
      console.error('Error saving currency:', error)
      setError(error.message || 'Failed to save currency setting')
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div>
        <PageHeader
          title="Currency Settings"
          description="Configure the currency for your organization"
        />
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div>
      <PageHeader
        title="Currency Settings"
        description="Configure the currency used throughout the application for wages, budgets, and financial displays"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Currency' },
        ]}
      />
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="USD">USD - US Dollar ($)</option>
              <option value="EUR">EUR - Euro (€)</option>
              <option value="GBP">GBP - British Pound (£)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This currency will be used for all financial displays including wages, budgets, and shift costs.
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Preview</h4>
            <p className="text-sm text-blue-800">
              Example: {new Intl.NumberFormat(
                currency === 'USD' ? 'en-US' : currency === 'EUR' ? 'en-EU' : 'en-GB',
                { style: 'currency', currency }
              ).format(1234.56)}
            </p>
          </div>
          
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Currency Setting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

### 7. Update Settings Navigation (If Using Separate Page)

**Note**: If currency is added to Company Settings (Option A), no navigation changes are needed. If using a separate page (Option B), update the sidebar:

**File**: `apps/web/components/dashboard/Sidebar.tsx`

Add currency settings link to settings menu:
```typescript
// In navSections array, Settings section items array
{
  title: 'Settings',
  items: [
    { label: 'Company', href: '/settings/company', icon: <BuildingIcon /> },
    { label: 'Currency', href: '/settings/currency', icon: <CurrencyIcon /> }, // Add this
    // ... rest of settings items
  ],
}
```

**Create CurrencyIcon component** (if using separate page):
```typescript
function CurrencyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
```

---

## Migration Strategy

### Phase 1: Database Preparation
1. ✅ Create currency utility functions
2. ✅ Add currency field to tenant settings (via API, no migration needed)
3. ✅ Set default currency (USD) for existing tenants

### Phase 2: Backend Implementation
1. ✅ Create currency API endpoints
2. ✅ Update company settings API to handle currency
3. ✅ Update tenant settings utility to include currency
4. ✅ Test backend APIs

### Phase 3: Frontend Core
1. ✅ Create currency hooks
2. ✅ Update centralized currency formatting
3. ✅ Create currency settings UI
4. ✅ Test currency settings page

### Phase 4: Component Updates
1. ✅ Update schedule/week components
2. ✅ Update staff detail components
3. ✅ Update staff wages page
4. ✅ Update staff profile page
5. ✅ Search for any other hardcoded currency references

### Phase 5: Testing & Validation
1. ✅ Test currency switching
2. ✅ Verify all displays update correctly
3. ✅ Test with different currencies
4. ✅ Verify no hardcoded currency remains

### Phase 6: Documentation & Cleanup
1. ✅ Update any relevant documentation
2. ✅ Remove unused currency formatting functions
3. ✅ Code review

---

## Testing Plan

### Unit Tests

1. **Currency Utility Tests**:
   - Test `getTenantCurrency()` returns correct currency
   - Test default to USD when currency not set
   - Test validation of currency codes
   - Test `formatCurrency()` with each currency type

2. **API Tests**:
   - Test GET `/api/settings/currency` returns correct currency
   - Test PUT `/api/settings/currency` updates currency
   - Test PUT validation rejects invalid currency
   - Test PUT requires admin/superadmin role

### Integration Tests

1. **Currency Settings Page**:
   - Test currency dropdown shows current selection
   - Test saving currency updates database
   - Test preview shows correct format
   - Test success/error messages

2. **Schedule Week Planner**:
   - Test budget view shows correct currency symbol
   - Test shift costs use correct currency
   - Test totals use correct currency
   - Test currency updates when changed in settings

3. **Staff Pages**:
   - Test hourly rate displays with correct currency
   - Test salary displays with correct currency
   - Test wages page shows correct currency
   - Test pay tab shows correct currency

### Manual Testing Checklist

- [ ] Admin can access currency settings (Company Settings page or separate Currency page)
- [ ] Admin can select USD, EUR, or GBP from dropdown
- [ ] Currency preview shows correct format with example amount
- [ ] Saving currency shows success message
- [ ] Currency persists after page refresh
- [ ] Schedule week planner budget view shows correct currency
- [ ] Shift costs show correct currency symbol
- [ ] Day totals show correct currency
- [ ] Row totals show correct currency
- [ ] Grand total shows correct currency
- [ ] Staff detail pay tab shows correct currency
- [ ] Staff wages page shows correct currency
- [ ] Staff profile page shows correct currency
- [ ] All input labels show correct currency symbol
- [ ] Currency persists after page refresh
- [ ] Currency updates immediately after change (no refresh needed)
- [ ] Non-admin users cannot access currency settings
- [ ] Default currency (USD) works for existing tenants

### Edge Cases

1. **Tenant without currency set**: Should default to USD
2. **Invalid currency in database**: Should default to USD
3. **Currency change while viewing page**: Should update displays
4. **Multiple tabs open**: All should reflect currency change
5. **Network error fetching currency**: Should default to USD gracefully

---

## Rollout Checklist

### Pre-Implementation
- [ ] Review and approve this plan
- [ ] Create feature branch: `feature/currency-system`
- [ ] Set up test environment

### Implementation
- [ ] Create currency utility functions
- [ ] Create currency API endpoints
- [ ] Create currency hooks
- [ ] Update centralized formatting
- [ ] Create currency settings UI
- [ ] Update schedule components
- [ ] Update staff components
- [ ] Search for any remaining hardcoded currency
- [ ] Remove all hardcoded currency references

### Testing
- [ ] Run unit tests
- [ ] Run integration tests
- [ ] Manual testing checklist
- [ ] Test with all three currencies
- [ ] Test with existing tenants (no currency set)
- [ ] Test with new tenants

### Deployment
- [ ] Code review
- [ ] Merge to main branch
- [ ] Deploy to staging
- [ ] Verify staging deployment
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Set default currency for existing tenants (if needed)

### Post-Deployment
- [ ] Verify production deployment
- [ ] Monitor error logs
- [ ] Gather user feedback
- [ ] Document any issues
- [ ] Update user documentation if needed

---

## Additional Considerations

### Future Enhancements

1. **More Currencies**: Easy to add more currencies by updating `CURRENCY_CONFIGS`
2. **Currency Conversion**: Could add exchange rate API for multi-currency support
3. **Per-Location Currency**: Could support different currencies per location
4. **Historical Currency**: Track currency changes over time
5. **Currency Formatting Options**: Custom decimal places, thousand separators

### Performance Considerations

1. **Currency Fetching**: Currency is fetched once per page load via hook
2. **Caching**: Consider caching currency in context to avoid repeated API calls
3. **Server Components**: For server components, fetch currency server-side

### Security Considerations

1. **Authorization**: Only admin/superadmin can change currency
2. **Validation**: Validate currency codes on both client and server
3. **SQL Injection**: Use parameterized queries (Supabase handles this)

### Accessibility

1. **Currency Symbols**: Ensure screen readers announce currency correctly
2. **Formatting**: Use proper ARIA labels for currency amounts
3. **Input Fields**: Include currency symbol in input labels for clarity

---

## Files to Create/Modify Summary

### New Files
1. `apps/web/lib/currency/utils.ts` - Currency utility functions
2. `apps/web/app/api/settings/currency/route.ts` - Currency API endpoint (optional if using Company Settings)
3. `apps/web/app/(dashboard)/hooks/useCurrency.ts` - Currency hook
4. `apps/web/app/(dashboard)/hooks/useFormatCurrency.ts` - Formatting hook
5. `apps/web/app/(dashboard)/settings/currency/page.tsx` - Currency settings UI (only if using separate page)

### Modified Files
1. `apps/web/app/(dashboard)/schedule/week/utils/currency-formatting.ts` - Update to use tenant currency
2. `apps/web/app/(dashboard)/schedule/week/components/ColumnTotalsRow.tsx` - Use currency hook
3. `apps/web/app/(dashboard)/schedule/week/components/RowTotalCell.tsx` - Use currency hook
4. `apps/web/app/(dashboard)/schedule/week/components/ShiftCost.tsx` - Use currency hook
5. `apps/web/app/(dashboard)/staff/[id]/components/PayTab.tsx` - Use currency hook, remove hardcoded £
6. `apps/web/app/(dashboard)/staff/[id]/wages/page.tsx` - Use currency hook, remove hardcoded £
7. `apps/web/app/(dashboard)/me/staff-profile/page.tsx` - Use currency hook
8. `apps/web/app/api/settings/company/route.ts` - Add currency validation and handling
9. `apps/web/app/(dashboard)/settings/company/page.tsx` - Add currency field to form (if using Option A)
10. `apps/web/lib/schedule/utils.ts` - Add currency to TenantSettings
11. `apps/web/components/dashboard/Sidebar.tsx` - Add currency settings link (only if using Option B - separate page)

---

## Conclusion

This implementation plan provides a comprehensive approach to removing all hardcoded currency values and implementing a dynamic currency system. The architecture is designed to be:

- **Scalable**: Easy to add more currencies
- **Maintainable**: Single source of truth for currency
- **User-Friendly**: Simple admin interface
- **Robust**: Proper validation and error handling
- **Backward Compatible**: Defaults to USD for existing tenants

Following this plan will ensure a clean, maintainable currency system that meets all requirements.

