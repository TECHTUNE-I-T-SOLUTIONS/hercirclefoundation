# Paystack Webhook Configuration Guide

## Webhook URL Configuration

### Local Development
For local testing, you'll need to use a tunneling service like ngrok or localtunnel to expose your local server to the internet.

#### Using ngrok:
1. Install ngrok: https://ngrok.com/download
2. Run ngrok: `ngrok http 3000`
3. Copy the HTTPS URL provided (e.g., `https://abc123.ngrok.io`)
4. Your webhook URL will be: `https://abc123.ngrok.io/api/webhooks/paystack`

#### Using localtunnel:
1. Install localtunnel: `npm install -g localtunnel`
2. Run localtunnel: `lt --port 3000`
3. Copy the URL provided
4. Your webhook URL will be: `https://your-url.localtunnel.me/api/webhooks/paystack`

#### Current Webhook Implementation:
Your webhook endpoint is: `/api/webhooks/paystack`

This endpoint:
- Validates Paystack signatures for security
- Handles `charge.success` events to verify payments
- Handles `charge.failed` events to mark failed payments
- Sends email notifications to donors and admins
- Updates payment records in Supabase automatically

### Production
For production, your webhook URL will be:
```
https://your-domain.com/api/webhooks/paystack
```

Replace `your-domain.com` with your actual domain.

## Setting Up Webhook in Paystack Dashboard

1. **Log in to Paystack Dashboard**
   - Go to https://dashboard.paystack.co/
   - Login with your credentials

2. **Navigate to Webhooks**
   - Click on "Settings" in the sidebar
   - Select "Webhooks" from the settings menu

3. **Add New Webhook**
   - Click on "Add Webhook" button
   - Enter your webhook URL:
     - Local: `https://your-ngrok-url.ngrok.io/api/webhooks/paystack`
     - Production: `https://your-domain.com/api/webhooks/paystack`

4. **Select Events to Track**
   - ✅ `charge.success` - When a payment is successful
   - ✅ `charge.failed` - When a payment fails
   - ✅ `transfer.success` - (Optional) If you plan to do transfers
   - ✅ `transfer.failed` - (Optional) If you plan to do transfers

5. **Save Webhook**
   - Click "Save" to create the webhook
   - Paystack will send a test webhook to verify the URL

6. **Verify Webhook**
   - Check your server logs to ensure the test webhook was received
   - The webhook should return a 200 status code

## Webhook Security

The webhook endpoint includes signature verification for security:

```typescript
// The webhook validates Paystack signatures using your secret key
const signature = request.headers.get('x-paystack-signature')
if (!validateWebhookSignature(rawBody, signature)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}
```

## Testing Webhooks Locally

### Using Paystack Test Mode
1. Ensure you're using test keys (already configured in `.env.local`)
2. Make a test payment using the donation form
3. Use Paystack test card: `4084 0840 0840 4081`
4. Expiry: Any future date
5. CVV: Any 3 digits
6. The webhook will be triggered automatically

### Manual Webhook Testing
You can test webhooks manually using curl:

```bash
curl -X POST https://your-webhook-url/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: YOUR_SIGNATURE" \
  -d '{
    "event": "charge.success",
    "data": {
      "id": 123456,
      "status": "success",
      "reference": "HER-test-reference",
      "amount": 50000,
      "customer": {
        "email": "test@example.com",
        "first_name": "Test",
        "last_name": "User"
      },
      "paid_at": "2026-09-11T12:00:00.000Z"
    }
  }'
```

## Webhook Events Handled

### charge.success
- Updates payment status to 'success'
- Sets verification_status to 'verified'
- Records payment timestamp
- Sends thank you email to donor
- Notifies admins of successful payment

### charge.failed
- Updates payment status to 'failed'
- Sets verification_status to 'failed'
- Records failure details
- Logs error for admin review

## Troubleshooting

### Webhook Not Receiving Events
1. Check if webhook URL is accessible from the internet
2. Verify Paystack dashboard shows webhook as active
3. Check server logs for incoming webhook requests
4. Ensure your server returns 200 status

### Signature Verification Failures
1. Verify PAYSTACK_SECRET_KEY is correct in `.env.local`
2. Check if the signature header is being sent correctly
3. Ensure the raw body is being used for signature validation

### Payment Not Updating
1. Check Supabase payments table for new records
2. Verify payment reference matches
3. Check webhook logs for errors
4. Ensure RLS policies allow service role updates

## Production Deployment Checklist

- [ ] Update NEXT_PUBLIC_APP_URL to production domain
- [ ] Replace test keys with live Paystack keys
- [ ] Update webhook URL to production domain
- [ ] Test live payment flow
- [ ] Verify webhook receives live events
- [ ] Check email notifications are sent
- [ ] Monitor payment verification in admin panel
- [ ] Set up monitoring for webhook failures

## Environment Variables

Ensure these are set in your production environment:

```env
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Monitoring

Consider setting up monitoring for:
- Webhook delivery failures
- Payment verification failures
- Email notification failures
- Unusual payment patterns

This will help you quickly identify and resolve any issues with the payment flow.
