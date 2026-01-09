# Database Migration for Focus Assistant Pro Features

## Overview
This migration adds Pro subscription support to the Focus Assistant feature. Users will have per-account usage limits that persist across sessions, and Pro users will have unlimited access.

## Required Changes

### 1. Update `user_usage` Table Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Add is_pro column to user_usage table
ALTER TABLE user_usage
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_usage_is_pro ON user_usage(is_pro);
```

### 2. Set up Stripe Webhook

1. Go to your Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select these events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Add it to your `.env.local` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Environment Variables

Make sure you have these in your `.env.local`:

```bash
# Existing Stripe variables
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# New webhook secret (from step 2)
STRIPE_WEBHOOK_SECRET=whsec_...

# App URL for redirects
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## How It Works

### Usage Tracking
- **Free Users**: Limited to the number specified in `FREE_LIMITS`:
  - `fact_check`: 3 uses
  - `synonyms`: 1 use
  - `expand`: 1 use
  - `simplify`: 1 use
  - `improve`: 1 use
  - `chat`: 3 uses

- **Pro Users**: Unlimited usage for all actions

### Usage Persistence
- Usage is tracked per user account in the `user_usage` table
- Usage persists across browser sessions and devices
- **Important**: Usage does NOT reset - users must upgrade to Pro for unlimited access
- Signing out and back in will NOT reset usage limits

### Pro Subscription Flow
1. User reaches their free tier limit
2. Pro modal appears with upgrade options
3. User clicks "View Pricing" → redirected to pricing page
4. User completes Stripe checkout
5. Webhook receives `checkout.session.completed` event
6. Database updated with `is_pro = true`
7. User redirected back to `/app?upgraded=true`
8. App reloads user's Pro status

### Subscription Management
- Active subscriptions: `is_pro = true`
- Cancelled subscriptions: `is_pro = false` (via webhook)
- Subscription updates: Status synced automatically via webhooks

## Testing

### Test Free Tier Limits
1. Create a new account
2. Use each Focus Assistant action
3. Verify limits are enforced
4. Check that Pro modal appears when limit reached

### Test Pro Upgrade
1. Use Stripe test mode with test card: `4242 4242 4242 4242`
2. Complete checkout
3. Verify webhook is received (check Stripe dashboard)
4. Verify `is_pro` is set to `true` in database
5. Verify unlimited usage is enabled

### Test Subscription Cancellation
1. Cancel subscription in Stripe dashboard
2. Verify webhook is received
3. Verify `is_pro` is set to `false` in database
4. Verify usage limits are re-enforced

## Performance Optimizations

The following optimizations have been implemented:

1. **Memoized Functions**: `isActionAllowed`, `getRemainingUses`, `handleFocusAction`, `handleFocusChatSubmit`
2. **Memoized Data**: Action buttons array to prevent re-renders
3. **RAF for Scrolling**: Uses `requestAnimationFrame` for smoother chat scrolling
4. **Optimized Renders**: Pro status and usage checks are memoized to prevent unnecessary re-renders

## Rollback

If you need to rollback:

```sql
-- Remove is_pro column
ALTER TABLE user_usage DROP COLUMN IF EXISTS is_pro;

-- Remove index
DROP INDEX IF EXISTS idx_user_usage_is_pro;
```

## Support

If users encounter issues:
1. Check Stripe webhook logs for delivery failures
2. Verify `user_usage` table has correct `is_pro` value
3. Check browser console for any errors
4. Verify environment variables are set correctly
