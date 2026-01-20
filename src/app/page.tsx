"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Play, X, FileText, Menu, Eye, Target, Lightbulb, Wand2, ListTree, LayoutPanelLeft } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import posthog from "posthog-js";

// Animated word cycler - fixed alignment
function WordCycler() {
  const words = ["faster", "clearer", "smarter", "bolder"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex overflow-hidden h-[1.15em] align-bottom relative top-[2px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="text-blue-600"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Realistic app demo - matches actual Eliee UI
function AppDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase((p) => (p + 1) % 5);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const isSelecting = phase === 1;
  const showToolbar = phase === 2;
  const showResult = phase >= 3;

  return (
    <div className="relative">
      {/* Main app window */}
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-neutral-200/50 overflow-hidden">
        {/* Browser chrome */}
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-4 py-1 rounded-md bg-neutral-100 text-neutral-400 text-xs">
              eliee.sh/app
            </div>
          </div>
        </div>

        {/* App layout */}
        <div className="flex min-h-[400px] sm:min-h-[480px]">
          {/* Sidebar */}
          <div className="w-[200px] sm:w-[240px] border-r border-neutral-100 bg-[#fcfcfc] hidden sm:block">
            <div className="p-4 border-b border-neutral-100 flex items-center gap-2">
              <img src="/eliee_logo.jpg" alt="Eliee" className="w-6 h-6 rounded-lg" />
              <span className="font-semibold text-sm text-neutral-800">Eliee</span>
            </div>
            <div className="p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 px-2 mb-2">Documents</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 text-sm text-neutral-700">
                  <FileText size={14} className="text-neutral-400" />
                  <span className="truncate">Q4 Strategy</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50">
                  <FileText size={14} className="text-neutral-300" />
                  <span className="truncate">Product Roadmap</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50">
                  <FileText size={14} className="text-neutral-300" />
                  <span className="truncate">Meeting Notes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 bg-[#f8f7f4] relative">
            {/* Editor header */}
            <div className="h-12 border-b border-neutral-200/50 bg-[#f8f7f4] flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button className="p-1.5 rounded-lg hover:bg-black/5 sm:hidden">
                  <Menu size={16} className="text-neutral-500" />
                </button>
                <span className="text-sm font-medium text-neutral-700">Q4 Strategy</span>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Saved
                </div>
              </div>
            </div>

            {/* Editor content */}
            <div className="p-6 sm:p-10 relative">
              <div className="max-w-2xl text-base sm:text-lg leading-[1.9] text-neutral-700">
                <p className="mb-4">Our analysis indicates that the primary challenge facing the organization this quarter is resource allocation.</p>
                <p className="relative inline">
                  We need to{" "}
                  <span className={`relative transition-all duration-200 ${isSelecting || showToolbar || showResult ? "bg-blue-100 rounded px-0.5 -mx-0.5" : ""}`}>
                    expand our market presence significantly

                    {/* Floating toolbar */}
                    <AnimatePresence>
                      {showToolbar && (
                        <motion.span
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.98 }}
                          className="absolute left-0 -top-14 z-20"
                        >
                          <span className="flex items-center gap-0.5 px-1.5 py-1.5 bg-white rounded-xl shadow-xl border border-neutral-200">
                            <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-900 text-white inline-flex items-center gap-1.5">
                              <LayoutPanelLeft size={12} />
                              Simplify
                            </span>
                            <span className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 inline-flex items-center gap-1.5">
                              <Target size={12} />
                              Expand
                            </span>
                            <span className="px-2.5 py-1.5 rounded-lg text-xs text-neutral-400 inline-flex items-center gap-1.5">
                              <Lightbulb size={12} />
                              Counter
                            </span>
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                  {" "}to compete effectively.
                </p>

                {/* Result popup */}
                <AnimatePresence>
                  {showResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-8 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden max-w-md"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/50">
                        <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Simplify</span>
                        <button className="p-1 text-neutral-300 hover:text-neutral-500 rounded">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="p-4">
                        <p className="text-sm text-neutral-700 leading-relaxed">
                          <span className="text-blue-600 font-medium">grow faster in the market</span>
                        </p>
                        <p className="text-xs text-neutral-400 mt-2">6 words → 5 words</p>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
                        <button className="text-[11px] text-neutral-400 hover:text-neutral-600">Copy</button>
                        <button className="text-[11px] font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
                          Replace
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Feature showcase with before/after
function FeatureShowcase() {
  const features = [
    {
      title: "Select → Transform",
      desc: "Highlight text, pick an action, done.",
      before: "The implementation of this feature will require substantial resources",
      after: "This feature needs significant resources",
      tag: "Simplify",
    },
    {
      title: "Think Deeper",
      desc: "Focus mode challenges your assumptions.",
      before: "We should pivot to enterprise",
      after: "What evidence supports enterprise over SMB? What's the CAC difference?",
      tag: "Focus Mode",
    },
    {
      title: "Stay Credible",
      desc: "Quick Check flags claims that need sources.",
      before: "Studies show 73% of users prefer...",
      after: "⚠️ This statistic needs a citation",
      tag: "Quick Check",
    },
  ];

  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((a) => (a + 1) % features.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
      {/* Feature list */}
      <div className="space-y-4">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            onClick={() => setActive(i)}
            className={`p-5 rounded-xl cursor-pointer transition-all ${
              active === i
                ? "bg-blue-50 border-2 border-blue-200"
                : "bg-neutral-50 border-2 border-transparent hover:bg-neutral-100"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${active === i ? "bg-blue-600" : "bg-neutral-300"}`} />
              <h3 className={`font-semibold ${active === i ? "text-blue-900" : "text-neutral-700"}`}>
                {feature.title}
              </h3>
            </div>
            <p className={`text-sm ml-5 ${active === i ? "text-blue-700" : "text-neutral-500"}`}>
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Demo panel */}
      <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
            {features[active].tag}
          </span>
        </div>
        <div className="p-6 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={`before-${active}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <div className="text-xs uppercase tracking-wide text-neutral-400 mb-2">Before</div>
              <div className="p-4 rounded-lg bg-neutral-50 text-neutral-600 text-sm">
                {features[active].before}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-neutral-200" />
            <ArrowRight size={16} className="text-blue-500" />
            <div className="flex-1 h-px bg-neutral-200" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`after-${active}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-xs uppercase tracking-wide text-blue-600 mb-2">After</div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm font-medium">
                {features[active].after}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Stats
function Stats() {
  return (
    <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
      {[
        { value: "50%", label: "less time editing" },
        { value: "2x", label: "more clarity" },
        { value: "10s", label: "to transform any text" },
      ].map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          className="text-center"
        >
          <div className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-2">{stat.value}</div>
          <div className="text-sm text-neutral-500">{stat.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export default function Home() {
  const { data: session } = useSession();

  const handleCTA = (location: string) => {
    posthog.capture("cta_clicked", {
      button_location: location,
      is_authenticated: !!session,
    });
    window.location.href = session ? "/app" : "/auth";
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-neutral-200/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/eliee_logo.jpg" alt="Eliee" className="w-8 h-8 rounded-xl" />
            <span className="font-semibold text-lg text-neutral-900">Eliee</span>
          </a>

          <div className="flex items-center gap-4">
            {session ? (
              <button
                onClick={() => handleCTA("nav")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Open App
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <a href="/auth" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors px-3 py-2">
                  Log in
                </a>
                <button
                  onClick={() => handleCTA("nav")}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  Try free
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 sm:pt-40 pb-20 sm:pb-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Play size={12} fill="currentColor" />
                Now in public beta
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-neutral-900 leading-[1.1] tracking-tight mb-6"
            >
              Write <WordCycler />
              <br />
              <span className="text-neutral-400">with one click.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-neutral-600 mb-10 max-w-xl"
            >
              Google Docs meets powerful AI. Select any text and instantly simplify, expand, counter, or transform it.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <button
                onClick={() => handleCTA("hero")}
                className="group flex items-center gap-3 px-8 py-4 rounded-xl bg-blue-600 text-white font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25"
              >
                Start writing free
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center gap-2 text-sm text-neutral-500 py-4">
                <Check size={16} className="text-green-500" />
                No credit card required
              </div>
            </motion.div>
          </div>

          {/* Demo */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <AppDemo />
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-neutral-200">
        <Stats />
      </section>

      {/* Features */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 mb-4">
              See it in action
            </h2>
            <p className="text-xl text-neutral-500">
              Click any feature to see how it transforms your writing.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <FeatureShowcase />
          </motion.div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-24 sm:py-32 px-6 bg-neutral-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="text-3xl sm:text-4xl lg:text-5xl font-medium text-white leading-tight mb-8">
              "I used to switch tabs between Docs and GPT all day. Now it&apos;s one unified hub — and I stay{" "}
              <span className="text-blue-400">focused</span>."
            </div>
            <div className="text-neutral-400">
              — Writer, 3x faster with Eliee
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4">
              Start free, upgrade anytime
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border-2 border-neutral-200 bg-white"
            >
              <div className="text-lg font-semibold text-neutral-900 mb-1">Free</div>
              <div className="text-4xl font-bold text-neutral-900 mb-6">$0</div>
              <ul className="space-y-3 mb-8">
                {["3 documents", "Core actions", "PDF export"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-neutral-600">
                    <Check size={18} className="text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCTA("pricing-free")}
                className="w-full py-3.5 rounded-xl border-2 border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50 transition-colors"
              >
                Get started
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-8 rounded-2xl bg-black text-white relative overflow-hidden border border-black/10"
            >
              <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600/15 text-blue-100 border-l border-b border-blue-500/20 text-xs font-semibold rounded-bl-lg">
                POPULAR
              </div>
              <div className="text-lg font-semibold mb-1">Pro</div>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-white/60">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                {["Unlimited documents", "150 high-quality prompts/mo (Claude + GPT-5)", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/80">
                    <Check size={18} className="text-blue-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/pricing"
                className="block w-full py-3.5 rounded-xl bg-white text-black font-semibold text-center transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:bg-blue-50"
              >
                Upgrade
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 px-6 bg-gradient-to-b from-neutral-100 to-white">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-6">
              Ready to write better?
            </h2>
            <p className="text-xl text-neutral-500 mb-10">
              Join thousands of writers who transformed their workflow.
            </p>
            <button
              onClick={() => handleCTA("footer-cta")}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-neutral-900 text-white font-semibold text-lg hover:bg-neutral-800 transition-all"
            >
              Start writing free
              <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/eliee_logo.jpg" alt="Eliee" className="w-6 h-6 rounded-lg" />
            <span className="text-sm font-medium text-neutral-600">Eliee</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-neutral-400">
            <a href="/pricing" className="hover:text-neutral-900 transition-colors">Pricing</a>
            <a href="/terms" className="hover:text-neutral-900 transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-neutral-900 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
