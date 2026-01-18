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

        let customerId: string | null = null;

        // Method 1: Find subscription by userId in metadata (most reliable)
        try {
            const subscriptions = await stripe.subscriptions.search({
                query: `status:'active' AND metadata['userId']:'${session.user.id}'`,
            });

            if (subscriptions.data.length > 0) {
                customerId = subscriptions.data[0].customer as string;
            }
        } catch (searchError) {
            console.log("Subscription search failed, trying email lookup:", searchError);
        }

        // Method 2: Fallback to finding customer by email
        if (!customerId) {
            const customers = await stripe.customers.list({
                email: session.user.email,
                limit: 1
            });

            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
            }
        }

        // Method 3: Search all subscriptions and match by email
        if (!customerId) {
            try {
                const allActiveSubs = await stripe.subscriptions.list({
                    status: 'active',
                    limit: 100,
                    expand: ['data.customer']
                });

                for (const sub of allActiveSubs.data) {
                    const customer = sub.customer as Stripe.Customer;
                    if (customer.email === session.user.email) {
                        customerId = customer.id;
                        break;
                    }
                }
            } catch (listError) {
                console.log("Subscription list failed:", listError);
            }
        }

        if (!customerId) {
            return NextResponse.json({ error: "No customer found" }, { status: 404 });
        }

        const returnUrl = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/settings`
            : `${req.nextUrl.origin}/settings`;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error: any) {
        console.error("Create portal error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
