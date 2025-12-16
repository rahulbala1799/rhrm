# Email Setup for Invitations

To send real invitation emails, you need to configure an email service. We support **Resend** (recommended) or **SendGrid**.

## Option 1: Resend (Recommended for Next.js)

Resend is modern, developer-friendly, and works great with Next.js.

### Setup Steps:

1. **Sign up for Resend** (free tier available):
   - Go to https://resend.com
   - Sign up for an account
   - Verify your domain (or use their test domain for development)

2. **Get your API key**:
   - Go to https://resend.com/api-keys
   - Create a new API key
   - Copy the key

3. **Install Resend package**:
   ```bash
   cd apps/web
   npm install resend
   ```

4. **Add environment variables**:
   Add to `apps/web/.env.local`:
   ```bash
   RESEND_API_KEY=re_your_api_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   # Or for testing: onboarding@resend.dev
   ```
   
   **Note**: Never commit your actual API key to git. The `.env.local` and `.env.vercel` files are gitignored for security.

5. **For Vercel deployment**:
   Add the same variables in Vercel Dashboard > Settings > Environment Variables

## Option 2: SendGrid

If you prefer SendGrid (you may already have it set up):

### Setup Steps:

1. **Sign up for SendGrid** (free tier available):
   - Go to https://sendgrid.com
   - Sign up for an account
   - Verify your sender identity

2. **Get your API key**:
   - Go to Settings > API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the key

3. **Install SendGrid package**:
   ```bash
   cd apps/web
   npm install @sendgrid/mail
   ```

4. **Add environment variables**:
   Add to `apps/web/.env.local`:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

5. **For Vercel deployment**:
   Add the same variables in Vercel Dashboard > Settings > Environment Variables

## Testing

After setup, test by sending an invitation:

1. Go to Settings > Invitations
2. Click "Send Invitation"
3. Enter an email address
4. The invitation email should be sent automatically

## Email Template

The invitation email includes:
- Company name
- Inviter name
- Role (Staff/Manager/Admin)
- Invitation link
- Expiry information (7 days)

You can customize the template in `apps/web/lib/email/send-invitation.ts` in the `getEmailTemplate()` function.

## Troubleshooting

### Emails not sending?

1. **Check environment variables**:
   - Make sure `RESEND_API_KEY` or `SENDGRID_API_KEY` is set
   - Check Vercel environment variables if deployed

2. **Check logs**:
   - Look at Vercel function logs
   - Check your email service dashboard for delivery status

3. **Verify sender email**:
   - Make sure your "from" email is verified in your email service
   - For Resend: Verify domain or use `onboarding@resend.dev` for testing
   - For SendGrid: Verify sender identity

4. **Check spam folder**:
   - Invitation emails might go to spam initially
   - Set up SPF/DKIM records for better deliverability

## Production Recommendations

1. **Use a custom domain**:
   - Set up SPF, DKIM, and DMARC records
   - Improves deliverability and branding

2. **Monitor email delivery**:
   - Set up webhooks to track bounces and failures
   - Monitor your email service dashboard

3. **Rate limiting**:
   - Both Resend and SendGrid have rate limits on free tiers
   - Consider upgrading for production use

