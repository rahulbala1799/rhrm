import { createClient } from '@supabase/supabase-js'
import cron from 'node-cron'

// Use service role key - bypasses RLS for system operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Log system action to audit_logs
 */
async function logSystemAction(
  action: string,
  resourceType: string,
  resourceId: string | null,
  tenantId: string | null,
  changes?: any
) {
  await supabase.from('audit_logs').insert({
    tenant_id: tenantId,
    user_id: null, // System action
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes: changes || {},
  })
}

/**
 * Job: Send shift reminders (24 hours before shift)
 */
async function sendShiftReminders() {
  console.log('[Worker] Running shift reminders job...')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0))
  const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999))

  // Get shifts starting tomorrow
  const { data: shifts, error } = await supabase
    .from('shifts')
    .select('*, staff:staff_id(*, user_id, profiles:user_id(id))')
    .gte('start_time', tomorrowStart.toISOString())
    .lte('start_time', tomorrowEnd.toISOString())
    .eq('status', 'confirmed')

  if (error) {
    console.error('[Worker] Error fetching shifts:', error)
    return
  }

  if (!shifts || shifts.length === 0) {
    console.log('[Worker] No shifts to remind about')
    return
  }

  // Create notifications for each shift
  for (const shift of shifts) {
    const staff = shift.staff
    if (!staff?.user_id) continue

    await supabase.from('notifications').insert({
      tenant_id: shift.tenant_id,
      user_id: staff.user_id,
      type: 'shift_reminder',
      title: 'Shift Reminder',
      message: `You have a shift tomorrow at ${new Date(shift.start_time).toLocaleTimeString()}`,
      data: {
        shift_id: shift.id,
        start_time: shift.start_time,
      },
    })

    await logSystemAction(
      'create',
      'notification',
      null,
      shift.tenant_id,
      { type: 'shift_reminder', shift_id: shift.id }
    )
  }

  console.log(`[Worker] Created ${shifts.length} shift reminders`)
}

/**
 * Job: Check for expiring compliance documents
 */
async function checkExpiringDocuments() {
  console.log('[Worker] Running document expiry check...')

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get documents expiring in 30, 14, or 7 days
  const { data: documents, error } = await supabase
    .from('compliance_documents')
    .select('*, staff:staff_id(*, user_id)')
    .in('status', ['pending', 'verified'])
    .not('expiry_date', 'is', null)
    .lte('expiry_date', thirtyDays.toISOString().split('T')[0])
    .gte('expiry_date', now.toISOString().split('T')[0])

  if (error) {
    console.error('[Worker] Error fetching documents:', error)
    return
  }

  if (!documents || documents.length === 0) {
    console.log('[Worker] No expiring documents')
    return
  }

  for (const doc of documents) {
    const expiryDate = new Date(doc.expiry_date)
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    )

    let alertType = 'document_expiring'
    let message = `Your ${doc.document_type} document expires in ${daysUntilExpiry} days`

    if (daysUntilExpiry <= 7) {
      alertType = 'document_expiring_urgent'
      message = `URGENT: Your ${doc.document_type} document expires in ${daysUntilExpiry} days`
    }

    const staff = doc.staff
    if (!staff?.user_id) continue

    // Notify staff member
    await supabase.from('notifications').insert({
      tenant_id: doc.tenant_id,
      user_id: staff.user_id,
      type: alertType,
      title: 'Document Expiring',
      message,
      data: {
        document_id: doc.id,
        document_type: doc.document_type,
        expiry_date: doc.expiry_date,
        days_until_expiry: daysUntilExpiry,
      },
    })

    // Also notify managers/admins
    const { data: managers } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('tenant_id', doc.tenant_id)
      .in('role', ['admin', 'manager'])
      .eq('status', 'active')

    if (managers) {
      for (const manager of managers) {
        await supabase.from('notifications').insert({
          tenant_id: doc.tenant_id,
          user_id: manager.user_id,
          type: 'document_expiring_admin',
          title: 'Staff Document Expiring',
          message: `${staff.first_name} ${staff.last_name}'s ${doc.document_type} expires in ${daysUntilExpiry} days`,
          data: {
            document_id: doc.id,
            staff_id: staff.id,
            expiry_date: doc.expiry_date,
          },
        })
      }
    }

    await logSystemAction(
      'create',
      'notification',
      null,
      doc.tenant_id,
      { type: alertType, document_id: doc.id }
    )
  }

  console.log(`[Worker] Processed ${documents.length} expiring documents`)
}

/**
 * Job: Mark expired invitations
 */
async function markExpiredInvitations() {
  console.log('[Worker] Running invitation expiry check...')

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())

  if (error) {
    console.error('[Worker] Error updating invitations:', error)
    return
  }

  console.log('[Worker] Marked expired invitations')
}

// Schedule jobs
// Shift reminders: Daily at 9 AM
cron.schedule('0 9 * * *', sendShiftReminders)

// Document expiry check: Daily at 8 AM
cron.schedule('0 8 * * *', checkExpiringDocuments)

// Invitation expiry: Daily at midnight
cron.schedule('0 0 * * *', markExpiredInvitations)

console.log('[Worker] Background jobs scheduled')
console.log('[Worker] - Shift reminders: Daily at 9 AM')
console.log('[Worker] - Document expiry: Daily at 8 AM')
console.log('[Worker] - Invitation expiry: Daily at midnight')

// Run jobs immediately on startup (for testing)
if (process.env.RUN_JOBS_ON_STARTUP === 'true') {
  console.log('[Worker] Running jobs on startup...')
  await Promise.all([
    sendShiftReminders(),
    checkExpiringDocuments(),
    markExpiredInvitations(),
  ])
}


