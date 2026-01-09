"use client";

import { useState } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { useSession } from "@/lib/auth-client";

export default function PricingPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!session) {
      window.location.href = "/auth";
      return;
    }

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
      }
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <nav className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-[#f5f3ef]/80 backdrop-blur-md border-b border-black/[0.04]">
        <a href="/" className="flex items-center gap-2">
          <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-md" />
          <span className="font-medium text-black/80 text-sm tracking-tight">Eliee</span>
        </a>
        <a href="/" className="text-sm text-black/50 hover:text-black transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Back
        </a>
      </nav>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <h1 
            className="text-4xl md:text-5xl font-medium text-black tracking-tight mb-4" 
            style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}
          >
            Simple pricing
          </h1>
          <p className="text-lg text-black/40 max-w-md mx-auto leading-relaxed">
            Start free, upgrade when you're ready.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-3xl border border-black/[0.06] p-8 flex flex-col">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-black mb-2">Free</h2>
              <p className="text-sm text-black/40">Perfect for getting started</p>
            </div>
            
            <div className="mb-8">
              <span className="text-5xl font-bold text-black">$0</span>
              <span className="text-black/40 ml-1">/month</span>
            </div>
            
            <ul className="space-y-4 mb-10 flex-grow">
              {[
                "3 documents",
                "5 visualizations per day",
                "Basic AI analysis",
                "PDF export"
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-black/70">
                  <Check size={18} className="text-black/30 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <a 
              href="/auth" 
              className="w-full py-4 rounded-2xl border border-black/10 text-black/70 font-semibold text-center hover:bg-black/[0.02] hover:border-black/20 transition-all"
            >
              Get started free
            </a>
          </div>

          {/* Pro Plan */}
          <div className="relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black text-white text-xs font-semibold rounded-full flex items-center gap-1.5">
              <Sparkles size={12} />
              Recommended
            </div>
            <div className="bg-black text-white rounded-3xl p-8 flex flex-col h-full">
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Pro</h2>
                <p className="text-sm text-white/50">For serious thinkers</p>
              </div>
              
              <div className="mb-8">
                <span className="text-5xl font-bold">$8.99</span>
                <span className="text-white/50 ml-1">/month</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-grow">
                {[
                  "Unlimited documents",
                  "Unlimited visualizations",
                  "Advanced AI analysis",
                  "Gap detection & suggestions",
                  "Export to PDF, PNG, SVG",
                  "Priority support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-white/80">
                    <Check size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button 
                onClick={handleUpgrade}
                disabled={isLoading}
                className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-center hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              
              <p className="text-center text-xs text-white/40 mt-4">
                14-day money-back guarantee
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="text-2xl font-semibold text-black text-center mb-12">Questions?</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
              <h3 className="font-semibold text-black mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-black/50 leading-relaxed">
                Yes, cancel with one click. No questions asked. Your data stays safe.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
              <h3 className="font-semibold text-black mb-2">What payment methods?</h3>
              <p className="text-sm text-black/50 leading-relaxed">
                All major credit cards via Stripe. Secure and encrypted.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
              <h3 className="font-semibold text-black mb-2">What if I need help?</h3>
              <p className="text-sm text-black/50 leading-relaxed">
                Pro users get priority email support. We typically respond within hours.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
              <h3 className="font-semibold text-black mb-2">Is there a refund policy?</h3>
              <p className="text-sm text-black/50 leading-relaxed">
                14-day money-back guarantee if Eliee doesn't work for you.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 px-4 md:px-6 border-t border-black/[0.04]">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-black/30">
          <p>© 2026 Eliee</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-black transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-black transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
