"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Check, X, FileText, Zap, Brain, Wand2, Eye } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import posthog from "posthog-js";

export default function PricingPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Check Pro status on load
  useEffect(() => {
    if (session) {
      fetch("/api/stripe/status")
        .then((res) => res.json())
        .then((data) => {
          setIsPro(data.isPro || false);
          setLoadingStatus(false);
        })
        .catch(() => {
          setLoadingStatus(false);
        });
    } else {
      setLoadingStatus(false);
    }
  }, [session]);

  const handleUpgrade = async () => {
    if (!session) {
      posthog.capture("checkout_started", {
        plan: "pro",
        price: 999, // cents
        is_authenticated: false,
      });
      window.location.href = "/auth";
      return;
    }

    // Track checkout start
    posthog.capture("checkout_started", {
      plan: "pro",
      price: 999, // cents
      is_authenticated: true,
      user_id: session.user.id,
    });

    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. Please try again.");
        posthog.capture("checkout_failed", {
          reason: "no_checkout_url",
        });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Please try again.");
      posthog.captureException(err);
    } finally {
      setIsLoading(false);
    }
  };

  const freeFeatures = [
    { text: "3 documents", icon: FileText, included: true },
    { text: "Unlimited visualizations", icon: Eye, included: true },
    { text: "Basic AI (free models)", icon: Zap, included: true },
    { text: "AI actions (verify, synonyms, etc.)", icon: Wand2, included: true },
    { text: "Export to PDF", icon: Check, included: true },
  ];

  const proFeatures = [
    { text: "Unlimited documents", icon: FileText, included: true, highlight: true },
    { text: "Unlimited visualizations", icon: Eye, included: true },
    { text: "150 high-quality prompts/mo (Claude + GPT-5)", icon: Zap, included: true, highlight: true },
    { text: "Claude + GPT-5 for chat", icon: Brain, included: true, highlight: true },
    { text: "Unlimited AI actions", icon: Check, included: true, description: "Verify, synonyms, expand, simplify - all free" },
    { text: "Graph-aware AI", icon: Check, included: true },
    { text: "Priority support", icon: Check, included: true },
  ];

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <nav className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-[#f5f3ef]/80 backdrop-blur-md border-b border-black/[0.04] z-10">
        <a href="/" className="flex items-center gap-2">
          <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-md" />
          <span className="font-medium text-black/80 text-sm tracking-tight">Eliee</span>
        </a>
        <a href="/" className="text-sm text-black/50 hover:text-black transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Back
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="text-center mb-12">
          <h1
            className="text-3xl md:text-4xl text-black/90 mb-4"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            Think better, write clearer
          </h1>
          <p className="text-base text-black/50 max-w-md mx-auto">
            Start free with 3 documents. Upgrade for unlimited docs and premium AI.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-black/80">Free</h2>
              <p className="text-sm text-black/40 mt-1">Perfect for trying Eliee</p>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-bold text-black">$0</span>
              <span className="text-black/40 text-base ml-1">/forever</span>
            </div>

            <ul className="space-y-4 mb-8">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-black/60">
                  <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                    <feature.icon size={12} className="text-black/40" />
                  </div>
                  {feature.text}
                </li>
              ))}
            </ul>

            <a
              href="/auth?mode=signup"
              className="block w-full py-3 rounded-xl border border-black/10 text-black/60 font-medium text-sm text-center hover:bg-black/[0.02] transition-colors"
            >
              Get started free
            </a>
          </div>

          {/* Pro */}
          <div className="bg-gradient-to-br from-black to-black/90 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/15 to-transparent rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-400/10 to-transparent rounded-full blur-xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-xl font-semibold text-white">Pro</h2>
                <span className="px-2 py-0.5 bg-blue-600/20 border border-blue-500/20 text-blue-100 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Popular
                </span>
              </div>

              <div className="mb-8">
                <span className="text-4xl font-bold text-white">$9.99</span>
                <span className="text-white/50 text-base ml-1">/month</span>
              </div>

              <ul className="space-y-4 mb-8">
                {proFeatures.map((feature, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm ${feature.highlight ? 'text-white' : 'text-white/70'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feature.highlight ? 'bg-blue-600' : 'bg-white/10'}`}>
                      <Check size={12} className="text-white" />
                    </div>
                    {feature.text}
                    {feature.highlight && (
                      <span className="ml-auto text-[10px] text-blue-200 font-medium">NEW</span>
                    )}
                  </li>
                ))}
              </ul>

              {loadingStatus ? (
                <div className="w-full py-3 rounded-xl bg-white/10 text-white/50 font-medium text-sm text-center">
                  Checking status...
                </div>
              ) : isPro ? (
                <div className="space-y-3">
                  <div className="w-full py-3 rounded-xl bg-emerald-500 text-white font-medium text-sm text-center flex items-center justify-center gap-2">
                    <Check size={16} />
                    You're on Pro
                  </div>
                  <a
                    href="/app"
                    className="block w-full py-2.5 rounded-xl border border-white/20 text-white/70 text-sm text-center hover:bg-white/5 transition-colors"
                  >
                    Go to app →
                  </a>
                </div>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Upgrade to Pro"
                  )}
                </button>
              )}

              <p className="text-xs text-white/30 text-center mt-3">
                Cancel anytime
              </p>
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold text-black/80 mb-6 text-center">Compare plans</h2>
          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/[0.06]">
                  <th className="text-left p-4 text-sm font-medium text-black/40">Feature</th>
                  <th className="text-center p-4 text-sm font-medium text-black/60">Free</th>
                  <th className="text-center p-4 text-sm font-medium text-black/80 bg-black/[0.02]">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-black/[0.04]">
                  <td className="p-4 text-black/60">Documents</td>
                  <td className="p-4 text-center text-black/50">3</td>
                  <td className="p-4 text-center font-medium text-black/80 bg-black/[0.02]">Unlimited</td>
                </tr>
                <tr className="border-b border-black/[0.04]">
                  <td className="p-4 text-black/60">Visualizations</td>
                  <td className="p-4 text-center text-black/50">Unlimited</td>
                  <td className="p-4 text-center font-medium text-black/80 bg-black/[0.02]">Unlimited</td>
                </tr>
                <tr className="border-b border-black/[0.04]">
                  <td className="p-4 text-black/60">Chat AI Model</td>
                  <td className="p-4 text-center text-black/50">Free models</td>
                  <td className="p-4 text-center font-medium text-black/80 bg-black/[0.02]">150 Claude/GPT-5, then free</td>
                </tr>
                <tr className="border-b border-black/[0.04]">
                  <td className="p-4 text-black/60">AI Actions (verify, synonyms, etc.)</td>
                  <td className="p-4 text-center text-black/50">Unlimited (free models)</td>
                  <td className="p-4 text-center font-medium text-black/80 bg-black/[0.02]">Unlimited (free models)</td>
                </tr>
                <tr className="border-b border-black/[0.04]">
                  <td className="p-4 text-black/60">Graph-aware AI</td>
                  <td className="p-4 text-center"><X size={14} className="inline text-black/20" /></td>
                  <td className="p-4 text-center bg-black/[0.02]"><Check size={14} className="inline text-emerald-500" /></td>
                </tr>
                <tr>
                  <td className="p-4 text-black/60">Priority support</td>
                  <td className="p-4 text-center"><X size={14} className="inline text-black/20" /></td>
                  <td className="p-4 text-center bg-black/[0.02]"><Check size={14} className="inline text-emerald-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-lg font-semibold text-black/80 mb-6 text-center">Questions</h2>
          <div className="space-y-3">
            <div className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-sm">
              <h3 className="text-sm text-black/70 font-medium mb-2">What happens when I hit the document limit?</h3>
              <p className="text-sm text-black/40">You can still view and edit your existing 3 documents, but you'll need Pro to create more. Upgrade anytime to unlock unlimited documents.</p>
            </div>
            <div className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-sm">
              <h3 className="text-sm text-black/70 font-medium mb-2">What's the difference between free and premium AI?</h3>
              <p className="text-sm text-black/40">Pro gives you 150 high-quality chat prompts/month with Claude and GPT-5 (and more). After that, chat continues with free models. All other AI actions (verify, synonyms, expand, simplify) are always unlimited and use free models for everyone. Your 150 high-quality prompts reset monthly.</p>
            </div>
            <div className="bg-white rounded-xl border border-black/[0.06] p-5 shadow-sm">
              <h3 className="text-sm text-black/70 font-medium mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-black/40">Yes, one click in settings. You'll keep Pro until the end of your billing period.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-4 border-t border-black/[0.04] bg-[#e8e4dc]">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-black/30">
          <p>© 2026 Eliee</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-black/50 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-black/50 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
