# CLAUDE.md

## Project Overview

Multi-tenant HR & Staff Management System for retail/trades agencies. Monorepo with three apps: a Next.js web app, an Expo mobile app, and a Node.js background worker. Uses Supabase PostgreSQL with Row Level Security (RLS) for data isolation.

## Repository Structure

```
rhrm/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — deployed to Vercel
│   ├── mobile/       # Expo + React Native — deployed via EAS
│   └── worker/       # Node.js cron jobs — deployed to Railway
├── supabase/
│   └── migrations/   # 30 sequential SQL migration files
├── scripts/          # Setup and deployment helpers
└── package.json      # Root workspace config (npm workspaces)
```

### Web App Layout (`apps/web/`)

```
app/
├── (dashboard)/      # Route group — authenticated pages
│   ├── dashboard/    # Main dashboard
│   ├── staff/        # Staff management
│   ├── schedule/     # Shift scheduling
│   ├── compliance/   # Document compliance
│   ├── payroll/      # Payroll/exports
│   ├── settings/     # Tenant settings
│   ├── me/           # User profile
│   ├── staff-dashboard/  # Staff-role dashboard
│   ├── contexts/     # React context providers
│   └── hooks/        # Custom React hooks
├── api/              # API routes (see below)
├── auth/             # Auth callback handlers
├── login/            # Login page
├── signup/           # Signup page
├── onboarding/       # Tenant onboarding flow
├── invite/           # Invitation acceptance
└── staff-onboarding/ # Staff onboarding flow
components/
├── dashboard/        # Sidebar.tsx, StaffSidebar.tsx, TopBar.tsx
└── ui/               # PageHeader, EmptyState, StatCard, SectionCard
lib/
├── auth/             # get-tenant-context.ts (core auth helper)
├── supabase/         # client.ts, server.ts, middleware.ts
├── compliance/       # Compliance utilities
├── currency/         # Currency formatting
├── email/            # SendGrid/Resend integration
├── pay-period/       # Pay period calculations
├── schedule/         # Schedule utilities
├── staff-rates/      # Hourly rate calculations
├── utils/            # General utilities
└── supabase-types.ts # Generated Supabase types
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS 3.4 |
| Mobile | Expo ~50, React Native 0.73, Expo Router |
| Database | Supabase PostgreSQL with RLS |
| Auth | Supabase Auth (membership-based, NOT JWT claims) |
| Worker | Node.js + node-cron, tsx for dev |
| Styling | Tailwind CSS + PostCSS |
| Data fetching | SWR (client), Supabase queries (server) |
| Email | SendGrid / Resend |
| UI icons | Heroicons React |
| DnD | @dnd-kit |
| Dates | date-fns + date-fns-tz |

## Commands

### Development

```bash
# From repo root:
npm run dev:web        # Start web app on :3000
npm run dev:mobile     # Start Expo dev server
npm run dev:worker     # Start worker in watch mode (tsx)

# Or directly:
cd apps/web && npm run dev
cd apps/worker && npm run dev
```

### Build

```bash
npm run build:web      # Next.js production build
npm run build:worker   # TypeScript compile to dist/
```

### Lint

```bash
cd apps/web && npm run lint   # next lint (ESLint)
```

Note: ESLint is disabled during builds (`ignoreDuringBuilds: true` in next.config.js). TypeScript strict mode is enabled.

### Database

```bash
supabase db push             # Apply migrations to remote
supabase db reset            # Reset local database
supabase start               # Start local Supabase
supabase gen types typescript # Generate TypeScript types
```

### Deployment

- **Web**: Auto-deploys to Vercel on push. Install command uses `--legacy-peer-deps --no-workspaces`.
- **Worker**: Deploys to Railway with NIXPACKS builder.
- **Mobile**: Build via Expo EAS.

## Architecture Decisions

### Multi-Tenancy: Membership-Based (NOT JWT Claims)

The system uses **database membership lookups** instead of JWT custom claims for tenant context. This is a deliberate architectural choice.

- `getTenantContext()` in `lib/auth/get-tenant-context.ts` reads the `active_tenant_id` cookie and verifies membership in the database
- `verifyTenantAccess(tenantId, requiredRole)` checks role hierarchy server-side
- Active tenant is stored in a non-httpOnly cookie (UI state only)
- Users can belong to multiple tenants and switch without reauthentication
- Role hierarchy: `superadmin > admin > manager > staff`

### Row Level Security (RLS)

All tenant-scoped tables enforce RLS. Key helper functions:

- `user_has_membership(user_id, tenant_id)` — checks active membership
- `get_user_role_in_tenant(user_id, tenant_id)` — returns role string
- `user_has_role_in_tenant(user_id, tenant_id, role)` — checks specific role

These are `SECURITY DEFINER` functions with `SET search_path = public`. Execute is granted to `authenticated` role only.

### API Route Pattern

All API routes in `apps/web/app/api/` follow this pattern:

```typescript
import { getTenantContext } from '@/lib/auth/get-tenant-context'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { tenantId, role } = await getTenantContext()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createClient()
  // ... perform operation with tenant_id filter
}
```

### Tenant Creation

Tenant creation is atomic via database function `create_tenant_with_admin()` — creates tenant + first admin membership together. Only endpoint: `/api/tenants/create`.

### Storage

Shared Supabase storage buckets with path-based tenant isolation:
- `compliance-docs`: `/tenants/{tenant_id}/compliance/{staff_id}/{document_id}_{filename}`
- `exports`: Admin-only payroll exports
- File constraints: PDF, JPG, PNG only; 10MB max

## Database Schema

Core tables (all tenant-scoped with `tenant_id NOT NULL`):

| Table | Purpose |
|-------|---------|
| `tenants` | Organizations with slug, subscription_tier, settings |
| `profiles` | User accounts (FK to auth.users) |
| `memberships` | User-tenant relationships with role and status |
| `locations` | Workplace locations |
| `staff` | Employee records with employee_number, hourly_rate |
| `availability` | Staff availability by day_of_week |
| `shifts` | Scheduled shifts with status tracking |
| `timesheets` | Clock in/out with total_hours |
| `compliance_documents` | Document tracking with expiry_date |
| `invitations` | User invitations with token and expiry |
| `notifications` | System alerts (JSONB data) |
| `audit_logs` | Activity tracking (action, resource_type, changes JSONB) |
| `staff_hourly_rates` | Historical rate tracking for payroll |

### Naming Conventions (Database)

- Tables: lowercase, plural (`staff`, `shifts`, `memberships`)
- Columns: snake_case
- Primary keys: `id` (UUID via pgcrypto)
- Foreign keys: `{table}_id` (e.g., `tenant_id`, `staff_id`)
- Timestamps: `created_at`, `updated_at` as TIMESTAMPTZ with DEFAULT NOW()
- Status fields: lowercase string values with CHECK constraints

## API Routes

Key route groups in `apps/web/app/api/`:

- `/api/auth/role` — current user role
- `/api/me/profile`, `/api/me/staff-profile`, `/api/me/tenant` — user context
- `/api/tenants/create|switch|leave|transfer-ownership` — tenant management
- `/api/staff`, `/api/staff/[id]` — staff CRUD
- `/api/staff/[id]/availability|locations|roles|rate-history|wages|documents` — staff sub-resources
- `/api/schedule/shifts`, `/api/schedule/shifts/[id]`, `/api/schedule/shifts/bulk` — scheduling
- `/api/schedule/availability|day|week|conflicts|settings` — schedule views
- `/api/compliance/documents`, `/api/compliance/upload`, `/api/compliance/review/[id]/approve|reject` — compliance
- `/api/invitations/send|accept` — invitations
- `/api/settings/company|locations|pay-period|currency|job-roles|permissions|compliance-documents` — settings
- `/api/exports/payroll` — CSV payroll export
- `/api/superadmin` — platform admin operations

## Code Conventions

### TypeScript

- Strict mode enabled in all apps
- Path alias: `@/*` maps to web app root (e.g., `@/lib/auth/get-tenant-context`)
- Web targets ES5 (for browser compat); worker targets ES2022
- Type definitions in `lib/supabase-types.ts` (generated)

### React / Next.js

- `'use client'` directive on all interactive components
- Server components for data fetching in `page.tsx` files
- API routes for writes and sensitive operations; direct Supabase client for reads when RLS is sufficient
- Form state managed with `useState` + direct Supabase or API calls
- Loading states with skeleton/spinner components
- SWR for client-side data fetching with revalidation

### Styling

- Tailwind CSS utility classes throughout
- No CSS modules or styled-components
- Responsive design with Tailwind breakpoints

### Error Handling

- Try-catch around all async operations
- HTTP status codes: 400 (bad input), 401 (no auth), 403 (wrong role), 409 (conflict), 500 (server error)
- User-friendly error messages returned in JSON
- Console logging for debugging; no structured logging library

### Security Rules

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to client code
- **Always** filter by `tenant_id` in queries even with RLS (RLS doesn't auto-filter, it restricts)
- **Always** validate tenant context and role before writes in API routes
- All mutations should be logged to `audit_logs`
- File uploads restricted to PDF/JPG/PNG, 10MB max
- Invitation tokens expire and are single-use

## Worker Jobs (`apps/worker/`)

Three cron-scheduled background jobs:

1. **Shift Reminders** — Daily 9 AM, notifies staff 24h before shifts
2. **Document Expiry** — Daily 8 AM, alerts on docs expiring in 30/14/7 days
3. **Invitation Expiry** — Daily midnight, marks expired invitations

Worker uses service role client (bypasses RLS). Set `RUN_JOBS_ON_STARTUP=true` to run immediately in dev.

## Environment Variables

### Web (`apps/web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=      # Server-only, never in client bundle
NEXT_PUBLIC_APP_URL=            # App URL for redirects
```

### Worker (`apps/worker/.env`)

```
SUPABASE_URL=                   # Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=      # Service role for RLS bypass
RUN_JOBS_ON_STARTUP=            # true/false
```

## Testing

No test framework is currently configured. The codebase is structured to support testing but no Jest/Vitest setup exists yet. RLS correctness can be tested by authenticating as different users via the Supabase client and verifying cross-tenant isolation.

## Common Gotchas

- The Vercel install command must include `--legacy-peer-deps --no-workspaces` (configured in `vercel.json`)
- Supabase RLS helper functions require `GRANT EXECUTE` to `authenticated` — missing grants cause silent permission failures
- `active_tenant_id` cookie is UI state only (non-httpOnly); the actual security check is the membership lookup
- Migration numbering skips `000010` — this is intentional, not a gap
- ESLint is disabled during builds; run `npm run lint` separately to check
