import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-01-27.acacia" as any,
        });

        // Find customer
        const customers = await stripe.customers.list({
            email: session.user.email,
            limit: 1
        });

        if (customers.data.length === 0) {
            return NextResponse.json({ error: "No customer found" }, { status: 404 });
        }

        const customer = customers.data[0];
        const returnUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/settings`
            : `${req.nextUrl.origin}/settings`;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customer.id,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Create portal error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
