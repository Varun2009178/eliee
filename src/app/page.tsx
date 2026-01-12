"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Eye,
  Target,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  LayoutPanelLeft,
  User
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

// --- Landing Page Component ---
function LandingPage() {
  const { data: session } = useSession();

  const handleGetStarted = () => {
    window.location.href = session ? "/app" : "/auth";
  };

    return (
    <div className="min-h-screen bg-[#f5f3ef] flex flex-col">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-4 md:px-6 relative z-50 sticky top-0 bg-[#f5f3ef]/80 backdrop-blur-md">
        <a href="/" className="flex items-center gap-2">
          <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-md" />
          <span className="font-medium text-black/80 text-sm tracking-tight">Eliee</span>
        </a>
        <div className="flex items-center gap-3 md:gap-6">
          <a href="#features" className="text-sm text-black/50 hover:text-black transition-colors hidden md:block">Features</a>
          <a href="#how" className="text-sm text-black/50 hover:text-black transition-colors hidden md:block">How it works</a>
          
          {session ? (
            <a 
              href="/app"
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors"
            >
              Go to App
              <User size={14} className="opacity-50" />
            </a>
          ) : (
            <>
              <a href="/auth" className="text-sm text-black/50 hover:text-black transition-colors">Sign in</a>
                    <a 
                      href="/get-started" 
                className="px-4 py-1.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-black/80 transition-colors"
                    >
                Get started
                    </a>
            </>
          )}
                 </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col relative min-h-[90vh]">
        {/* Text - Top Left */}
        <div className="px-4 md:px-6 pt-8 md:pt-12 pb-6 max-w-xl">
                  <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/[0.08] mb-4"
          >
            <span className="text-[11px] md:text-xs font-medium text-black/60">AI-Native Google Docs for Thinking</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-[1.75rem] md:text-[2.5rem] lg:text-[3rem] leading-[1.15] tracking-tight text-black/90"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                  >
            Write first. Structure later.{" "}
            <span className="text-black/50">Think clearly with AI that shows you the logic.</span>
                  </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6"
          >
            <a 
              href="/get-started"
              className="inline-flex items-center gap-2 px-5 py-2.5 md:px-6 md:py-3 rounded-xl bg-black text-white text-sm md:text-base font-medium hover:bg-black/80 transition-all"
            >
              Start writing
              <ChevronDown size={16} className="rotate-[-90deg]" />
            </a>
                    </motion.div>
                  </div>

        {/* Demo Visual */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="px-4 md:px-6 pb-6 relative"
        >
          <div className="absolute inset-x-4 md:inset-x-6 bottom-0 h-[70%] rounded-t-[1.5rem] md:rounded-t-[2rem] overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(135deg, #e8d5c4 0%, #d4c4b0 50%, #c9b896 100%)" }} />
              </div>

          <div className="relative z-10 mx-auto max-w-5xl">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl shadow-black/10 border border-black/[0.08] overflow-hidden">
              <div className="h-8 md:h-10 bg-[#fafafa] border-b border-black/[0.06] flex items-center px-3 md:px-4 gap-2">
                <div className="flex gap-1 md:gap-1.5">
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-black/10" />
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-black/10" />
                  <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-black/10" />
           </div>
                <div className="flex-1 text-center">
                  <span className="text-[10px] md:text-xs text-black/30 font-medium">Eliee</span>
                 </div>
              </div>

              {/* Mobile: Stack vertically, Desktop: 3 columns - Cursor-style layout */}
              <div className="flex flex-col md:flex-row h-auto md:h-[400px]">
                {/* Sidebar - hidden on mobile */}
                <div className="hidden md:flex w-44 border-r border-black/[0.06] bg-[#fafafa] p-3 flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <img src="/eliee_logo.jpg" alt="" className="w-4 h-4 rounded" />
                    <span className="text-[10px] font-semibold text-black/70">Eliee</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-black/[0.04] mb-2">
                    <div className="flex items-center gap-2 text-black/60 text-[10px] mb-0.5">
                      <FileText size={10} />
                      <span>Strategy Doc</span>
                    </div>
                    <div className="text-[9px] text-black/30">127 words</div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-black/40 text-[10px]">
                      <FileText size={10} />
                      <span>Q1 Planning</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg hover:bg-white/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 text-black/40 text-[10px]">
                      <FileText size={10} />
                      <span>Research Notes</span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <button className="w-full py-2 rounded-lg bg-black text-white text-[10px] font-medium flex items-center justify-center gap-1.5">
                      <Eye size={12} />
                      Visualize
                    </button>
                  </div>
                </div>

                {/* Main Doc - Writing Area */}
                <div className="flex-1 p-4 md:p-5 overflow-hidden">
                  <div className="mb-3">
                    <span className="text-[8px] md:text-[9px] font-medium uppercase tracking-wider text-black/20">Document</span>
                  </div>
                  <div className="space-y-2 md:space-y-2.5">
                    <div className="text-xs md:text-sm text-black/70 leading-relaxed">
                      We need to decide on our go-to-market strategy...
                    </div>
                    <div className="border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg p-2 md:p-2.5">
                      <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
                        <Target size={8} />
                        CLAIM
                      </div>
                      <div className="text-[11px] md:text-xs text-black/70">Direct sales will give us better margins.</div>
                    </div>
                    <div className="border-l-2 border-amber-200 bg-amber-50/50 rounded-r-lg p-2 md:p-2.5">
                      <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-0.5">
                        <Lightbulb size={8} />
                        ASSUMPTION
                      </div>
                      <div className="text-[11px] md:text-xs text-black/70">We have enough sales capacity.</div>
                    </div>
                    <div className="border-l-2 border-rose-200 bg-rose-50/50 rounded-r-lg p-2 md:p-2.5">
                      <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-bold uppercase tracking-wider text-rose-600 mb-0.5">
                        <AlertTriangle size={8} />
                        RISK
                      </div>
                      <div className="text-[11px] md:text-xs text-black/70">Partnerships could dilute our brand.</div>
                    </div>
                 </div>
              </div>

                {/* AI Assistant Panel - Cursor-style */}
                <div className="w-full md:w-64 border-t md:border-t-0 md:border-l border-black/[0.06] bg-[#fafafa] p-4 md:p-3 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">AI</span>
                    </div>
                    <span className="text-[9px] font-semibold text-black/50">Focus Assistant</span>
                  </div>

                  {/* AI Chat Messages */}
                  <div className="flex-1 space-y-2 mb-3 overflow-hidden">
                    <div className="p-2 rounded-lg bg-white border border-black/[0.04]">
                      <p className="text-[10px] text-black/60 leading-relaxed">
                        I noticed your claim about direct sales lacks supporting evidence. Want me to help you find data?
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-violet-50 border border-violet-100">
                      <div className="text-[8px] font-semibold uppercase tracking-wider text-violet-600 mb-1">Suggestion</div>
                      <p className="text-[10px] text-black/60 leading-relaxed">
                        Add a comparison of sales capacity vs projected demand.
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="text-[8px] font-semibold uppercase tracking-wider text-amber-600 mb-1">Gap Found</div>
                      <p className="text-[10px] text-black/60 leading-relaxed">
                        "Sales capacity" assumption is untested.
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1.5 mb-2">
                    <button className="flex-1 py-1.5 rounded-lg bg-white border border-black/[0.06] text-[9px] text-black/50 hover:bg-black/[0.02] transition-colors">
                      Find gaps
                    </button>
                    <button className="flex-1 py-1.5 rounded-lg bg-white border border-black/[0.06] text-[9px] text-black/50 hover:bg-black/[0.02] transition-colors">
                      Strengthen
                    </button>
                  </div>

                  {/* Chat Input */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-black/[0.06]">
                    <input
                      type="text"
                      placeholder="Ask about your document..."
                      className="flex-1 text-[10px] text-black/60 bg-transparent outline-none placeholder:text-black/30"
                      readOnly
                    />
                    <div className="w-5 h-5 rounded bg-black flex items-center justify-center">
                      <ChevronDown size={10} className="text-white rotate-[-90deg]" />
                    </div>
                  </div>
                </div>
              </div>
           </div>
          </div>
        </motion.div>
        </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-[#f5f3ef]">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="text-2xl md:text-3xl text-black/80 tracking-tight"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            For the moments when thinking clearly actually matters.
              </h2>
           </div>
        </section>

      {/* Quick Features Grid */}
      <section className="py-16 px-6 bg-[#ebe7e0]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-xl md:text-2xl font-semibold text-black tracking-tight mb-3">
              Everything you need to think better
            </h2>
            <p className="text-black/50 text-sm max-w-lg mx-auto">
              Like Google Docs, but built for structured thinking. AI understands your reasoning, not just your words.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "FileText", title: "Rich Documents", desc: "Write naturally with formatting" },
              { icon: "Target", title: "Semantic Blocks", desc: "Tag claims, assumptions, risks" },
              { icon: "LayoutPanelLeft", title: "Logic Maps", desc: "Visualize argument structure" },
              { icon: "Eye", title: "AI Assistant", desc: "Chat about your document" },
              { icon: "Lightbulb", title: "Gap Detection", desc: "Find holes in your reasoning" },
              { icon: "AlertTriangle", title: "Risk Analysis", desc: "Surface hidden assumptions" },
              { icon: "ChevronDown", title: "Export Anywhere", desc: "PDF, share, or publish" },
              { icon: "User", title: "Collaboration", desc: "Share with your team" },
            ].map((feature, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/60 border border-black/[0.04] hover:bg-white transition-colors">
                <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center mb-3">
                  {feature.icon === "FileText" && <FileText size={16} className="text-black/40" />}
                  {feature.icon === "Target" && <Target size={16} className="text-black/40" />}
                  {feature.icon === "LayoutPanelLeft" && <LayoutPanelLeft size={16} className="text-black/40" />}
                  {feature.icon === "Eye" && <Eye size={16} className="text-black/40" />}
                  {feature.icon === "Lightbulb" && <Lightbulb size={16} className="text-black/40" />}
                  {feature.icon === "AlertTriangle" && <AlertTriangle size={16} className="text-black/40" />}
                  {feature.icon === "ChevronDown" && <ChevronDown size={16} className="text-black/40" />}
                  {feature.icon === "User" && <User size={16} className="text-black/40" />}
                </div>
                <h3 className="font-medium text-sm text-black/80 mb-1">{feature.title}</h3>
                <p className="text-xs text-black/40">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 1: Reasoning Blocks */}
      <section id="features" className="py-24 px-6 bg-[#f5f3ef]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-6 leading-tight">
                Tag your thinking with semantic blocks
              </h2>
              <p className="text-black/50 leading-relaxed mb-6">
                Not everything you write carries equal weight. Mark claims, assumptions, evidence, decisions, and risks. Watch your reasoning gain structure without losing flow.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Claim", "Assumption", "Evidence", "Decision", "Risk", "Unknown"].map((tag, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white border border-black/[0.06] text-xs font-medium text-black/60">{tag}</span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-lg">
              <div className="space-y-3">
                <div className="text-sm text-black/60 leading-relaxed">
                  We should expand into enterprise this quarter...
                </div>
                <div className="border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                    <Target size={10} /> CLAIM
                    </div>
                  <div className="text-sm text-black/70">Enterprise deals will 3x our revenue by Q4.</div>
                </div>
                <div className="border-l-2 border-amber-200 bg-amber-50/50 rounded-r-lg p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-1">
                    <Lightbulb size={10} /> ASSUMPTION
                  </div>
                  <div className="text-sm text-black/70">Our product is enterprise-ready without major changes.</div>
                </div>
                <div className="border-l-2 border-rose-200 bg-rose-50/50 rounded-r-lg p-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 mb-1">
                    <AlertTriangle size={10} /> RISK
                  </div>
                  <div className="text-sm text-black/70">Sales cycle could drain resources from product development.</div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Visualization */}
      <section id="how" className="py-24 px-6 bg-[#ebe7e0]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-white rounded-2xl border border-black/[0.06] p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <LayoutPanelLeft size={14} className="text-black/30" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-black/30">Logic Map</span>
              </div>
              <svg viewBox="0 0 280 180" className="w-full h-auto">
                <defs>
                  <marker id="arrow2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
                  </marker>
                </defs>
                <rect x="90" y="10" width="100" height="32" rx="8" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
                <text x="140" y="30" textAnchor="middle" fontSize="10" fill="#1d4ed8" fontWeight="500">Enterprise Push</text>
                
                <rect x="20" y="70" width="100" height="32" rx="8" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1.5" />
                <text x="70" y="90" textAnchor="middle" fontSize="9" fill="#b45309">Product Ready?</text>
                
                <rect x="160" y="70" width="100" height="32" rx="8" fill="#fee2e2" stroke="#fca5a5" strokeWidth="1.5" />
                <text x="210" y="90" textAnchor="middle" fontSize="9" fill="#dc2626">Resource Drain</text>
                
                <rect x="90" y="130" width="100" height="32" rx="8" fill="#f3e8ff" stroke="#c4b5fd" strokeWidth="1.5" />
                <text x="140" y="150" textAnchor="middle" fontSize="10" fill="#7c3aed" fontWeight="500">Decision</text>
                
                <line x1="140" y1="42" x2="70" y2="70" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="140" y1="42" x2="210" y2="70" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="70" y1="102" x2="140" y2="130" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="210" y1="102" x2="140" y2="130" stroke="#999" strokeWidth="1.5" markerEnd="url(#arrow2)" />
              </svg>
              <div className="mt-4 p-3 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-black/30 mb-1">AI Insight</div>
                <p className="text-[11px] text-black/60 leading-relaxed">
                  Assumption "product ready" is untested. Validate before committing resources.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-6 leading-tight">
                One click to see the shape of your thinking
              </h2>
              <p className="text-black/50 leading-relaxed mb-6">
                When your doc gets long and ideas start tangling, hit Visualize. AI extracts the logic into a map. See dependencies, spot gaps, understand the flow.
              </p>
              <p className="text-black/40 text-sm">
                The diagram updates as you write. Edit either side.
              </p>
            </div>
          </div>
                </div>
      </section>

      {/* Feature 3: Graph-Aware AI Actions */}
      <section className="py-24 px-6 bg-[#f5f3ef]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-6 leading-tight">
                AI that understands your reasoning graph
              </h2>
              <p className="text-black/50 leading-relaxed mb-6">
                Not generic editing. Select text and get graph-aware actions: "Paraphrase while preserving this claim" or "Find analogies connecting this node to earlier ideas."
              </p>
              <p className="text-black/40 text-sm mb-4">
                Cmd+K opens actions that know your argument structure.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Paraphrase", "Find similes", "Extract claims", "Counterargument", "Decompose"].map((action, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-100 text-xs font-medium text-violet-600">{action}</span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-lg">
              {/* Cmd+K Command Palette Demo */}
              <div className="mb-4 p-3 rounded-xl bg-[#fafafa] border border-black/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/5 text-[10px] font-mono text-black/40">
                    <span>⌘</span><span>K</span>
                  </div>
                  <span className="text-[10px] text-black/30">Quick Actions</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-50 border border-violet-100">
                    <div className="w-5 h-5 rounded bg-violet-500 flex items-center justify-center">
                      <Lightbulb size={10} className="text-white" />
                    </div>
                    <span className="text-xs text-black/70">Paraphrase preserving claims</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.02] transition-colors">
                    <div className="w-5 h-5 rounded bg-black/10 flex items-center justify-center">
                      <Target size={10} className="text-black/40" />
                    </div>
                    <span className="text-xs text-black/50">Extract as graph node</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.02] transition-colors">
                    <div className="w-5 h-5 rounded bg-black/10 flex items-center justify-center">
                      <AlertTriangle size={10} className="text-black/40" />
                    </div>
                    <span className="text-xs text-black/50">Generate counterargument</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-1">Graph-Aware</div>
                <p className="text-[11px] text-black/60">Actions understand node relationships and preserve your argument structure.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: Bi-directional Editing */}
      <section className="py-24 px-6 bg-[#ebe7e0]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 bg-white rounded-2xl border border-black/[0.06] p-6 shadow-lg">
              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-black/30 mb-2">Document</div>
                  <div className="text-xs text-black/60 leading-relaxed">
                    We should pursue direct sales because it gives us better margins...
                  </div>
                  <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Auto-synced
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <ChevronDown size={12} className="text-black/20 rotate-90" />
                    <ChevronDown size={12} className="text-black/20 -rotate-90" />
                  </div>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-[#fafafa] border border-black/[0.04]">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-black/30 mb-2">Graph</div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 rounded bg-blue-100 text-[10px] text-blue-700">Direct Sales</div>
                    <span className="text-black/20">→</span>
                    <div className="px-2 py-1 rounded bg-emerald-100 text-[10px] text-emerald-700">Margins</div>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-dashed border-black/10 bg-black/[0.01]">
                <p className="text-[11px] text-black/50 text-center">Edit either side. Changes sync automatically.</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-6 leading-tight">
                Bi-directional: text and graph stay in sync
              </h2>
              <p className="text-black/50 leading-relaxed mb-6">
                Edit your document, the graph updates. Reorganize nodes in the graph, trigger a rewrite. Your structure and prose work together, not against each other.
              </p>
              <p className="text-black/40 text-sm">
                Merge nodes, reorder arguments, and watch your document restructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 5: AI Gap Detection */}
      <section className="py-24 px-6 bg-[#f5f3ef]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-6 leading-tight">
                AI that questions your assumptions
              </h2>
              <p className="text-black/50 leading-relaxed mb-6">
                Not just summarization. Eliee surfaces what's missing: contradictions in your logic, assumptions you haven't validated, second-order effects you didn't consider.
              </p>
              <p className="text-black/40 text-sm">
                Think of it as a thinking partner, not a yes-man.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6 shadow-lg space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600 mb-2">Gap Detected</div>
                <p className="text-sm text-black/70">"Product ready" is assumed but no evidence supports this claim.</p>
                  </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100">
                <div className="text-[9px] font-bold uppercase tracking-wider text-rose-600 mb-2">Contradiction</div>
                <p className="text-sm text-black/70">Resource drain risk conflicts with aggressive Q4 timeline.</p>
                </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="text-[9px] font-bold uppercase tracking-wider text-blue-600 mb-2">Suggestion</div>
                <p className="text-sm text-black/70">Consider pilot program with 2-3 enterprise customers before full commit.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-6 bg-[#ebe7e0]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 
            className="text-3xl md:text-4xl text-black/90 tracking-tight mb-12"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            For anyone who needs to think before they act.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { role: "Founders", doing: "planning strategy" },
              { role: "Researchers", doing: "structuring arguments" },
              { role: "Students", doing: "writing theses" },
              { role: "Teams", doing: "making decisions" },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/60 border border-black/[0.04]">
                <p className="font-semibold text-black mb-1">{item.role}</p>
                <p className="text-xs text-black/40">{item.doing}</p>
                            </div>
            ))}
                            </div>
                         </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-[#f5f3ef]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 
            className="text-4xl md:text-5xl text-black tracking-tight mb-6"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
          >
            Try Eliee now.
          </h2>
          <a 
            href="/get-started"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-black text-white font-medium hover:bg-black/80 transition-all"
          >
            Start a new document
            <ChevronDown size={16} className="rotate-[-90deg]" />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-6 bg-[#e8e4dc] border-t border-black/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="flex items-center gap-2">
              <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-md" />
              <span className="font-medium text-black/70">Eliee</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-sm">
              <div>
                <p className="font-medium text-black/70 mb-3">Product</p>
                <div className="space-y-2 text-black/40">
                  <a href="#features" className="block hover:text-black transition-colors">Features</a>
                  <a href="/pricing" className="block hover:text-black transition-colors">Pricing</a>
                      </div>
                    </div>
              <div>
                <p className="font-medium text-black/70 mb-3">Resources</p>
                <div className="space-y-2 text-black/40">
                  <a href="#how" className="block hover:text-black transition-colors">How it works</a>
                  <a href="/auth" className="block hover:text-black transition-colors">Sign in</a>
                    </div>
                       </div>
              <div>
                <p className="font-medium text-black/70 mb-3">Legal</p>
                <div className="space-y-2 text-black/40">
                  <a href="/terms" className="block hover:text-black transition-colors">Terms</a>
                  <a href="/privacy" className="block hover:text-black transition-colors">Privacy</a>
                  </div>
              </div>
              <div>
                <p className="font-medium text-black/70 mb-3">Contact</p>
                <div className="space-y-2 text-black/40">
                  <a href="mailto:varun@teyra.app" className="block hover:text-black transition-colors">varun@teyra.app</a>
                </div>
        </div>
            </div>
          </div>
          <div className="mt-12 pt-6 border-t border-black/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-black/30">
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
