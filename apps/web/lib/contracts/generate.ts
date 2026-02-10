/**
 * Contract generation: merge data and render clauses with placeholder substitution.
 * Does not write to DB; caller persists generation_input_json and rendered output.
 */

export type GenerationInput = {
  employer: { legal_name: string; registered_address: string }
  employee: { full_name: string; address: string }
  employment: { start_date: string; contract_type: string }
  role: { title: string; reports_to_name: string; reports_to_title: string; summary_duties: string }
  work: { location_primary: string }
  working?: {
    hours_per_week?: string
    days_pattern?: string
    roster_notice?: string
    expected_hours_range?: string
    reference_days_hours?: string
    shift_notice_min?: string
    cancellation_notice?: string
  }
  pay: { amount: string; type: string; frequency: string; method: string }
  leave: { annual_leave: string; request_process: string }
  termination: { employee_notice: string; employer_notice: string }
  policies: {
    disciplinary_doc_name: string
    grievance_doc_name: string
    privacy_notice_name: string
    safety_statement_location: string
  }
  contract?: { issue_date: string }
  fixed_term?: { end_date?: string; end_event?: string }
}

/**
 * Replace {{path.to.field}} in text with values from a nested object.
 * Supports dot notation: employer.legal_name -> input.employer.legal_name
 */
function substitutePlaceholders(text: string, input: GenerationInput): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const key = path.trim()
    const parts = key.split('.')
    let value: unknown = input as Record<string, unknown>
    for (const part of parts) {
      if (value != null && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part]
      } else {
        return `[${key}]`
      }
    }
    return value != null ? String(value) : `[${key}]`
  })
}

/**
 * Render a single clause body with generation input.
 */
export function renderClause(body: string, input: GenerationInput): string {
  return substitutePlaceholders(body, input)
}

/**
 * Build full contract HTML from an ordered list of clause bodies (already fetched by pack order).
 */
export function buildContractHtml(clauseBodies: string[], input: GenerationInput): string {
  const sections = clauseBodies.map((body) => {
    const html = substitutePlaceholders(body, input)
    return `<section class="contract-clause">${escapeHtml(html)}</section>`
  })
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Employment Contract - ${escapeHtml(input.employee.full_name)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; color: #111; }
    .contract-clause { margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>Employment Contract</h1>
  ${sections.join('\n  ')}
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Flatten generation input (e.g. from form + company defaults) into the shape expected by placeholders.
 * Ensures contract.issue_date if not set.
 */
export function normalizeGenerationInput(partial: Record<string, unknown>): GenerationInput {
  const employer = (partial.employer as Record<string, string>) || {}
  const employee = (partial.employee as Record<string, string>) || {}
  const employment = (partial.employment as Record<string, string>) || {}
  const role = (partial.role as Record<string, string>) || {}
  const work = (partial.work as Record<string, string>) || {}
  const working = (partial.working as Record<string, string>) || {}
  const pay = (partial.pay as Record<string, string>) || {}
  const leave = (partial.leave as Record<string, string>) || {}
  const termination = (partial.termination as Record<string, string>) || {}
  const policies = (partial.policies as Record<string, string>) || {}
  const contract = (partial.contract as Record<string, string>) || {}
  const fixed_term = (partial.fixed_term as Record<string, string>) || {}

  return {
    employer: {
      legal_name: employer.legal_name ?? '',
      registered_address: employer.registered_address ?? '',
    },
    employee: {
      full_name: employee.full_name ?? '',
      address: employee.address ?? '',
    },
    employment: {
      start_date: employment.start_date ?? '',
      contract_type: employment.contract_type ?? 'permanent',
    },
    role: {
      title: role.title ?? '',
      reports_to_name: role.reports_to_name ?? '',
      reports_to_title: role.reports_to_title ?? '',
      summary_duties: role.summary_duties ?? '',
    },
    work: {
      location_primary: work.location_primary ?? '',
    },
    working: Object.keys(working).length ? working : undefined,
    pay: {
      amount: pay.amount ?? '',
      type: pay.type ?? 'hourly',
      frequency: pay.frequency ?? 'weekly',
      method: pay.method ?? 'bank transfer',
    },
    leave: {
      annual_leave: leave.annual_leave ?? 'statutory minimum',
      request_process: leave.request_process ?? 'as notified by the Employer',
    },
    termination: {
      employee_notice: termination.employee_notice ?? '1 week',
      employer_notice: termination.employer_notice ?? 'statutory minimum',
    },
    policies: {
      disciplinary_doc_name: policies.disciplinary_doc_name ?? 'Disciplinary Procedure',
      grievance_doc_name: policies.grievance_doc_name ?? 'Grievance Procedure',
      privacy_notice_name: policies.privacy_notice_name ?? 'Employee Privacy Notice',
      safety_statement_location: policies.safety_statement_location ?? 'as notified',
    },
    contract: {
      issue_date: contract.issue_date ?? new Date().toISOString().slice(0, 10),
    },
    fixed_term: Object.keys(fixed_term).length ? fixed_term : undefined,
  }
}
