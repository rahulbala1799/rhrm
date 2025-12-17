// Compliance Documents System - TypeScript Types and Interfaces

export type CountryCode = 'UK' | 'IE' | 'US'
export type RequirementLevel = 'required' | 'conditional' | 'optional'
export type CollectionMethod = 'upload' | 'reference' | 'both'

// Database status (stored in database)
// No 'expired' - expired is computed, not stored
// No 'not_uploaded' - absence of row = not uploaded
export type DocumentStatus = 'submitted' | 'approved' | 'rejected'

// UI computed status (includes computed statuses)
export type DocumentStatusUI = DocumentStatus | 'expired' | 'not_uploaded'

export interface TenantComplianceRequirement {
  id: string
  tenant_id: string
  country_code: CountryCode
  doc_type: string
  title: string
  requirement_level: RequirementLevel
  collection_method: CollectionMethod
  expires_in_months: number | null
  requires_expiry_date: boolean // NEW: Admin toggle for manual expiry date entry
  applies_to_all: boolean
  role_ids: string[] | null
  location_ids: string[] | null
  is_enabled: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface StaffComplianceDocument {
  id: string
  tenant_id: string
  user_id: string
  requirement_id: string | null
  doc_type: string
  status: DocumentStatus // Only contains database-stored statuses: submitted | approved | rejected
  storage_bucket: string
  storage_path: string | null // Nullable for reference-only submissions
  file_name: string | null // Nullable for reference-only submissions
  file_mime: string | null // Nullable for reference-only submissions
  file_size: number | null // Nullable for reference-only submissions
  reference_number: string | null
  checked_date: string | null
  expires_at: string | null // Auto-calculated from expires_in_months
  expiry_date: string | null // NEW: User-entered expiry date (ISO format YYYY-MM-DD)
  rejection_reason: string | null
  submitted_at: string // NOT NULL in database
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

// Client-side joined type for UI
export interface RequirementWithDocument {
  requirement: TenantComplianceRequirement
  document: StaffComplianceDocument | null // null = not uploaded
  computedStatus: DocumentStatusUI // Includes expiry check
}

// Type guard to check if document has a file
export function hasFile(doc: StaffComplianceDocument): boolean {
  return doc.storage_path !== null && doc.file_name !== null
}

// Type guard to check if document has reference data
export function hasReference(doc: StaffComplianceDocument): boolean {
  return doc.reference_number !== null
}

// Helper to compute UI status from database document
export function computeDocumentStatus(doc: StaffComplianceDocument | null): DocumentStatusUI {
  if (!doc) return 'not_uploaded'
  
  // Check if expired
  if (doc.status === 'approved' && doc.expires_at) {
    const expiryDate = new Date(doc.expires_at)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (expiryDate < today) {
      return 'expired'
    }
  }
  
  return doc.status
}

// Status badge colors for UI
export function getStatusColor(status: DocumentStatusUI): string {
  switch (status) {
    case 'not_uploaded':
      return 'red'
    case 'submitted':
      return 'yellow'
    case 'approved':
      return 'green'
    case 'rejected':
      return 'red'
    case 'expired':
      return 'orange'
    default:
      return 'gray'
  }
}

// Status labels for UI
export function getStatusLabel(status: DocumentStatusUI): string {
  switch (status) {
    case 'not_uploaded':
      return 'Not Uploaded'
    case 'submitted':
      return 'Submitted'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'expired':
      return 'Expired'
    default:
      return 'Unknown'
  }
}

