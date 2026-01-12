#!/bin/bash

echo "🔷 Stripe Local Testing Script"
echo "=============================="
echo ""

# Check if Stripe CLI is logged in
echo "1️⃣  Checking Stripe CLI login status..."
if ! stripe config --list &> /dev/null; then
    echo "❌ Not logged in to Stripe CLI"
    echo "   Please run: stripe login"
    exit 1
fi
echo "✅ Logged in to Stripe CLI"
echo ""

# Check if dev server is running
echo "2️⃣  Checking if dev server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Dev server not running at localhost:3000"
    echo "   Please run: npm run dev"
    echo ""
    read -p "   Start dev server now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Starting dev server in background..."
        npm run dev > /tmp/nextjs-dev.log 2>&1 &
        DEV_PID=$!
        echo "   Dev server PID: $DEV_PID"
        echo "   Waiting for server to start..."
        sleep 5

        if curl -s http://localhost:3000 > /dev/null; then
            echo "✅ Dev server started successfully"
        else
            echo "❌ Failed to start dev server. Check /tmp/nextjs-dev.log for errors"
            exit 1
        fi
    else
        exit 1
    fi
else
    echo "✅ Dev server is running"
fi
echo ""

# Start webhook listener
echo "3️⃣  Starting Stripe webhook listener..."
echo "   This will forward webhooks to http://localhost:3000/api/stripe/webhook"
echo ""
echo "⚠️  IMPORTANT: Copy the webhook signing secret and add it to .env.local"
echo "   It will look like: STRIPE_WEBHOOK_SECRET=whsec_xxxxx"
echo ""
echo "   Press Ctrl+C to stop the listener when done testing"
echo ""
sleep 2

stripe listen --forward-to localhost:3000/api/stripe/webhook
