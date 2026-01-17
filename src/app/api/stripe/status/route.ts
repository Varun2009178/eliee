import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-01-27.acacia" as any, // Use standard or latest if unsure, matching generic
        });

        const customers = await stripe.customers.list({
            email: session.user.email,
            limit: 1,
            expand: ['data.subscriptions']
        });

        if (customers.data.length === 0) {
            return NextResponse.json({ isPro: false, renewalDate: null });
        }

        const customer = customers.data[0];
        // Find active subscription
        const sub = customer.subscriptions?.data.find(s => s.status === 'active' || s.status === 'trialing');

        return NextResponse.json({
            isPro: !!sub,
            renewalDate: sub ? new Date((sub as any).current_period_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: (sub as any)?.cancel_at_period_end,
            customerId: customer.id
        });
    } catch (error: any) {
        console.error("Stripe status error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
