/**
 * Standard IE template definitions. Inserted per tenant when they first use the generator.
 */

export const STANDARD_IE_TEMPLATES = [
  {
    template_id: 'IE_PERM_FT_FIXED',
    name: 'IE Permanent Full-Time (Fixed Hours)',
    jurisdiction: 'IE',
    version: '1',
    packs_enabled: ['core_required_ie', 'contract_type_permanent', 'hours_fixed'],
    is_standard: true,
    generator_schema: {
      contract_type: 'permanent',
      hours_mode: 'fixed',
      required_fields: ['working.hours_per_week', 'working.days_pattern', 'working.roster_notice'],
    },
  },
  {
    template_id: 'IE_PERM_PT_FIXED',
    name: 'IE Permanent Part-Time (Fixed Hours)',
    jurisdiction: 'IE',
    version: '1',
    packs_enabled: ['core_required_ie', 'contract_type_permanent', 'hours_fixed'],
    is_standard: true,
    generator_schema: {
      contract_type: 'permanent',
      hours_mode: 'fixed',
      part_time: true,
      required_fields: ['working.hours_per_week', 'working.days_pattern', 'working.roster_notice'],
    },
  },
  {
    template_id: 'IE_FIXED_FT_FIXED',
    name: 'IE Fixed-Term Full-Time (Fixed Hours)',
    jurisdiction: 'IE',
    version: '1',
    packs_enabled: ['core_required_ie', 'contract_type_fixed_term', 'hours_fixed'],
    is_standard: true,
    generator_schema: {
      contract_type: 'fixed_term',
      hours_mode: 'fixed',
      required_fields: ['working.hours_per_week', 'working.days_pattern', 'working.roster_notice', 'fixed_term.end_date'],
    },
  },
  {
    template_id: 'IE_FIXED_PT_FIXED',
    name: 'IE Fixed-Term Part-Time (Fixed Hours)',
    jurisdiction: 'IE',
    version: '1',
    packs_enabled: ['core_required_ie', 'contract_type_fixed_term', 'hours_fixed'],
    is_standard: true,
    generator_schema: {
      contract_type: 'fixed_term',
      hours_mode: 'fixed',
      part_time: true,
      required_fields: ['working.hours_per_week', 'working.days_pattern', 'working.roster_notice', 'fixed_term.end_date'],
    },
  },
  {
    template_id: 'IE_VARIABLE_CASUAL',
    name: 'IE Variable Hours / Casual',
    jurisdiction: 'IE',
    version: '1',
    packs_enabled: ['core_required_ie', 'contract_type_permanent', 'hours_variable_unpredictable'],
    is_standard: true,
    generator_schema: {
      contract_type: 'permanent',
      hours_mode: 'variable',
      required_fields: ['working.expected_hours_range', 'working.reference_days_hours', 'working.shift_notice_min', 'working.cancellation_notice'],
    },
  },
] as const
