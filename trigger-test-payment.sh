#!/bin/bash

echo "🧪 Triggering Test Payment Event"
echo "================================"
echo ""

# Get user ID from the user (they need to provide their actual user ID from Supabase)
echo "Enter your user ID from Supabase (found in the auth.users table):"
read USER_ID

if [ -z "$USER_ID" ]; then
    echo "❌ User ID required"
    exit 1
fi

echo ""
echo "Triggering checkout.session.completed event..."
echo "User ID: $USER_ID"
echo ""

# Trigger the event with user metadata
stripe trigger checkout.session.completed --override metadata.userId=$USER_ID

echo ""
echo "✅ Event triggered!"
echo ""
echo "Check:"
echo "1. Terminal running 'stripe listen' should show the webhook event"
echo "2. Your app console should show 'User $USER_ID upgraded to Pro'"
echo "3. Visit http://localhost:3000/app?upgraded=true to see the success modal"
echo ""
