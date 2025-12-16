/**
 * Send invitation email
 * Supports multiple email providers: Resend, SendGrid, Mailgun, or Nodemailer (SMTP)
 */

interface SendInvitationEmailParams {
  to: string
  invitationUrl: string
  inviterName: string
  companyName: string
  role: string
}

export async function sendInvitationEmail({
  to,
  invitationUrl,
  inviterName,
  companyName,
  role,
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log('Attempting to send invitation email:', { to, companyName, role })
  console.log('Environment check:', {
    hasResendKey: !!process.env.RESEND_API_KEY,
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    hasMailgunKey: !!process.env.MAILGUN_API_KEY,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  })

  // Try Resend first (recommended for Next.js)
  if (process.env.RESEND_API_KEY) {
    return sendViaResend({ to, invitationUrl, inviterName, companyName, role })
  }

  // Fallback to SendGrid
  if (process.env.SENDGRID_API_KEY) {
    return sendViaSendGrid({ to, invitationUrl, inviterName, companyName, role })
  }

  // Fallback to Mailgun (reliable API-based service)
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return sendViaMailgun({ to, invitationUrl, inviterName, companyName, role })
  }

  // Fallback to Supabase Auth email (limited customization)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return sendViaSupabase({ to, invitationUrl, inviterName, companyName, role })
  }

  const errorMsg = 'No email service configured. Please set RESEND_API_KEY, SENDGRID_API_KEY, or MAILGUN_API_KEY with MAILGUN_DOMAIN.'
  console.error(errorMsg)
  return {
    success: false,
    error: errorMsg,
  }
}

async function sendViaResend({
  to,
  invitationUrl,
  inviterName,
  companyName,
  role,
}: SendInvitationEmailParams) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error('RESEND_API_KEY is not set')
      return { success: false, error: 'RESEND_API_KEY environment variable is not configured' }
    }

    const resend = await import('resend')
    const client = new resend.Resend(apiKey)

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    
    console.log('Sending email via Resend:', { to, from: fromEmail, hasApiKey: !!apiKey })

    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `You're invited to join ${companyName}`,
      html: getEmailTemplate({ invitationUrl, inviterName, companyName, role }),
    })

    if (error) {
      console.error('Resend API error:', error)
      return { success: false, error: `Resend error: ${error.message || JSON.stringify(error)}` }
    }

    console.log('Email sent successfully via Resend:', data)
    return { success: true }
  } catch (err: any) {
    console.error('Error sending via Resend:', err)
    return { success: false, error: `Failed to send email: ${err.message || String(err)}` }
  }
}

async function sendViaSendGrid({
  to,
  invitationUrl,
  inviterName,
  companyName,
  role,
}: SendInvitationEmailParams) {
  try {
    const sgMail = await import('@sendgrid/mail')
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY!)

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com',
      subject: `You're invited to join ${companyName}`,
      html: getEmailTemplate({ invitationUrl, inviterName, companyName, role }),
    }

    await sgMail.default.send(msg)
    return { success: true }
  } catch (err: any) {
    console.error('Error sending via SendGrid:', err)
    return { success: false, error: err.message }
  }
}

async function sendViaMailgun({
  to,
  invitationUrl,
  inviterName,
  companyName,
  role,
}: SendInvitationEmailParams) {
  try {
    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_DOMAIN
    
    if (!apiKey || !domain) {
      console.error('MAILGUN_API_KEY or MAILGUN_DOMAIN is not set')
      return { success: false, error: 'MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables are required' }
    }

    const fromEmail = process.env.MAILGUN_FROM_EMAIL || `noreply@${domain}`
    
    console.log('Sending email via Mailgun:', { to, from: fromEmail, domain })

    // Mailgun API endpoint
    const mailgunUrl = process.env.MAILGUN_API_URL || 'https://api.mailgun.net/v3'
    const endpoint = `${mailgunUrl}/${domain}/messages`

    const formData = new URLSearchParams()
    formData.append('from', fromEmail)
    formData.append('to', to)
    formData.append('subject', `You're invited to join ${companyName}`)
    formData.append('html', getEmailTemplate({ invitationUrl, inviterName, companyName, role }))

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Mailgun API error:', data)
      return { success: false, error: `Mailgun error: ${data.message || JSON.stringify(data)}` }
    }

    console.log('Email sent successfully via Mailgun:', data)
    return { success: true }
  } catch (err: any) {
    console.error('Error sending via Mailgun:', err)
    return { success: false, error: `Failed to send email: ${err.message || String(err)}` }
  }
}

async function sendViaSupabase({
  to,
  invitationUrl,
  inviterName,
  companyName,
  role,
}: SendInvitationEmailParams) {
  // Note: Supabase's built-in email is mainly for auth flows
  // This is a fallback - you should use Resend or SendGrid for better control
  console.warn('Using Supabase email fallback - consider setting up Resend or SendGrid')
  
  // You could use Supabase's admin API to send emails, but it's limited
  // For now, just log that we would send it
  console.log('Would send invitation email:', { to, invitationUrl })
  
  return {
    success: false,
    error: 'Supabase email not fully implemented. Please configure Resend or SendGrid.',
  }
}

function getEmailTemplate({
  invitationUrl,
  inviterName,
  companyName,
  role,
}: Omit<SendInvitationEmailParams, 'to'>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
  </div>
  
  <div style="background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi there,
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role}</strong>.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Click the button below to accept your invitation and get started:
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${invitationUrl}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; margin-bottom: 10px;">
      Or copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; margin: 0;">
      ${invitationUrl}
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This invitation will expire in 7 days.
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
  `.trim()
}

