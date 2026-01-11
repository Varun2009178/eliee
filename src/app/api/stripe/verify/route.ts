import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { updateUserProStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2025-12-15.clover",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const stripe = getStripe();

    // Search for any active subscriptions with this user ID in metadata
    const subscriptions = await stripe.subscriptions.search({
      query: `status:'active' AND metadata['userId']:'${userId}'`,
    });

    if (subscriptions.data.length > 0) {
      // User has an active subscription - mark as Pro
      await updateUserProStatus(userId, true);
      console.log(`Verified and marked user ${userId} as Pro`);
      return NextResponse.json({
        isPro: true,
        message: "Subscription verified",
        subscriptionId: subscriptions.data[0].id
      });
    }

    // Also check checkout sessions in case subscription hasn't been created yet
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    // Find a recent completed session for this user
    const userSession = sessions.data.find(
      (s) => s.metadata?.userId === userId &&
             s.payment_status === "paid" &&
             s.mode === "subscription"
    );

    if (userSession) {
      // Payment was successful - mark as Pro
      await updateUserProStatus(userId, true);
      console.log(`Verified via checkout session and marked user ${userId} as Pro`);
      return NextResponse.json({
        isPro: true,
        message: "Payment verified via checkout session"
      });
    }

    return NextResponse.json({
      isPro: false,
      message: "No active subscription found"
    });
  } catch (error: any) {
    console.error("Stripe verify error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify subscription" },
      { status: 500 }
    );
  }
}
