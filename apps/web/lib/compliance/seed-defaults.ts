// Compliance Documents - Seed Defaults for UK, IE, and US

import { CountryCode, RequirementLevel, CollectionMethod } from './types'

export interface SeedRequirement {
  doc_type: string
  title: string
  requirement_level: RequirementLevel
  collection_method: CollectionMethod
  expires_in_months: number | null
  requires_expiry_date: boolean // Admin toggle for manual expiry date entry
  sort_order: number
}

// UK Recommended defaults
export const UK_RECOMMENDED: SeedRequirement[] = [
  {
    doc_type: 'right_to_work',
    title: 'Right to Work',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: true, // Visas/work permits have expiry dates
    sort_order: 10,
  },
  {
    doc_type: 'contract_terms',
    title: 'Contract of Employment',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 20,
  },
  {
    doc_type: 'pay_records',
    title: 'Pay Records (Payslips)',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 30,
  },
  {
    doc_type: 'working_time_holiday',
    title: 'Working Time & Holiday Records',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: 12,
    requires_expiry_date: false, // Auto-calculated expiry, not user-entered
    sort_order: 40,
  },
]

// IE Recommended defaults
export const IE_RECOMMENDED: SeedRequirement[] = [
  {
    doc_type: 'payroll_records',
    title: 'Payroll Records',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 10,
  },
  {
    doc_type: 'pps_payroll_id',
    title: 'PPS Number / Payroll ID',
    requirement_level: 'required',
    collection_method: 'reference',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 20,
  },
  {
    doc_type: 'permission_to_work',
    title: 'Permission to Work (if non-EU)',
    requirement_level: 'conditional',
    collection_method: 'upload',
    expires_in_months: 12,
    requires_expiry_date: true, // Work permits/visas have expiry dates
    sort_order: 30,
  },
  {
    doc_type: 'contract_terms',
    title: 'Contract of Employment',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 40,
  },
  {
    doc_type: 'working_time_holiday',
    title: 'Working Time & Holiday Records',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: 12,
    requires_expiry_date: false, // Auto-calculated expiry
    sort_order: 50,
  },
]

// US Recommended defaults
export const US_RECOMMENDED: SeedRequirement[] = [
  {
    doc_type: 'i9',
    title: 'Form I-9 (Employment Eligibility)',
    requirement_level: 'required',
    collection_method: 'both',
    expires_in_months: null,
    requires_expiry_date: true, // Work authorization documents have expiry dates
    sort_order: 10,
  },
  {
    doc_type: 'w4',
    title: 'Form W-4 (Tax Withholding)',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 20,
  },
  {
    doc_type: 'payroll_wage_hour',
    title: 'Payroll & Wage-Hour Records',
    requirement_level: 'required',
    collection_method: 'upload',
    expires_in_months: null,
    requires_expiry_date: false,
    sort_order: 30,
  },
]

// Get defaults by country
export function getRecommendedDefaults(country: CountryCode): SeedRequirement[] {
  switch (country) {
    case 'UK':
      return UK_RECOMMENDED
    case 'IE':
      return IE_RECOMMENDED
    case 'US':
      return US_RECOMMENDED
    default:
      return []
  }
}

// Helper to create full requirement object from seed data
export function createRequirementFromSeed(
  tenantId: string,
  country: CountryCode,
  seed: SeedRequirement
) {
  return {
    tenant_id: tenantId,
    country_code: country,
    ...seed,
    applies_to_all: true,
    role_ids: null,
    location_ids: null,
    is_enabled: true,
  }
}

