import Link from 'next/link'
import PageHeader from '@/components/ui/PageHeader'
import SectionCard from '@/components/ui/SectionCard'

export default function ContractRulesPage() {
  return (
    <div>
      <PageHeader
        title="Contract rules & Irish law"
        description="Legal requirements and best practice for employment contracts in Ireland"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Compliance', href: '/compliance' },
          { label: 'Contract', href: '/compliance/contract' },
          { label: 'Contract rules' },
        ]}
        action={
          <Link href="/compliance/contract" className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">
            ← Back to Contract
          </Link>
        }
      />

      <div className="space-y-6">
        <SectionCard
          title="Disclaimer"
          description="Practical compliance guide, not legal advice"
        >
          <p className="text-sm text-gray-600">
            Irish employment law changes over time. For complex cases (dismissals, restrictive covenants, collective agreements, cross-border staff), obtain qualified legal advice. This summary is based on the Irish Employment Contract Law Report for small employers (retail and SMEs).
          </p>
        </SectionCard>

        <SectionCard
          title="What must be in an Irish employment contract"
          description="Written terms are required by law"
        >
          <ul className="space-y-2 text-sm text-gray-700">
            <li><strong>Within 5 days (Day 5 statement):</strong> Names of employer and employee; employer address in Ireland; place of work; job title/duties; start date; probation (if any); contract type and duration; pay (amount, frequency, components); hours expected and overtime; Sunday work and tips (if applicable).</li>
            <li><strong>Within 1 month (full terms):</strong> All of the above, plus paid leave (annual and public holidays), sick leave (statutory and any company scheme), pension (scheme or PRSA facilitation), notice periods, collective agreements (if any), training entitlements, and for unpredictable schedules: reference hours/days, minimum notice for shifts, and cancellation rules.</li>
            <li>Best practice: provide one signed contract that meets the 1-month requirements from day one and reference a Staff Handbook for procedures.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Contract types"
          description="Permanent, fixed-term, part-time, casual"
        >
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li><strong>Permanent:</strong> No fixed end date; clear hours, pay, place of work, notice. Part-time permanent: pro-rata benefits, no less favourable treatment except on objective grounds.</li>
            <li><strong>Fixed-term:</strong> State end date or ending event; state if early termination is allowed; avoid repeated renewals without objective reasons (can convert to open-ended).</li>
            <li><strong>Part-time:</strong> Weekly hours (or range), days/rota, how extra hours are offered; comparable pay and conditions.</li>
            <li><strong>Casual / zero-hours:</strong> Describe clearly; Irish law restricts zero-hours that require availability without guaranteed work. Include reference hours/days, scheduling notice, cancellation rules.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Probation, working time & pay"
          description="Key requirements"
        >
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li><strong>Probation:</strong> Clear and time-limited (commonly up to 6 months); state notice during probation; extensions only in exceptional circumstances, in writing.</li>
            <li><strong>Working time:</strong> Normal hours and how rosters are communicated; rest and breaks per statute; overtime (whether required, how approved, how paid); Sunday premium if Sunday work is required; for variable schedules: reference days/hours, minimum notice for shifts and cancellations.</li>
            <li><strong>Pay:</strong> Rate/salary, frequency, all components (basic, commission, allowances, bonuses); lawful deductions clause; benefits stated (and if discretionary).</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Leave, discipline, termination"
          description="Leave entitlements and procedures"
        >
          <ul className="space-y-2 text-sm text-gray-700 list-disc list-inside">
            <li><strong>Leave:</strong> Annual leave (statutory minimum, leave year, approval process); public holidays; sick leave (reporting, certification, statutory and company scheme); family leave can be referenced in handbook.</li>
            <li><strong>Disciplinary & grievance:</strong> Written procedures recommended; right to respond and representation; gross misconduct and summary dismissal where appropriate.</li>
            <li><strong>Termination & notice:</strong> Statutory minimum employer notice (e.g. 1 week at 13 weeks–2 years, up to 8 weeks at 15+ years); contract states employee and employer notice; optional PILON, garden leave, lay-off/short-time where relevant.</li>
          </ul>
        </SectionCard>

        <SectionCard
          title="Full documentation"
          description="Template and system design"
        >
          <p className="text-sm text-gray-600 mb-2">
            The Irish employment contract template (generator-ready with placeholders and conditional clauses), generator mapping, and the full Contract Generator system design (templates → roles → assign to staff → staff uploads signed copy) are documented in:
          </p>
          <p className="text-sm font-medium text-gray-900">
            <code className="bg-gray-100 px-1.5 py-0.5 rounded">compliance/contract/README.md</code>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Official sources: Workplace Relations Commission (WRC), Citizens Information, Irish Statute Book (Terms of Employment (Information) Acts; Organisation of Working Time Act 1997; Minimum Notice and Terms of Employment Act 1973; others).
          </p>
        </SectionCard>
      </div>
    </div>
  )
}
