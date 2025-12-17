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
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Team Invitation from ${companyName}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f6f9fc;" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);" cellpadding="0" cellspacing="0">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 48px 40px; text-align: center;">
              <div style="background-color: #ffffff; width: 56px; height: 56px; border-radius: 12px; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                You're Invited to Join ${companyName}
              </h1>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 48px 40px;">
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                Hi there,
              </p>
              
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #374151;">
                <strong style="color: #111827;">${inviterName}</strong> has invited you to join their team at <strong style="color: #111827;">${companyName}</strong> as a <strong style="color: #2563eb; text-transform: capitalize;">${role}</strong>.
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 32px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #1e40af;">
                  <strong>Getting Started:</strong> Click the button below to create your account and join the team. You'll be able to set your password and complete your profile.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${invitationUrl}" 
                       style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25); transition: all 0.3s ease;"
                       target="_blank">
                      Accept Invitation &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <div style="border-top: 1px solid #e5e7eb; margin: 32px 0;"></div>
              
              <!-- Link Fallback -->
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280; font-weight: 500;">
                Or copy and paste this link into your browser:
              </p>
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; word-break: break-all;">
                <a href="${invitationUrl}" style="font-size: 13px; color: #2563eb; text-decoration: none; font-family: 'Courier New', monospace;" target="_blank">
                  ${invitationUrl}
                </a>
              </div>
              
              <!-- Important Info Box -->
              <div style="margin-top: 32px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fde68a;">
                <table role="presentation" style="width: 100%;" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: top; padding-right: 12px; width: 24px;">
                      <div style="width: 20px; height: 20px; background-color: #f59e0b; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="color: #ffffff; font-size: 14px; font-weight: bold;">!</span>
                      </div>
                    </td>
                    <td style="vertical-align: top;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #92400e;">
                        <strong>This invitation expires in 7 days.</strong> Please accept it soon to avoid needing a new invitation.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px; font-size: 13px; line-height: 1.5; color: #6b7280; text-align: center;">
                If you didn't expect this invitation or believe it was sent by mistake, you can safely ignore this email. No account will be created unless you accept the invitation.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

