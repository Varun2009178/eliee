"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Trash2, AlertCircle, AlertTriangle, Lightbulb, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Types matching the API response
export interface QuickCheckSuggestion {
  type: "word" | "sentence";
  severity: "error" | "warning" | "improvement";
  original: string;
  replacement: string;
  reason: string;
  startIndex?: number;
  endIndex?: number;
}

interface QuickCheckPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  suggestions: QuickCheckSuggestion[];
  onApply: (suggestion: QuickCheckSuggestion) => void;
  onDismiss: (suggestion: QuickCheckSuggestion) => void;
  onApplyAll: () => void;
  onHoverSuggestion?: (suggestion: QuickCheckSuggestion | null) => void;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    badgeColor: "bg-rose-100 text-rose-700",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    badgeColor: "bg-amber-100 text-amber-700",
    label: "Warning",
  },
  improvement: {
    icon: Lightbulb,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
    label: "Suggestion",
  },
};

export function QuickCheckPanel({
  isOpen,
  onClose,
  isLoading,
  suggestions,
  onApply,
  onDismiss,
  onApplyAll,
  onHoverSuggestion,
}: QuickCheckPanelProps) {
  // Group suggestions by severity
  const groupedSuggestions = {
    error: suggestions.filter((s) => s.severity === "error"),
    warning: suggestions.filter((s) => s.severity === "warning"),
    improvement: suggestions.filter((s) => s.severity === "improvement"),
  };

  const totalCount = suggestions.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-[380px] h-full border-l border-black/[0.06] bg-[#fcfcfc] flex flex-col overflow-hidden flex-shrink-0"
          style={{ willChange: 'transform' }} // Optimize animation performance
          data-quick-check-panel
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center">
                <Wand2 size={16} className="text-black/50" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-black/80">Quick Check</h2>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide bg-amber-100 text-amber-700">
                    BETA
                  </span>
                </div>
                <p className="text-[11px] text-black/40">
                  {isLoading
                    ? "Analyzing..."
                    : totalCount === 0
                    ? "No issues found"
                    : `${totalCount} suggestion${totalCount === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/[0.04] rounded-lg transition-colors"
            >
              <X size={16} className="text-black/40" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-black/10 border-t-black/40 rounded-full animate-spin mb-4" />
                <p className="text-sm text-black/40">Analyzing your text...</p>
              </div>
            ) : totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Check size={24} className="text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-black/70 mb-1">Looking good!</p>
                <p className="text-xs text-black/40">No issues found in your text.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Render suggestions grouped by severity */}
                {(["error", "warning", "improvement"] as const).map((severity) => {
                  const items = groupedSuggestions[severity];
                  if (items.length === 0) return null;

                  const config = severityConfig[severity];

                  return (
                    <div key={severity}>
                      <div className="flex items-center gap-2 mb-3">
                        <config.icon size={14} className={config.color} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-black/40">
                          {config.label}s ({items.length})
                        </span>
                      </div>
                      <div className="space-y-3">
                        {items.map((suggestion, index) => (
                          <SuggestionCard
                            key={`${severity}-${index}`}
                            suggestion={suggestion}
                            onApply={() => onApply(suggestion)}
                            onDismiss={() => onDismiss(suggestion)}
                            onHover={onHoverSuggestion}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && totalCount > 0 && (
            <div className="px-4 py-3 border-t border-black/[0.06] bg-white">
              <button
                onClick={onApplyAll}
                className="w-full py-2.5 rounded-lg bg-black text-white text-[13px] font-medium hover:bg-black/90 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={14} />
                Apply All ({totalCount})
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  onHover,
}: {
  suggestion: QuickCheckSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  onHover?: (suggestion: QuickCheckSuggestion | null) => void;
}) {
  const config = severityConfig[suggestion.severity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, height: 0 }}
      onMouseEnter={() => onHover?.(suggestion)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-md",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* Type badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide",
            config.badgeColor
          )}
        >
          {suggestion.type === "word" ? "Word" : "Sentence"}
        </span>
      </div>

      {/* Before/After comparison */}
      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-black/30 uppercase mt-1 w-10">From</span>
          <span className="text-[13px] text-black/50 line-through flex-1">{suggestion.original}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[10px] font-medium text-black/30 uppercase mt-1 w-10">To</span>
          <span className={cn("text-[13px] font-medium flex-1", config.color)}>
            {suggestion.replacement}
          </span>
        </div>
      </div>

      {/* Reason */}
      <p className="text-[11px] text-black/50 mb-4">{suggestion.reason}</p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          className="flex-1 py-2 rounded-lg bg-black text-white text-[12px] font-medium hover:bg-black/90 transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={12} />
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-2 rounded-lg border border-black/10 text-[12px] text-black/50 hover:bg-white/50 transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}
