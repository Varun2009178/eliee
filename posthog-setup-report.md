# PostHog Post-Wizard Report

The wizard has completed a deep integration of PostHog analytics into your Eliee Next.js application. This integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js 15.3+ pattern)
- **Server-side PostHog client** for API routes and webhooks
- **Reverse proxy configuration** in `next.config.ts` to avoid ad blockers
- **User identification** on sign-up and sign-in
- **Event tracking** across authentication, document management, AI features, and payments

## Events Instrumented

| Event Name | Description | File(s) |
|------------|-------------|---------|
| `user_signed_up` | User successfully creates a new account | `src/app/auth/page.tsx` |
| `user_signed_in` | User successfully logs into their account | `src/app/auth/page.tsx` |
| `user_signed_out` | User signs out of their account | `src/app/settings/page.tsx` |
| `account_deleted` | User permanently deletes their account | `src/app/settings/page.tsx` |
| `document_created` | User creates a new document (visualization or AI native) | `src/app/app/page.tsx` |
| `document_deleted` | User deletes an existing document | `src/app/app/page.tsx` |
| `document_exported` | User exports document to PDF | `src/app/app/page.tsx` |
| `visualization_generated` | User generates a visualization from their document | `src/app/app/page.tsx` |
| `ai_assist_action_used` | User uses an AI assist action (verify, paraphrase, synonyms, etc.) | `src/app/app/page.tsx` |
| `focus_mode_toggled` | User toggles Focus Mode on or off | `src/app/app/page.tsx` |
| `demo_action_clicked` | User clicks a demo action on the landing page | `src/app/page.tsx` |
| `checkout_started` | User initiates Stripe checkout for Pro subscription | `src/app/pricing/page.tsx` |
| `subscription_activated` | User's Pro subscription is activated via Stripe webhook | `src/app/api/stripe/webhook/route.ts` |
| `subscription_cancelled` | User's Pro subscription is cancelled via Stripe webhook | `src/app/api/stripe/webhook/route.ts` |

## Files Created/Modified

### Created
- `instrumentation-client.ts` - Client-side PostHog initialization
- `src/lib/posthog-server.ts` - Server-side PostHog client for API routes
- `.posthog-events.json` - Event definitions (temporary, now removed)

### Modified
- `next.config.ts` - Added rewrites for reverse proxy
- `.env` - Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`
- `src/app/auth/page.tsx` - Added user identification and auth events
- `src/app/settings/page.tsx` - Added sign out and account deletion events
- `src/app/pricing/page.tsx` - Added checkout started event
- `src/app/page.tsx` - Added demo action click event
- `src/app/app/page.tsx` - Added document and AI feature events
- `src/app/api/stripe/webhook/route.ts` - Added subscription lifecycle events

## Next Steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/292081/dashboard/1074005) - Core analytics dashboard with key metrics

### Insights
- [User Sign-ups & Sign-ins (30 days)](https://us.posthog.com/project/292081/insights/0cwDBoUr) - Track new user registrations and logins over time
- [Sign-up to Document Funnel](https://us.posthog.com/project/292081/insights/X2DbpuPg) - Conversion funnel from sign-up to first document creation
- [Checkout to Subscription Funnel](https://us.posthog.com/project/292081/insights/oBSTL0T2) - Conversion funnel from checkout to subscription activation
- [AI Feature Usage](https://us.posthog.com/project/292081/insights/dFHxtjLL) - Track usage of AI assist actions by type
- [Churn Events](https://us.posthog.com/project/292081/insights/hOyQ5zI7) - Monitor subscription cancellations and account deletions

### Agent Skill

We've left an agent skill folder in your project at `.claude/skills/nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

## Environment Variables

Make sure the following environment variables are set in production:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_o1Xy7brtHSKDWllM08VCb4IaDhIQfx6XvZZ1hyyw0jB
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```
