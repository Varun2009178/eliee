"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Trash2,
  LogOut,
  AlertTriangle,
  Check,
  Loader2
} from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [billingInfo, setBillingInfo] = useState<{ isPro: boolean; renewalDate: string | null; cancelAtPeriodEnd: boolean } | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    if (session) {
      fetch("/api/stripe/status")
        .then((res) => res.json())
        .then((data) => {
          setBillingInfo(data);
          setLoadingBilling(false);
        })
        .catch((err) => {
          console.error("Failed to load billing info:", err);
          setLoadingBilling(false);
        });
    }
  }, [session]);

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/create-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Failed to create portal session:", e);
    }
  };

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth");
    }
  }, [session, isPending, router]);

  const handleSignOut = async () => {
    // Capture sign out event and reset PostHog
    posthog.capture("sign_out_completed");
    posthog.reset();

    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    
    setIsDeleting(true);
    try {
      // Delete user's documents first
      // Then delete the account via Better Auth
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
      });
      
      if (response.ok) {
        await signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/");
            },
          },
        });
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isPending || !session) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
          <p className="text-sm text-black/40">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/app" 
            className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors text-sm mb-6"
          >
            <ArrowLeft size={16} />
            Back to app
          </Link>
          <h1 className="text-2xl font-semibold text-black/80">Settings</h1>
          <p className="text-sm text-black/40 mt-1">Manage your account and preferences</p>
        </div>

        {/* Profile Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-black/60 uppercase tracking-wider mb-4">Profile</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-[#fafafa] rounded-xl">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center">
                <User className="w-5 h-5 text-black/40" />
              </div>
              <div>
                <p className="font-medium text-black/80">{session.user.name || "User"}</p>
                <p className="text-sm text-black/40 flex items-center gap-2">
                  <Mail size={12} />
                  {session.user.email}
                </p>
              </div>
              {session.user.emailVerified && (
                <div className="ml-auto flex items-center gap-1 text-emerald-600 text-xs">
                  <Check size={12} />
                  Verified
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Subscription Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-black/60 uppercase tracking-wider mb-4">Subscription</h2>
          
          {loadingBilling ? (
            <div className="flex items-center gap-2 text-black/40 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading subscription details...
            </div>
          ) : billingInfo?.isPro ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#fafafa] rounded-xl border border-black/[0.04]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-black/80">Pro Plan</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">Active</span>
                  </div>
                  {billingInfo.renewalDate && (
                    <p className="text-sm text-black/50">
                      {billingInfo.cancelAtPeriodEnd ? "Expires" : "Renews"} on {new Date(billingInfo.renewalDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
              
              <button
                onClick={handleManageSubscription}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-black text-white hover:bg-black/80 transition-all font-medium text-sm"
              >
                Manage Subscription / Cancel
              </button>
              <p className="text-xs text-center text-black/30">
                Update payment method, view invoices, or cancel subscription via Stripe safe portal.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="p-4 bg-[#fafafa] rounded-xl border border-black/[0.04] text-center">
                 <p className="font-medium text-black/80 mb-1">Free Plan</p>
                 <p className="text-sm text-black/50">You are currently on the free tier.</p>
               </div>
               <Link
                 href="/pricing"
                 className="block w-full text-center px-4 py-3 rounded-xl bg-black text-white hover:bg-black/90 transition-all font-medium text-sm"
               >
                 Upgrade to Pro
               </Link>
            </div>
          )}
        </motion.div>

        {/* Sign Out */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-black/[0.06] p-6 mb-6"
        >
          <h2 className="text-sm font-semibold text-black/60 uppercase tracking-wider mb-4">Session</h2>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-black/10 text-black/60 hover:bg-black/[0.02] hover:border-black/20 transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-rose-100 p-6"
        >
          <h2 className="text-sm font-semibold text-rose-500/80 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle size={14} />
            Danger Zone
          </h2>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
            >
              <Trash2 size={16} />
              Delete Account
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-black/60">
                This will permanently delete your account and all your documents. Type <strong>DELETE</strong> to confirm.
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-black/80 placeholder:text-rose-300 focus:outline-none focus:border-rose-300"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteInput("");
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-black/10 text-black/60 hover:bg-black/[0.02] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== "DELETE" || isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Forever
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-black/30">
            <Link href="/terms" className="hover:text-black/50 transition-colors">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-black/50 transition-colors">Privacy</Link>
            {" · "}
            <Link href="/pricing" className="hover:text-black/50 transition-colors">Pricing</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

