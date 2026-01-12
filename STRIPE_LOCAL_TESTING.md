# Stripe Local Testing Guide

## Prerequisites
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - macOS: `brew install stripe/stripe-cli/stripe`
   - Or download from: https://github.com/stripe/stripe-cli/releases

## Setup Steps

### 1. Login to Stripe CLI
```bash
stripe login
```
This will open your browser to authorize the CLI.

### 2. Start your local development server
```bash
npm run dev
# Server should be running at http://localhost:3000
```

### 3. Forward webhooks to your local server
In a new terminal window:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**IMPORTANT**: Copy the webhook signing secret that appears (starts with `whsec_`).
It will look like: `whsec_xxxxxxxxxxxxxxxxxxxxx`

### 4. Update your .env.local file
Add or update the webhook secret:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

Restart your dev server after updating the env file.

### 5. Test the payment flow

#### Option A: Use Stripe test cards
1. Go to http://localhost:3000/pricing
2. Click "Upgrade to Pro"
3. Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

#### Option B: Trigger webhook events manually
```bash
# Simulate a successful checkout
stripe trigger checkout.session.completed
```

### 6. Monitor webhook events
The terminal running `stripe listen` will show all webhook events in real-time.

## Verify the flow

After a successful test payment:
1. Check console logs for "User {userId} upgraded to Pro"
2. You should be redirected to `/app?upgraded=true`
3. Success modal should appear
4. Pro badge should appear in sidebar
5. All upgrade buttons should disappear

## Troubleshooting

### Webhook not working
- Make sure `stripe listen` is running
- Check that `STRIPE_WEBHOOK_SECRET` matches the one from `stripe listen`
- Restart dev server after changing env vars

### Payment not completing
- Check Stripe CLI output for errors
- Check browser console for errors
- Check terminal running `npm run dev` for API errors

### Database not updating
- Check Supabase connection
- Verify `user_usage` table exists
- Check RLS policies allow updates

## Test checklist
- [ ] Stripe CLI installed and logged in
- [ ] Webhook secret added to .env.local
- [ ] Dev server running at localhost:3000
- [ ] `stripe listen` forwarding to localhost:3000/api/stripe/webhook
- [ ] Test payment completes successfully
- [ ] Webhook processes and updates database
- [ ] Success modal shows with correct info
- [ ] Pro features unlock immediately
- [ ] No upgrade buttons visible after payment
