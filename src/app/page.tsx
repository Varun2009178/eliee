"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Eye,
  ListTree,
  Lightbulb,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Brain,
  FileCheck,
  FolderOpen,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import posthog from "posthog-js";

// Cursor component
function Cursor({ x, y, visible = true }: { x: number; y: number; visible?: boolean }) {
  if (!visible) return null;
  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      style={{ left: 0, top: 0 }}
      animate={{ x, y }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.88a.5.5 0 0 0-.85.33Z"
          fill="#000"
          stroke="#fff"
          strokeWidth="1.5"
        />
      </svg>
    </motion.div>
  );
}

// Interactive demo component with manual navigation
function InteractiveDemo() {
  const [activeDemo, setActiveDemo] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 40, y: 140 });
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const demos = [
    {
      action: "Find Synonyms",
      icon: Eye,
      textBefore: "We need to ",
      highlightText: "expand into the enterprise market",
      textAfter: " this quarter.",
      result: "grow into, scale to, move into, venture into, branch out to",
    },
    {
      action: "Extract Claims",
      icon: ListTree,
      textBefore: "The team believes ",
      highlightText: "remote work increases productivity",
      textAfter: " based on studies.",
      result: "1. Remote work affects productivity\n2. The effect is positive\n3. Evidence exists from studies",
    },
    {
      action: "Counter",
      icon: Lightbulb,
      textBefore: "Our analysis shows ",
      highlightText: "the main risk is running out of runway",
      textAfter: ".",
      result: "However, constraints can accelerate focus. Some argue urgency drives better decisions.",
    },
  ];

  const currentDemo = demos[activeDemo];
  const Icon = currentDemo.icon;
  const textBeforeWidth = currentDemo.textBefore.length * 10;

  const runAnimation = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);

    // Reset
    setSelectionEnd(0);
    setShowMenu(false);
    setShowResult(false);
    setActiveAction(null);
    setCursorPos({ x: 40, y: 140 });

    await new Promise(r => setTimeout(r, 400));

    const startX = 48 + textBeforeWidth;
    setCursorPos({ x: startX, y: 72 });
    await new Promise(r => setTimeout(r, 400));

    const textLength = currentDemo.highlightText.length;
    for (let i = 0; i <= textLength; i++) {
      setSelectionEnd(i);
      setCursorPos({ x: startX + (i * 10), y: 72 });
      await new Promise(r => setTimeout(r, 20));
    }

    await new Promise(r => setTimeout(r, 250));
    setShowMenu(true);
    await new Promise(r => setTimeout(r, 350));
    setCursorPos({ x: startX + 70, y: 18 });
    await new Promise(r => setTimeout(r, 300));
    setActiveAction(currentDemo.action);
    await new Promise(r => setTimeout(r, 150));
    setShowResult(true);
    setShowMenu(false);
    setIsAnimating(false);
  }, [currentDemo, textBeforeWidth, isAnimating]);

  useEffect(() => {
    runAnimation();
  }, [activeDemo]);

  const goToDemo = (index: number) => {
    if (isAnimating) return;
    setActiveDemo(index);
  };

  const nextDemo = () => {
    if (isAnimating) return;
    setActiveDemo((prev) => (prev + 1) % demos.length);
  };

  const prevDemo = () => {
    if (isAnimating) return;
    setActiveDemo((prev) => (prev - 1 + demos.length) % demos.length);
  };

  return (
    <div className="relative w-full">
      {/* Browser window */}
      <div className="bg-[#1a1a1a] rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08]">
        {/* Browser chrome */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-6 sm:px-10 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs sm:text-sm">
              eliee.sh/app
            </div>
          </div>
          <div className="w-14" />
        </div>

        {/* App content */}
        <div className="bg-[#f8f7f4] relative">
          {/* App header */}
          <div className="bg-white/90 backdrop-blur border-b border-black/5 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/eliee_logo.jpg" alt="Eliee" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
              <span className="font-medium text-sm sm:text-base text-black/70">Strategy Document</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-black/40">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Saved
            </div>
          </div>

          {/* Document area */}
          <div className="p-6 sm:p-10 lg:p-12 relative min-h-[280px] sm:min-h-[340px] lg:min-h-[400px]">
            <Cursor x={cursorPos.x} y={cursorPos.y} visible={!showResult} />

            {/* Document text */}
            <div className="text-base sm:text-lg lg:text-xl leading-[2] text-black/80 relative font-normal max-w-3xl">
              {currentDemo.textBefore}
              <span className="relative">
                {selectionEnd > 0 ? (
                  <>
                    <span className="bg-blue-300/70 rounded-sm">
                      {currentDemo.highlightText.slice(0, selectionEnd)}
                    </span>
                    <span>{currentDemo.highlightText.slice(selectionEnd)}</span>
                  </>
                ) : (
                  currentDemo.highlightText
                )}

                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute left-0 -top-14 z-20"
                    >
                      <div className="flex items-center gap-1 px-2 py-2 bg-white rounded-xl shadow-2xl border border-black/10">
                        <div
                          className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all ${
                            activeAction === currentDemo.action
                              ? "bg-black text-white"
                              : "text-black/70 hover:bg-black/5"
                          }`}
                        >
                          <Icon size={16} />
                          {currentDemo.action}
                        </div>
                        <div className="px-3 py-2 rounded-lg text-sm text-black/40 hidden sm:block">
                          Expand
                        </div>
                        <div className="px-3 py-2 rounded-lg text-sm text-black/40 hidden sm:block">
                          Simplify
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </span>
              {currentDemo.textAfter}
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-8 sm:mt-10 p-5 sm:p-6 rounded-xl bg-white border border-black/8 shadow-sm max-w-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-black flex items-center justify-center">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <span className="text-sm font-medium text-black/50">{currentDemo.action}</span>
                  </div>
                  <div className="text-sm sm:text-base text-black/70 whitespace-pre-line leading-relaxed">
                    {currentDemo.result}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prevDemo}
          disabled={isAnimating}
          className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-30"
        >
          <ChevronLeft size={20} className="text-black/50" />
        </button>

        <div className="flex items-center gap-3">
          {demos.map((demo, i) => (
            <button
              key={i}
              onClick={() => goToDemo(i)}
              disabled={isAnimating}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                i === activeDemo
                  ? "bg-black text-white"
                  : "text-black/50 hover:bg-black/5"
              }`}
            >
              <demo.icon size={14} />
              <span className="hidden sm:inline">{demo.action}</span>
            </button>
          ))}
        </div>

        <button
          onClick={nextDemo}
          disabled={isAnimating}
          className="p-2 rounded-full hover:bg-black/5 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} className="text-black/50" />
        </button>
      </div>
    </div>
  );
}

// Feature section component
function FeatureSection({
  title,
  description,
  features,
  visual,
  reversed = false,
}: {
  title: string;
  description: string;
  features: string[];
  visual: React.ReactNode;
  reversed?: boolean;
}) {
  return (
    <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${reversed ? "lg:direction-rtl" : ""}`}>
      <motion.div
        initial={{ opacity: 0, x: reversed ? 20 : -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`${reversed ? "lg:order-2 lg:direction-ltr" : ""}`}
      >
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-black mb-4">{title}</h3>
        <p className="text-lg text-black/50 mb-6">{description}</p>
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3 text-black/70">
              <Check size={20} className="text-emerald-500 mt-0.5 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: reversed ? -20 : 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`${reversed ? "lg:order-1 lg:direction-ltr" : ""}`}
      >
        {visual}
      </motion.div>
    </div>
  );
}

// Feature visual components
function AIActionsVisual() {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-1 shadow-2xl">
      <div className="bg-[#f8f7f4] rounded-xl p-6 sm:p-8">
        <div className="space-y-3">
          {[
            { icon: Eye, label: "Find Synonyms", desc: "Alternative words and phrases" },
            { icon: Wand2, label: "Expand", desc: "Elaborate on your ideas" },
            { icon: ListTree, label: "Extract Claims", desc: "Identify key assertions" },
            { icon: Lightbulb, label: "Counter", desc: "Challenge your arguments" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border border-black/5 hover:border-black/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center shrink-0">
                <item.icon size={18} className="text-white" />
              </div>
              <div>
                <div className="font-medium text-black">{item.label}</div>
                <div className="text-sm text-black/50">{item.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusModeVisual() {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-1 shadow-2xl">
      <div className="bg-[#f8f7f4] rounded-xl overflow-hidden">
        <div className="bg-white/90 border-b border-black/5 px-6 py-3 flex items-center gap-2">
          <Brain size={18} className="text-emerald-600" />
          <span className="font-medium text-black/70">Focus Mode</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Active</span>
        </div>
        <div className="p-6 sm:p-8 space-y-4">
          <div className="p-4 rounded-xl bg-white border border-black/5">
            <div className="text-sm font-medium text-black/50 mb-2">Your thought</div>
            <div className="text-black/80">"We should pivot to enterprise sales"</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-sm font-medium text-emerald-700 mb-2">AI Analysis</div>
            <div className="text-black/70 text-sm space-y-2">
              <p>• Consider: What evidence supports this direction?</p>
              <p>• Question: How does this align with current strengths?</p>
              <p>• Explore: What are the resource implications?</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCheckVisual() {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-1 shadow-2xl">
      <div className="bg-[#f8f7f4] rounded-xl overflow-hidden">
        <div className="bg-white/90 border-b border-black/5 px-6 py-3 flex items-center gap-2">
          <FileCheck size={18} className="text-blue-600" />
          <span className="font-medium text-black/70">Quick Check</span>
          <span className="ml-auto px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Beta</span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="p-4 rounded-xl bg-white border border-black/5 mb-4">
            <div className="text-black/80">"Studies show 73% of remote workers report higher productivity"</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-amber-800">Verify source</div>
                <div className="text-amber-700/70">This statistic needs a citation</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-emerald-800">Claim identified</div>
                <div className="text-emerald-700/70">Productivity correlation with remote work</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationVisual() {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-1 shadow-2xl">
      <div className="bg-[#f8f7f4] rounded-xl overflow-hidden">
        <div className="bg-white/90 border-b border-black/5 px-6 py-3 flex items-center gap-2">
          <FolderOpen size={18} className="text-black/60" />
          <span className="font-medium text-black/70">My Documents</span>
        </div>
        <div className="p-6 sm:p-8">
          <div className="space-y-2">
            {[
              { name: "Q4 Strategy Brief", date: "2 hours ago", words: "1,247 words" },
              { name: "Product Roadmap 2024", date: "Yesterday", words: "3,891 words" },
              { name: "Team Retrospective", date: "3 days ago", words: "856 words" },
              { name: "Investor Update Draft", date: "Last week", words: "2,103 words" },
            ].map((doc, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-black/5 hover:border-black/10 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-black/5 flex items-center justify-center">
                  <FileCheck size={18} className="text-black/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-black truncate">{doc.name}</div>
                  <div className="text-sm text-black/40">{doc.words}</div>
                </div>
                <div className="text-sm text-black/40 shrink-0">{doc.date}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-[#fafafa]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#fafafa]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <img src="/eliee_logo.jpg" alt="Eliee" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold text-[15px] text-black/80">Eliee</span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-black/50 hover:text-black transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-black/50 hover:text-black transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {session ? (
              <button
                onClick={() => handleCTA("nav")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-black/80 transition-all"
              >
                Open App
                <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <a href="/auth" className="text-sm text-black/50 hover:text-black transition-colors px-3 py-2">
                  Sign in
                </a>
                <button
                  onClick={() => handleCTA("nav")}
                  className="px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-black/80 transition-all"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 sm:pt-40 lg:pt-48 pb-16 sm:pb-20 lg:pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem] font-semibold leading-[1.1] tracking-[-0.025em] text-black mb-6">
              Your Unified Writing Workspace, <span className="text-emerald-600">Supercharged</span> with AI.
            </h1>
            <p className="text-lg sm:text-xl text-black/50 mb-8 sm:mb-10 max-w-2xl mx-auto">
              <span className="text-black/70">Select text.</span> Click an action. <span className="text-emerald-600">Get instant results.</span> The smarter way to write, think, and create.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCTA("hero")}
                className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-black text-white font-medium hover:bg-black/80 transition-all"
              >
                Start writing free
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a href="#features" className="text-black/50 hover:text-black transition-colors px-4 py-3">
                See how it works
              </a>
            </div>
          </motion.div>
        </div>

        {/* Interactive Demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="max-w-6xl mx-auto"
        >
          <InteractiveDemo />
        </motion.div>
      </section>

      {/* Feature Sections */}
      <section id="features" className="py-24 lg:py-32 px-6 bg-white">
        <div className="max-w-6xl mx-auto space-y-24 lg:space-y-40">
          {/* Feature 1: AI Actions */}
          <FeatureSection
            title="Powerful AI actions at your fingertips"
            description="Select any text and instantly access a suite of AI-powered tools designed to enhance your writing."
            features={[
              "Find synonyms and alternative phrasings",
              "Expand ideas into detailed paragraphs",
              "Extract and analyze claims in your text",
              "Generate counter-arguments to strengthen your work",
            ]}
            visual={<AIActionsVisual />}
          />

          {/* Feature 2: Focus Mode */}
          <FeatureSection
            title="Think clearer with Focus Mode"
            description="A dedicated space for deep thinking. Let AI help you explore ideas, challenge assumptions, and develop stronger arguments."
            features={[
              "AI-guided brainstorming sessions",
              "Challenge your assumptions with probing questions",
              "Explore multiple perspectives on any topic",
              "Build structured arguments step by step",
            ]}
            visual={<FocusModeVisual />}
            reversed
          />

          {/* Feature 3: Quick Check */}
          <FeatureSection
            title="Verify your claims instantly"
            description="Quick Check analyzes your writing for claims that need verification, helping you maintain credibility and accuracy."
            features={[
              "Automatically identify factual claims",
              "Flag statistics that need sources",
              "Highlight potential logical inconsistencies",
              "Suggest areas for additional research",
            ]}
            visual={<QuickCheckVisual />}
          />

          {/* Feature 4: Organization */}
          <FeatureSection
            title="All your documents, beautifully organized"
            description="A clean, distraction-free workspace that keeps your writing organized and accessible. Export to PDF when you're ready to share."
            features={[
              "Create unlimited documents with Pro",
              "Auto-save keeps your work safe",
              "Export to PDF with one click",
              "Clean, minimal interface for focused writing",
            ]}
            visual={<OrganizationVisual />}
            reversed
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 lg:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-black mb-4">Simple pricing</h2>
            <p className="text-black/50 text-lg">Start free, upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Free */}
            <div className="p-8 lg:p-10 rounded-2xl border border-black/10 bg-white">
              <h3 className="text-xl font-semibold mb-2">Free</h3>
              <p className="text-black/50 text-sm mb-6">For getting started</p>
              <div className="text-5xl font-semibold mb-8">$0</div>
              <ul className="space-y-4 mb-10">
                {["3 documents", "Basic AI actions", "Export to PDF"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-black/60">
                    <Check size={18} className="text-black/40" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleCTA("pricing-free")}
                className="w-full py-3.5 rounded-xl border border-black/10 text-black/70 font-medium hover:bg-black/[0.02] transition-colors"
              >
                Get started
              </button>
            </div>

            {/* Pro */}
            <div className="p-8 lg:p-10 rounded-2xl bg-black text-white">
              <h3 className="text-xl font-semibold mb-2">Pro</h3>
              <p className="text-white/50 text-sm mb-6">For serious writers</p>
              <div className="text-5xl font-semibold mb-2">$9.99</div>
              <p className="text-white/40 text-sm mb-8">/month</p>
              <ul className="space-y-4 mb-10">
                {["Unlimited documents", "150 premium prompts/mo", "Claude & GPT-4", "Priority support"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <Check size={18} className="text-white/50" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="/pricing"
                className="block w-full py-3.5 rounded-xl bg-white text-black font-medium text-center hover:bg-white/90 transition-colors"
              >
                Upgrade
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 lg:py-32 px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-black mb-6">
            Ready to write <span className="text-emerald-600">smarter</span>?
          </h2>
          <p className="text-black/50 text-lg mb-8">
            Join thousands of writers using AI to think clearer and write faster.
          </p>
          <button
            onClick={() => handleCTA("footer")}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-black text-white font-medium text-lg hover:bg-black/80 transition-all"
          >
            Start writing free
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-black/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/eliee_logo.jpg" alt="Eliee" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-medium text-black/60">Eliee</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-black/40">
            <a href="/pricing" className="hover:text-black transition-colors">Pricing</a>
            <a href="/terms" className="hover:text-black transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-black transition-colors">Privacy</a>
            <a href="/auth" className="hover:text-black transition-colors">Sign in</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
