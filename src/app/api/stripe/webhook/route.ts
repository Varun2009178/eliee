import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserProStatus } from "@/lib/db";
import { getPostHogClient } from "@/lib/posthog-server";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.mode === "subscription") {
          // User successfully subscribed - set pro status
          await updateUserProStatus(userId, true);
          console.log(`User ${userId} upgraded to Pro`);

          // Track subscription completion in PostHog
          const posthog = getPostHogClient();
          posthog.capture({
            distinctId: userId,
            event: "subscription_completed",
            properties: {
              plan: "pro",
              price: session.amount_total,
              currency: session.currency,
              subscription_id: session.subscription,
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Check if subscription is active
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          await updateUserProStatus(userId, isActive);
          console.log(`User ${userId} subscription updated: ${isActive ? "active" : "inactive"}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Subscription cancelled - revoke pro status
          await updateUserProStatus(userId, false);
          console.log(`User ${userId} subscription cancelled`);

          // Track subscription cancellation in PostHog
          const posthog = getPostHogClient();
          posthog.capture({
            distinctId: userId,
            event: "subscription_cancelled",
            properties: {
              plan: "pro",
              subscription_id: subscription.id,
              cancelled_at: subscription.canceled_at,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
