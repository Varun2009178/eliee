"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Eye,
  Target,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutPanelLeft,
  User,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Zap,
  MessageSquare,
  Check
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import posthog from "posthog-js";

// --- Landing Page Component ---
function LandingPage() {
  const { data: session } = useSession();

  // Demo prompts that users can swipe through
  const demoPrompts = [
    "We should expand into the enterprise market this quarter.",
    "Our product needs better onboarding to reduce churn.",
    "I believe remote work increases productivity for most teams.",
    "The main risk is running out of runway before finding PMF.",
  ];

  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"text" | "icons">("text");

  const demoText = demoPrompts[currentPromptIndex];

  const handleGetStarted = () => {
    posthog.capture("cta_clicked", {
      button_location: "nav",
      button_text: session ? "Go to App" : "Get started",
      is_authenticated: !!session,
    });
    window.location.href = session ? "/app" : "/auth";
  };

  const nextPrompt = () => {
    setCurrentPromptIndex((prev) => (prev + 1) % demoPrompts.length);
    setAiResult(null);
    setSelectedAction(null);
  };

  const prevPrompt = () => {
    setCurrentPromptIndex((prev) => (prev - 1 + demoPrompts.length) % demoPrompts.length);
    setAiResult(null);
    setSelectedAction(null);
  };

  // Map demo actions to API actions
  const actionMap: Record<string, string> = {
    paraphrase: "paraphrase_preserve",
    synonyms: "find_similes",
    simplify: "simplify",
    expand: "expand",
    counter: "counterargument",
  };

  const handleDemoAction = async (action: string) => {
    if (!demoText.trim()) return;

    // Track demo action usage
    posthog.capture("demo_action_used", {
      action_type: action,
      prompt_index: currentPromptIndex,
      prompt_text: demoText.substring(0, 100), // First 100 chars
    });

    setSelectedAction(action);
    setIsProcessing(true);
    setAiResult(null);

    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionMap[action] || action,
          text: demoText,
          model: "fast",
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let result = data.result || "";
      result = result
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .trim();

      setAiResult(result);
    } catch (err) {
      setAiResult("Something went wrong. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const demoActions = [
    { id: "paraphrase", label: "Paraphrase", icon: FileText, color: "bg-blue-50 text-blue-600" },
    { id: "synonyms", label: "Synonyms", icon: Eye, color: "bg-purple-50 text-purple-600" },
    { id: "simplify", label: "Simplify", icon: LayoutPanelLeft, color: "bg-green-50 text-green-600" },
    { id: "expand", label: "Expand", icon: Target, color: "bg-amber-50 text-amber-600" },
    { id: "counter", label: "Counter", icon: Lightbulb, color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F4] relative overflow-x-hidden">
      {/* Ambient glow effects - Monochrome/Silver style */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Top left subtle glow */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-radial from-black/[0.03] via-black/[0.01] to-transparent rounded-full blur-3xl" />
        {/* Top right subtle glow */}
        <div className="absolute -top-20 -right-40 w-[500px] h-[500px] bg-gradient-radial from-black/[0.02] via-black/[0.01] to-transparent rounded-full blur-3xl" />
        {/* Bottom left accent */}
        <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] bg-gradient-radial from-black/[0.02] via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Nav - Cursor.sh style */}
      <nav className="h-16 flex items-center justify-between px-6 md:px-8 relative z-50 sticky top-0 bg-[#F7F7F4]/80 backdrop-blur-xl border-b border-black/[0.04]">
        <a href="/" className="flex items-center gap-2.5 group">
          <img src="/eliee_logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg shadow-sm" />
          <span className="font-semibold text-[#1a1a1a] text-[15px] tracking-tight">Eliee</span>
        </a>
        <div className="flex items-center gap-2 md:gap-6">
          <a href="#features" className="text-[14px] text-[#666] hover:text-[#1a1a1a] transition-colors hidden md:block px-3 py-1.5">Features</a>
          <a href="#how" className="text-[14px] text-[#666] hover:text-[#1a1a1a] transition-colors hidden md:block px-3 py-1.5">How it Works</a>
              
          {session ? (
            <a 
              href="/app"
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium hover:bg-[#333] transition-all shadow-lg shadow-black/10"
            >
              Go to App
              <ArrowRight size={14} />
            </a>
          ) : (
            <>
              <a href="/auth" className="text-[14px] text-[#666] hover:text-[#1a1a1a] transition-colors px-3 py-1.5">Sign in</a>
              <a 
                href="/get-started" 
                className="px-5 py-2 rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium hover:bg-[#333] transition-all shadow-lg shadow-black/10"
              >
                Get started
              </a>
            </>
          )}
        </div>
      </nav>

      {/* Hero - Cursor.sh inspired */}
      <section className="flex flex-col items-center relative pt-24 md:pt-32 pb-20 px-4">
        {/* Animated headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-6"
        >
          <h1 className="text-[2rem] md:text-[3rem] lg:text-[3.75rem] leading-[1.1] tracking-[-0.03em] text-[#1a1a1a] font-medium max-w-4xl">
            Productive writing has never
            <br className="hidden md:block" />
            <span className="md:hidden"> </span>
            been easier with{" "}
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
            >
              <span className="font-semibold text-[#1a1a1a]">
                Eliee
              </span>
            </motion.span>
            <span className="text-[#1a1a1a]">.</span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-[#666] text-base md:text-lg max-w-xl text-center mb-10 leading-relaxed"
        >
          AI-powered writing tools that help you write clearer, faster, and with more confidence.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex items-center gap-4 mb-16"
        >
          <a
            href="/get-started"
            className="px-6 py-3 rounded-full bg-[#1a1a1a] text-white text-[14px] font-medium hover:bg-[#333] transition-all shadow-xl shadow-black/15 flex items-center gap-2"
          >
            Start writing free
            <ArrowRight size={16} />
          </a>
          <a
            href="#features"
            className="px-6 py-3 rounded-full bg-white/80 text-[#1a1a1a] text-[14px] font-medium hover:bg-white transition-all border border-black/[0.08] shadow-lg shadow-black/5"
          >
            See features
          </a>
        </motion.div>

        {/* Interactive Demo Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="w-full max-w-3xl relative"
        >
          {/* Card glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-b from-black/[0.03] to-transparent rounded-[28px] blur-2xl opacity-60" />
          
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/[0.08] border border-black/[0.06] overflow-hidden">
            {/* Demo header */}
            <div className="px-5 py-3 border-b border-black/[0.04] flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#E5E5E5]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5E5]" />
                <div className="w-3 h-3 rounded-full bg-[#E5E5E5]" />
              </div>
              <span className="text-xs text-[#999] ml-2">Try it live</span>
            </div>

            {/* Prompt area with swipe */}
            <div className="p-6">
              <div className="flex items-start gap-3">
                <button
                  onClick={prevPrompt}
                  className="mt-1 p-2 rounded-lg hover:bg-black/[0.04] text-[#999] hover:text-[#666] transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <motion.p
                  key={currentPromptIndex}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 text-base md:text-lg text-[#1a1a1a] leading-relaxed"
                >
                  {demoText}
                </motion.p>
                <button
                  onClick={nextPrompt}
                  className="mt-1 p-2 rounded-lg hover:bg-black/[0.04] text-[#999] hover:text-[#666] transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              {/* Dots indicator */}
              <div className="flex justify-center gap-1.5 mt-5">
                {demoPrompts.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPromptIndex(i);
                      setAiResult(null);
                      setSelectedAction(null);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentPromptIndex ? "bg-[#1a1a1a] w-4" : "bg-black/10 w-1.5"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-black/[0.04]" />

            {/* Actions bar */}
            <div className="px-5 py-4 bg-[#FAFAFA] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                 <div className="flex bg-black/[0.04] p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode("text")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "text" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setViewMode("icons")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === "icons" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
                    >
                      Icons
                    </button>
                 </div>
                 <a
                  href="/get-started"
                  className="px-4 py-2 rounded-full bg-[#1a1a1a] text-white text-[13px] font-medium hover:bg-[#333] transition-all shadow-lg shadow-black/10"
                >
                  Open editor
                </a>
              </div>

              <AnimatePresence mode="wait">
                {viewMode === "text" ? (
                  <motion.div 
                    key="text-mode"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap gap-2"
                  >
                    {demoActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={() => handleDemoAction(action.id)}
                        disabled={isProcessing}
                        className={`px-4 py-2 rounded-full text-[13px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          selectedAction === action.id
                            ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10"
                            : "text-[#666] hover:bg-white hover:shadow-md border border-transparent hover:border-black/[0.04]"
                        }`}
                      >
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="icon-mode"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap gap-2"
                  >
                    {demoActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <motion.button
                          layout
                          key={action.id}
                          onClick={() => handleDemoAction(action.id)}
                          disabled={isProcessing}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-shadow shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                            selectedAction === action.id
                              ? "bg-white ring-2 ring-black shadow-md z-10"
                              : "bg-white hover:shadow-md border border-black/[0.04]"
                          }`}
                          title={action.label}
                        >
                           <div className={`${selectedAction === action.id ? "text-black" : "text-black/60"}`}>
                             <Icon size={18} strokeWidth={selectedAction === action.id ? 2.5 : 2} />
                           </div>
                           {/* Active indicator dot */}
                           {selectedAction === action.id && (
                             <motion.div 
                               layoutId="activeDot"
                               className="absolute -bottom-1 w-1 h-1 rounded-full bg-black"
                             />
                           )}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Response area - only shows when there's a result */}
            {(isProcessing || aiResult) && (
              <>
                <div className="h-px bg-black/[0.04]" />
                <div className="p-6 bg-white">
                  {isProcessing ? (
                    <div className="flex items-center gap-3 text-[#999]">
                      <div className="w-5 h-5 border-2 border-black/10 border-t-black/60 rounded-full animate-spin" />
                      <span className="text-sm">Writing...</span>
                    </div>
                  ) : aiResult && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="text-base text-[#333] leading-relaxed whitespace-pre-wrap">{aiResult}</p>
                      <button
                        onClick={() => handleDemoAction(selectedAction!)}
                        className="mt-4 flex items-center gap-2 text-sm text-[#999] hover:text-[#666] transition-colors"
                      >
                        <RefreshCw size={14} />
                        Regenerate
                      </button>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Subtle hint below */}
        <p className="text-center text-sm text-[#999] mt-6">
          Try it free — no account needed
        </p>
      </section>

      {/* Social Proof - Cursor style */}
      <section className="py-20 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-2xl md:text-3xl text-[#1a1a1a] tracking-tight leading-relaxed"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            For the moments when thinking clearly actually matters.
          </h2>
        </div>
      </section>

      {/* Quick Features Grid - Card style */}
      <section id="features" className="py-20 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-semibold text-[#1a1a1a] tracking-tight mb-4">
              Everything you need to write better
            </h2>
            <p className="text-[#666] text-base max-w-lg mx-auto">
              AI-powered tools that help you write, not just check your grammar.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: FileText, title: "Paraphrase", desc: "Rewrite with different words" },
              { icon: Target, title: "Expand", desc: "Add depth and detail" },
              { icon: LayoutPanelLeft, title: "Simplify", desc: "Make it clearer" },
              { icon: Eye, title: "Synonyms", desc: "Find better words" },
              { icon: Lightbulb, title: "Counter", desc: "Challenge your argument" },
              { icon: AlertTriangle, title: "Fact Check", desc: "Verify your claims" },
              { icon: ChevronDown, title: "Export", desc: "PDF, share, publish" },
              { icon: MessageSquare, title: "Chat", desc: "Ask anything about your doc" },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-2xl bg-white border border-black/[0.04] hover:border-black/[0.08] hover:shadow-lg hover:shadow-black/[0.03] transition-all group cursor-default"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/[0.03] flex items-center justify-center mb-4 group-hover:bg-black/[0.06] transition-colors">
                    <Icon size={18} className="text-[#666] group-hover:text-[#1a1a1a] transition-colors" />
                  </div>
                  <h3 className="font-medium text-[15px] text-[#1a1a1a] mb-1">{feature.title}</h3>
                  <p className="text-[13px] text-[#999]">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature 1: Select and Transform */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] text-[#1a1a1a] text-xs font-medium mb-6">
                <Sparkles size={12} />
                Transform
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-6 leading-tight">
                Select any text.<br />Transform it instantly.
              </h2>
              <p className="text-[#666] leading-relaxed mb-6 text-base">
                Highlight a sentence and click. Paraphrase it, expand it, simplify it, or generate counterarguments. No prompts to write, no context to explain.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Paraphrase", "Expand", "Simplify", "Synonyms", "Counter"].map((action, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-[#F0F0EC] text-[13px] font-medium text-[#666]">{action}</span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-b from-black/[0.03] to-transparent rounded-[28px] blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xl shadow-black/[0.05]">
                <div className="space-y-4">
                  <div className="p-4 bg-black/[0.03] rounded-xl border border-black/[0.04]">
                    <p className="text-sm text-[#333] leading-relaxed">
                      <span className="bg-black/[0.08] px-1 rounded">We should expand into the enterprise market this quarter.</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 rounded-full bg-[#1a1a1a] text-white text-xs font-medium">Simplify</span>
                    <span className="px-3 py-1.5 rounded-full bg-[#F0F0EC] text-xs text-[#666]">Expand</span>
                    <span className="px-3 py-1.5 rounded-full bg-[#F0F0EC] text-xs text-[#666]">Counter</span>
                  </div>
                  <div className="p-4 bg-[#FAFAFA] rounded-xl border border-black/[0.04]">
                    <p className="text-sm text-[#333] leading-relaxed">
                      Let's target big companies starting now.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature 2: Chat with your document */}
      <section id="how" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-2 md:order-1 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-b from-black/[0.03] to-transparent rounded-[28px] blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xl shadow-black/[0.05]">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F0F0EC] flex-shrink-0 flex items-center justify-center">
                      <User size={14} className="text-[#666]" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-[#333]">What are the main risks in my strategy doc?</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex-shrink-0 flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="flex-1 p-4 bg-[#FAFAFA] rounded-xl">
                      <p className="text-sm text-[#333] leading-relaxed">
                        Based on your document, there are two main risks: 1) The sales cycle for enterprise could be 6-12 months, straining your runway. 2) Enterprise features may delay your product roadmap.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F0F0EC] flex-shrink-0 flex items-center justify-center">
                      <User size={14} className="text-[#666]" />
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm text-[#333]">How can I mitigate the first risk?</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 md:order-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] text-[#1a1a1a] text-xs font-medium mb-6">
                <MessageSquare size={12} />
                AI Chat
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-6 leading-tight">
                Chat with your document
              </h2>
              <p className="text-[#666] leading-relaxed mb-6 text-base">
                Ask questions about what you've written. Get summaries, find gaps, brainstorm ideas. The AI reads your entire document and gives contextual answers.
              </p>
              <p className="text-[#999] text-sm">
                No copy-pasting into ChatGPT. Your doc is always the context.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature 3: One-click actions */}
      <section className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] text-[#1a1a1a] text-xs font-medium mb-6">
                <Zap size={12} />
                Quick Actions
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-6 leading-tight">
                Writing tools that actually help
              </h2>
              <p className="text-[#666] leading-relaxed mb-6 text-base">
                Not generic suggestions. Real tools: fact-check a claim, find better synonyms, generate counterarguments, or extract the key points from a paragraph.
              </p>
              <p className="text-[#999] text-sm mb-4">
                Keyboard shortcuts for everything. Stay in flow.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Fact check", "Synonyms", "Counter", "Simplify", "Expand"].map((action, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-[#F0F0EC] text-[13px] font-medium text-[#666]">{action}</span>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-b from-black/[0.03] to-transparent rounded-[28px] blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-black/[0.06] p-6 shadow-xl shadow-black/[0.05]">
                {/* Cmd+K Command Palette Demo */}
                <div className="p-5 rounded-xl bg-[#FAFAFA] border border-black/[0.04]">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-black/[0.06] text-xs font-mono text-[#666] shadow-sm">
                      <span>⌘K</span>
                    </div>
                    <span className="text-sm text-[#999]">Quick Actions</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a1a] text-white">
                      <Check size={14} />
                      <span className="text-sm font-medium">Paraphrase</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors cursor-pointer">
                      <Eye size={14} className="text-[#999]" />
                      <span className="text-sm text-[#666]">Find synonyms</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors cursor-pointer">
                      <Target size={14} className="text-[#999]" />
                      <span className="text-sm text-[#666]">Expand this point</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white transition-colors cursor-pointer">
                      <Lightbulb size={14} className="text-[#999]" />
                      <span className="text-sm text-[#666]">Generate counter</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-3xl md:text-4xl text-[#1a1a1a] tracking-tight mb-14"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            For anyone who writes.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { role: "Founders", doing: "pitch decks & memos" },
              { role: "Writers", doing: "articles & essays" },
              { role: "Students", doing: "papers & theses" },
              { role: "Teams", doing: "docs & proposals" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-6 rounded-2xl bg-white border border-black/[0.04] hover:border-black/[0.08] hover:shadow-lg transition-all"
              >
                <p className="font-semibold text-[#1a1a1a] mb-1 text-[15px]">{item.role}</p>
                <p className="text-[13px] text-[#999]">{item.doing}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative">
        <div className="max-w-3xl mx-auto text-center relative">
          {/* CTA glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/[0.03] via-black/[0.01] to-black/[0.03] rounded-full blur-[100px] opacity-50" />
          
          <h2 
            className="text-4xl md:text-5xl text-[#1a1a1a] tracking-tight mb-8 relative"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            Try Eliee now.
          </h2>
          <a 
            href="/get-started"
            className="relative inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#1a1a1a] text-white font-medium hover:bg-[#333] transition-all shadow-2xl shadow-black/20"
          >
            Start a new document
            <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-black/[0.04] relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10">
            <div className="flex items-center gap-2.5">
              <img src="/eliee_logo.jpg" alt="Logo" className="w-7 h-7 rounded-lg" />
              <span className="font-semibold text-[#1a1a1a] text-[15px]">Eliee</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-sm">
              <div>
                <p className="font-medium text-[#1a1a1a] mb-4">Product</p>
                <div className="space-y-3 text-[#666]">
                  <a href="#features" className="block hover:text-[#1a1a1a] transition-colors">Features</a>
                  <a href="/pricing" className="block hover:text-[#1a1a1a] transition-colors">Pricing</a>
                </div>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a] mb-4">Resources</p>
                <div className="space-y-3 text-[#666]">
                  <a href="#how" className="block hover:text-[#1a1a1a] transition-colors">How it Works</a>
                  <a href="/auth" className="block hover:text-[#1a1a1a] transition-colors">Sign in</a>
                </div>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a] mb-4">Legal</p>
                <div className="space-y-3 text-[#666]">
                  <a href="/terms" className="block hover:text-[#1a1a1a] transition-colors">Terms</a>
                  <a href="/privacy" className="block hover:text-[#1a1a1a] transition-colors">Privacy</a>
                </div>
              </div>
              <div>
                <p className="font-medium text-[#1a1a1a] mb-4">Contact</p>
                <div className="space-y-3 text-[#666]">
                  <a href="mailto:varun@teyra.app" className="block hover:text-[#1a1a1a] transition-colors">varun@teyra.app</a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-14 pt-6 border-t border-black/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-[#999]">
            <p>© 2026 Eliee. All rights reserved.</p>
            <p>Built for thinkers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Page Export ---
export default function Home() {
  return <LandingPage />;
}
