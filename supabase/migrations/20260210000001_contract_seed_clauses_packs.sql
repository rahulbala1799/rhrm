-- Seed contract clauses and packs for IE (Ireland)
-- Minimal set so generator can assemble a compliant contract. Expand body text as needed.

-- =============================================================================
-- CLAUSES (IE, version 1)
-- =============================================================================

INSERT INTO contract_clauses (clause_key, jurisdiction, version, tag, body, is_locked) VALUES
('statutory_override_ie', 'IE', '1', 'statutory_override',
 'Nothing in this contract reduces or removes any statutory entitlement. Where legislation provides a greater benefit, the statutory provision applies.',
 true),

('parties_ie', 'IE', '1', 'legal_required',
 'This Employment Contract is made on {{contract.issue_date}} between Employer: {{employer.legal_name}}, {{employer.registered_address}} ("the Employer") and Employee: {{employee.full_name}}, {{employee.address}} ("the Employee").',
 false),

('commencement_ie', 'IE', '1', 'legal_required',
 'The Employee''s employment begins on {{employment.start_date}}. Continuous service begins on the same date unless stated otherwise by law.',
 false),

('job_title_duties_ie', 'IE', '1', 'legal_required',
 'The Employee is employed as {{role.title}} and will report to {{role.reports_to_name}} ({{role.reports_to_title}}). Duties include: {{role.summary_duties}}. The Employee agrees to perform other reasonable duties consistent with the role.',
 false),

('place_of_work_ie', 'IE', '1', 'legal_required',
 'The normal place of work is: {{work.location_primary}}.',
 false),

('contract_type_permanent_ie', 'IE', '1', 'legal_required',
 'This employment is open-ended and continues until terminated in accordance with this contract.',
 false),

('contract_type_fixed_term_ie', 'IE', '1', 'legal_required',
 'This employment is fixed-term and will end on {{fixed_term.end_date}} or on the occurrence of {{fixed_term.end_event}}. Either party may terminate early by giving notice as set out in the termination clause. The Employee understands there is no automatic right to renewal.',
 false),

('hours_fixed_ie', 'IE', '1', 'legal_required',
 'The Employee''s normal working hours are {{working.hours_per_week}} hours per week, typically {{working.days_pattern}}. Start and finish times will be as rostered. Rosters are normally issued {{working.roster_notice}} in advance.',
 false),

('hours_variable_ie', 'IE', '1', 'legal_required',
 'The Employee''s hours may vary. The Employer reasonably expects the Employee to work {{working.expected_hours_range}}. Reference days and hours during which work may be assigned: {{working.reference_days_hours}}. Minimum notice of shifts: {{working.shift_notice_min}}. Cancellation notice: {{working.cancellation_notice}}.',
 false),

('remuneration_ie', 'IE', '1', 'legal_required',
 'The Employee will be paid {{pay.amount}} ({{pay.type}}) {{pay.frequency}} by {{pay.method}}. The Employer will provide payslips and make lawful deductions. Other deductions only where lawful and with appropriate authorisation.',
 false),

('annual_leave_ie', 'IE', '1', 'legal_required',
 'Annual leave entitlement is {{leave.annual_leave}} per leave year, in accordance with the Organisation of Working Time Act 1997. Leave requests via {{leave.request_process}}.',
 false),

('termination_notice_ie', 'IE', '1', 'legal_required',
 'The Employee must give {{termination.employee_notice}} notice to resign. The Employer will give notice in line with statutory minimums and/or {{termination.employer_notice}}. Pay in lieu or garden leave may apply where permitted.',
 false),

('handbook_reference_ie', 'IE', '1', 'best_practice',
 'Disciplinary and grievance procedures are set out in {{policies.disciplinary_doc_name}} and {{policies.grievance_doc_name}}. The Employer''s Employee Privacy Notice: {{policies.privacy_notice_name}}. Safety Statement: {{policies.safety_statement_location}}.',
 false),

('governing_law_ie', 'IE', '1', 'legal_required',
 'This contract is governed by the laws of Ireland.',
 false)
ON CONFLICT (clause_key, jurisdiction, version) DO NOTHING;

-- =============================================================================
-- PACKS (IE)
-- =============================================================================

INSERT INTO contract_packs (pack_key, jurisdiction, clause_keys, description) VALUES
('core_required_ie', 'IE', ARRAY['statutory_override_ie', 'parties_ie', 'commencement_ie', 'job_title_duties_ie', 'place_of_work_ie', 'remuneration_ie', 'annual_leave_ie', 'termination_notice_ie', 'handbook_reference_ie', 'governing_law_ie'], 'Core legal-required and handbook reference clauses'),
('contract_type_permanent', 'IE', ARRAY['contract_type_permanent_ie'], 'Permanent (open-ended) employment'),
('contract_type_fixed_term', 'IE', ARRAY['contract_type_fixed_term_ie'], 'Fixed-term employment'),
('hours_fixed', 'IE', ARRAY['hours_fixed_ie'], 'Fixed hours and roster'),
('hours_variable_unpredictable', 'IE', ARRAY['hours_variable_ie'], 'Variable/unpredictable hours with reference periods')
ON CONFLICT (pack_key, jurisdiction) DO UPDATE SET clause_keys = EXCLUDED.clause_keys, description = EXCLUDED.description, updated_at = NOW();
