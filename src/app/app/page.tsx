"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { QuickCheckPanel, QuickCheckSuggestion } from "@/components/QuickCheckPanel";
import { cn } from "@/lib/utils";
import { getUserUsage, updateUserUsage, DocumentType } from "@/lib/db";
import { 
  X, 
  FileText, 
  Menu,
  Download,
  Eye,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Type,
  Target,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  Zap,
  FileDown,
  RefreshCw,
  LogOut,
  Home,
  Plus,
  Trash2,
  Check,
  Settings,
  Crown,
  Wand2,
  Send,
  ChevronDown,
  BookOpen,
  Quote,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  MoreVertical,
  LayoutPanelLeft,
  ListTree,
  GitMerge,
  CheckCheck
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import {
  getUserDocuments,
  createDocument,
  saveDocument,
  deleteDocument,
  Document,
  DocBlock,
  BlockType
} from "@/lib/db";
import posthog from "posthog-js";

// --- Types ---

interface VisualNode {
  id: string;
  label: string;
  type: string;
}

interface AIResult {
  essence: string;
  nodes: VisualNode[];
  connections: { from: string; to: string }[];
  gaps: string[];
  suggestions: string[];
  thoughts?: {
    gaps?: string[];
    suggestions?: string[];
    nodes?: Record<string, string>;
  };
}

// Block type metadata - INCREASED icon sizes for better visibility
const blockMeta: Record<BlockType, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  text: { label: "Text", icon: <Type size={16} />, color: "text-black/50", bgColor: "bg-transparent", borderColor: "border-transparent" },
  claim: { label: "Claim", icon: <Target size={16} />, color: "text-blue-600", bgColor: "bg-blue-50/60", borderColor: "border-blue-300" },
  assumption: { label: "Assumption", icon: <Lightbulb size={16} />, color: "text-amber-600", bgColor: "bg-amber-50/60", borderColor: "border-amber-300" },
  evidence: { label: "Evidence", icon: <Zap size={16} />, color: "text-emerald-600", bgColor: "bg-emerald-50/60", borderColor: "border-emerald-300" },
  decision: { label: "Decision", icon: <ArrowRight size={16} />, color: "text-purple-600", bgColor: "bg-purple-50/60", borderColor: "border-purple-300" },
  risk: { label: "Risk", icon: <AlertTriangle size={16} />, color: "text-rose-600", bgColor: "bg-rose-50/60", borderColor: "border-rose-300" },
  unknown: { label: "Unknown", icon: <HelpCircle size={16} />, color: "text-slate-600", bgColor: "bg-slate-50/60", borderColor: "border-slate-300" },
};

export default function AppPage() {
  const { data: session, isPending: sessionLoading } = useSession();
  const router = useRouter();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.push("/auth");
    }
  }, [session, sessionLoading, router]);

  // Document state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<"visualization" | "ai_native" | null>(null);
  const [canvasMode, setCanvasMode] = useState(false);
  const [blocks, setBlocks] = useState<DocBlock[]>([
    { id: "1", type: "text", content: "" }
  ]);
  const [docTitle, setDocTitle] = useState("Untitled");
  // Undo/Redo history
  const [history, setHistory] = useState<DocBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showDocumentTypeModal, setShowDocumentTypeModal] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  // UI state
  const [showVisualView, setShowVisualView] = useState(false);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const [showLimitReachedModal, setShowLimitReachedModal] = useState(false);
  const [limitReachedAction, setLimitReachedAction] = useState<string | null>(null);
  const [showDocLimitModal, setShowDocLimitModal] = useState(false);

  // Free tier limits
  const FREE_DOCUMENT_LIMIT = 3;

  // Focus Mode (Cursor-style AI assistant)
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [focusModel, setFocusModel] = useState<"fast" | "balanced" | "quality">("fast");
  const [focusChat, setFocusChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [focusInput, setFocusInput] = useState("");
  const [isFocusLoading, setIsFocusLoading] = useState(false);
  const [selectedText, setSelectedText] = useState(""); // Keep for Focus mode replace functionality
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; textarea?: HTMLTextAreaElement } | null>(null);
  const focusChatRef = useRef<HTMLDivElement>(null);

  // First-time feature popups
  const [showFocusIntro, setShowFocusIntro] = useState(false);
  const [showVisualizeIntro, setShowVisualizeIntro] = useState(false);
  const [dontShowFocusIntro, setDontShowFocusIntro] = useState(false);
  const [dontShowVisualizeIntro, setDontShowVisualizeIntro] = useState(false);

  // Free tier usage tracking
  const [focusUsage, setFocusUsage] = useState<Record<string, number>>({
    check_logic: 0,
    fact_check: 0,
    synonyms: 0,
    expand: 0,
    simplify: 0,
    explain: 0,
    improve: 0,
    chat: 0,
    quick_check: 0,
  });
  const [isPro, setIsPro] = useState(false);
  const [premiumPromptsUsed, setPremiumPromptsUsed] = useState(0);
  const [premiumPromptsLimit, setPremiumPromptsLimit] = useState(150);
  const [showMobileWarning, setShowMobileWarning] = useState(false);
  const [mobileWarningDismissed, setMobileWarningDismissed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [focusViewMode, setFocusViewMode] = useState<"text" | "icons">("text");
  
  // Resizable focus (assistant) state
  const [focusWidth, setFocusWidth] = useState(380);
  const [isResizingFocus, setIsResizingFocus] = useState(false);

  // Inline suggestions (Grammarly-style) - BETA
  const [inlineSuggestion, setInlineSuggestion] = useState<{
    show: boolean;
    content: string;
    type: string;
    position: { top: number; left: number };
    blockId: string;
    isLoading: boolean;
  }>({ show: false, content: "", type: "", position: { top: 0, left: 0 }, blockId: "", isLoading: false });
  // Quick Check Panel state
  const [showQuickCheckPanel, setShowQuickCheckPanel] = useState(false);
  const [quickCheckLoading, setQuickCheckLoading] = useState(false);
  const [quickCheckSuggestions, setQuickCheckSuggestions] = useState<QuickCheckSuggestion[]>([]);
  const [quickCheckBlockId, setQuickCheckBlockId] = useState<string | null>(null);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<QuickCheckSuggestion | null>(null);
  const [showQuickCheckBetaModal, setShowQuickCheckBetaModal] = useState(false);
  // Cache for Quick Check - store last checked text and suggestions
  const quickCheckCacheRef = useRef<{ text: string; suggestions: QuickCheckSuggestion[] } | null>(null);
  
  // Prevent layout shift by ensuring sidebar has initial width
  const [sidebarMounted, setSidebarMounted] = useState(false);
  
  useEffect(() => {
    // Set mounted after first render to prevent hydration mismatch
    setSidebarMounted(true);
  }, []);

  const FREE_LIMITS: Record<string, number> = {
    check_logic: 3,
    fact_check: 3,
    paraphrase_preserve: 2,
    find_similes: 2,
    decompose_claims: 2,
    counterargument: 2,
    expand: 1,
    simplify: 1,
    explain: 1,
    improve: 1,
    chat: 10,
    quick_check: 3,
  };

  // Load usage from Supabase (reload on session change and on mount)
  useEffect(() => {
    const loadUsage = async () => {
      if (session?.user?.id) {
        try {
          const usageData = await getUserUsage(session.user.id);
          if (usageData) {
            if (usageData.focus_usage) {
              setFocusUsage(usageData.focus_usage);
            }
            if (usageData.is_pro !== undefined) {
              setIsPro(usageData.is_pro);
            }
            if (usageData.premium_prompts_used !== undefined) {
              setPremiumPromptsUsed(usageData.premium_prompts_used);
            }
            if (usageData.premium_prompts_limit !== undefined) {
              setPremiumPromptsLimit(usageData.premium_prompts_limit);
            }
          }
        } catch (error) {
          console.error("Failed to load usage:", error);
        }
      }
    };
    loadUsage();
    
    // Also reload when window regains focus (in case user switched tabs)
    const handleFocus = () => {
      if (session?.user?.id) {
        loadUsage();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session]);

  // Check if first time user
  useEffect(() => {
    if (typeof window !== "undefined" && session?.user?.id) {
      const hasSeenOnboarding = localStorage.getItem(`eliee_onboarding_${session.user.id}`);
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
    }
  }, [session]);

  // Check if user just upgraded (from Stripe redirect)
  useEffect(() => {
    const checkUpgrade = async () => {
      if (typeof window !== "undefined" && session?.user?.id) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("upgraded") === "true") {
          // Remove query param immediately to prevent re-triggering
          window.history.replaceState({}, "", "/app");

          try {
            // Verify subscription directly with Stripe and update database
            const verifyRes = await fetch("/api/stripe/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: session.user.id }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.isPro) {
              setIsPro(true);
              setPremiumPromptsUsed(0);
              setPremiumPromptsLimit(150);
              setShowUpgradeSuccess(true);
              console.log("Subscription verified with Stripe");
              return;
            }
          } catch (err) {
            console.error("Failed to verify with Stripe:", err);
          }

          // Fallback: Poll database for Pro status (webhook might be processing)
          let attempts = 0;
          const maxAttempts = 5;
          const pollInterval = 2000;

          const pollForProStatus = async (): Promise<boolean> => {
            const usageData = await getUserUsage(session.user.id);
            return usageData?.is_pro === true;
          };

          let proStatus = await pollForProStatus();
          while (!proStatus && attempts < maxAttempts) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            proStatus = await pollForProStatus();
          }

          // Show success regardless - payment was successful (Stripe only redirects on success)
          setIsPro(true);
          setPremiumPromptsUsed(0);
          setPremiumPromptsLimit(150);
          setShowUpgradeSuccess(true);

          if (!proStatus) {
            console.log("Note: Database not yet updated, but Stripe payment was successful");
          }
        }
      }
    };
    checkUpgrade();
  }, [session]);

  const completeOnboarding = () => {
    if (session?.user?.id) {
      localStorage.setItem(`eliee_onboarding_${session.user.id}`, "true");
    }
    setShowOnboarding(false);
    // User is already in the app, so no need to redirect
  };

  // Reference to the scroll container
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    // Get the scroll container
    const scrollContainer = scrollContainerRef.current;
    const scrollPos = scrollContainer?.scrollTop || 0;
    
    // Resize the textarea
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    
    // Restore scroll position
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollPos;
    }
  }, []);

  // Load documents from Supabase on mount
  useEffect(() => {
    if (!sessionLoading && session?.user?.id) {
      const userId = session.user.id;
      setIsLoadingDocs(true);
      getUserDocuments(userId)
        .then(async (docs) => {
          if (docs.length > 0) {
            setDocuments(docs);
            // Load the most recent document
            const firstDoc = docs[0];
            const docType = firstDoc.document_type || "visualization";
            setCurrentDocId(firstDoc.id);
            setDocTitle(firstDoc.title);
            setDocumentType(docType);
            const loadedBlocks = (firstDoc.blocks || [{ id: "1", type: "text", content: "" }]).map(b => ({
              ...b,
              content: b.content || ""
            }));
            setBlocks(loadedBlocks);
            // Initialize history with loaded blocks
            const initialHistory = [JSON.parse(JSON.stringify(loadedBlocks))];
            setHistory(initialHistory);
            setHistoryIndex(0);
            
            // Restore visualization result if it exists
            if (firstDoc.visualization_result) {
              setAIResult(firstDoc.visualization_result);
              setShowVisualView(true);
            } else {
              setShowVisualView(false);
              setAIResult(null);
            }
            
            // Auto-open Focus Mode for AI Native documents
            if (docType === "ai_native") {
              setShowFocusMode(true);
            } else {
              setShowFocusMode(false);
            }
          } else {
            // No documents - auto-create AI Native document
            handleCreateDocumentWithType("ai_native");
          }
        })
        .catch((err) => {
          console.error("Failed to load documents:", err);
          setError("Failed to load documents");
        })
        .finally(() => setIsLoadingDocs(false));
    }
  }, [session, sessionLoading]);

  // Auto-resize all textareas when blocks change (fixes disappearing text)
  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea) => {
        if (textarea instanceof HTMLTextAreaElement) {
          autoResize(textarea);
        }
      });
    });
  }, [blocks, autoResize]);

  // Auto-generate title from first block if still "Untitled"
  useEffect(() => {
    if (docTitle === "Untitled" && blocks.length > 0) {
      const firstContent = blocks[0].content.trim();
      if (firstContent.length > 0) {
        // Take first 30 chars of first line
        const firstLine = firstContent.split('\n')[0].substring(0, 30);
        setDocTitle(firstLine + (firstLine.length >= 30 ? "..." : ""));
      }
    }
  }, [blocks, docTitle]);

  // Auto-save when blocks or title change (debounced)
  useEffect(() => {
    if (!currentDocId || !session?.user?.id || sessionLoading) return;

    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1.5 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveDocument(currentDocId, session.user.id, {
          title: docTitle,
          blocks: blocks,
          document_type: documentType || "visualization",
        });
        setLastSaved(new Date());
        // Update local documents list
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === currentDocId
              ? { ...d, title: docTitle, blocks: blocks, updated_at: new Date().toISOString() }
              : d
          )
        );
      } catch (err) {
        console.error("Failed to save:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [blocks, docTitle, currentDocId, session, sessionLoading]);

  // Create new document - auto-creates AI Native document
  const handleNewDocument = () => {
    // Check document limit for free users
    if (!isPro && documents.length >= FREE_DOCUMENT_LIMIT) {
      setShowDocLimitModal(true);
      return;
    }
    // Auto-create AI Native document (default)
    handleCreateDocumentWithType("ai_native");
  };

  const handleCreateDocumentWithType = async (type: "visualization" | "ai_native") => {
    if (!session?.user?.id) return;

    try {
      const newDoc = await createDocument(session.user.id, "Untitled", type);
      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentDocId(newDoc.id);
      setDocTitle(newDoc.title);
      setDocumentType(newDoc.document_type || type);
      const createdBlocks = (newDoc.blocks || []).map(b => ({
        ...b,
        content: b.content || ""
      }));
      setBlocks(createdBlocks);
      // Initialize history with created blocks
      const initialHistory = [JSON.parse(JSON.stringify(createdBlocks))];
      setHistory(initialHistory);
      setHistoryIndex(0);
      setShowVisualView(false);
      setAIResult(null);
      setShowDocumentTypeModal(false);

      // Track document creation
      posthog.capture("document_created", {
        document_type: type,
        document_id: newDoc.id,
      });
      // Auto-open Focus Mode for AI Native documents
      if (type === "ai_native") {
        setShowFocusMode(true);
      } else {
        setShowFocusMode(false);
        // Show visualization intro for new visualization documents
        const hasSeenVisualizeIntro = localStorage.getItem(`eliee_visualize_intro_${session.user.id}`);
        if (!hasSeenVisualizeIntro) {
          setShowVisualizeIntro(true);
        }
      }
    } catch (err) {
      console.error("Failed to create document:", err);
      setError("Failed to create document");
    }
  };

  // Switch to a different document
  const handleSelectDocument = (doc: Document) => {
    setCurrentDocId(doc.id);
    setDocTitle(doc.title);
    const docType = doc.document_type || "visualization";
    setDocumentType(docType);
    const selectedBlocks = (doc.blocks || [{ id: "1", type: "text", content: "" }]).map(b => ({
      ...b,
      content: b.content || ""
    }));
      setBlocks(selectedBlocks);
      // Initialize history with selected blocks
      const initialHistory = [JSON.parse(JSON.stringify(selectedBlocks))];
      setHistory(initialHistory);
      setHistoryIndex(0);
      
      // Restore visualization result if it exists
      if (doc.visualization_result) {
        setAIResult(doc.visualization_result);
        setShowVisualView(true);
      } else {
        setShowVisualView(false);
        setAIResult(null);
      }
      
      // Auto-open Focus Mode for AI Native documents
      if (docType === "ai_native") {
        setShowFocusMode(true);
      } else {
        setShowFocusMode(false);
      }
    };

  // Switch document type
  const handleSwitchDocumentType = async () => {
    if (!session?.user?.id || !currentDocId) return;

    const newType: DocumentType = documentType === "visualization" ? "ai_native" : "visualization";

    try {
      // When switching to AI Native, convert all blocks to text type (keeping content)
      let newBlocks = blocks;
      if (newType === "ai_native") {
        newBlocks = blocks.map(block => ({
          ...block,
          type: "text" as const  // Convert all blocks to text
        }));
        setBlocks(newBlocks);
      }

      await saveDocument(currentDocId, session.user.id, {
        document_type: newType,
        blocks: newBlocks
      });

      setDocumentType(newType);

      // Update local documents list
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === currentDocId ? { ...d, document_type: newType, blocks: newBlocks } : d
        )
      );

      // When switching to AI Native, auto-open Focus Mode
      // Keep aiResult so AI can reference the visualization data
      if (newType === "ai_native") {
        setShowFocusMode(true);
        setShowVisualView(false);
        // Add initial context message about the visualization
        if (aiResult) {
          setFocusChat([{
            role: "assistant",
            content: `I've analyzed your document and found ${aiResult.nodes?.length || 0} key concepts. The core premise is: "${aiResult.essence || 'No essence extracted'}". I can help you work with the logical structure - try asking me to extract claims, reorganize your argument, or explore gaps in your reasoning.`
          }]);
        }
      } else {
        setShowFocusMode(false);
        setShowVisualView(false);
      }
    } catch (err) {
      console.error("Failed to switch document type:", err);
      setError("Failed to switch document type");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Delete a document
  const handleDeleteDocument = async (docId: string) => {
    if (!session?.user?.id) return;
    try {
      await deleteDocument(docId, session.user.id);
      const remaining = documents.filter((d) => d.id !== docId);
      setDocuments(remaining);
      // If we deleted the current doc, switch to another or create new
      if (currentDocId === docId) {
        if (remaining.length > 0) {
          handleSelectDocument(remaining[0]);
        } else {
          handleNewDocument();
        }
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
      setError("Failed to delete document");
    }
  };

  const wordCount = useMemo(() => {
    return blocks.reduce((count, block) => {
      return count + block.content.trim().split(/\s+/).filter(w => w.length > 0).length;
    }, 0);
  }, [blocks]);

  // Save to history when blocks change (debounced)
  const saveToHistory = useCallback((newBlocks: DocBlock[]) => {
    setHistory(prev => {
      // Remove any history after current index (when undoing then making new changes)
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(JSON.parse(JSON.stringify(newBlocks))); // Deep clone
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: DocBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    };
    setBlocks(prev => {
      const updated = [...prev];
      updated.splice(insertIndex + 1, 0, newBlock);
      saveToHistory(updated);
      return updated;
    });
    setShowCommandMenu(false);
  }, [insertIndex, saveToHistory]);

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          // Ensure content is always a string, never undefined or null
          return { ...b, content: content || "" };
        }
        return b;
      });
      // Save to history after a short delay (debounce)
      setTimeout(() => saveToHistory(updated), 500);
      return updated;
    });
  }, [saveToHistory]);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => {
      const updated = prev.length > 1 ? prev.filter(b => b.id !== id) : prev;
      saveToHistory(updated);
      return updated;
    });
  }, [saveToHistory]);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    // Only show context menu for visualization documents and when focus mode is off
    if (showFocusMode || documentType !== "visualization") return;

    e.preventDefault();
    e.stopPropagation();
    const maxX = window.innerWidth - 280;
    const maxY = window.innerHeight - 350;
    setMenuPos({ x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY) });
    // Insert AFTER this block (at index + 1)
    setInsertIndex(index);
    setShowCommandMenu(true);
  }, [showFocusMode, documentType]);

  const handleDocContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show context menu for visualization documents and when focus mode is off
    if (showFocusMode || documentType !== "visualization") return;

    e.preventDefault();
    const maxX = window.innerWidth - 280;
    const maxY = window.innerHeight - 350;
    setMenuPos({ x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY) });
    // Insert at the end
    setInsertIndex(blocks.length - 1);
    setShowCommandMenu(true);
  }, [blocks.length, showFocusMode, documentType]);

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const draggedIndex = blocks.findIndex(b => b.id === draggedId);
    const targetIndex = blocks.findIndex(b => b.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;
    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, draggedBlock);
    setBlocks(newBlocks);
  };
  const handleDragEnd = () => setDraggedId(null);

  // Check mobile device on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      setIsMobileDevice(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Default close on mobile
        // Show optimization hint briefly
        setTimeout(() => setShowMobileWarning(true), 1000);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle resizing
  // Handle resizing (Assistant only)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingFocus) {
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 300) newWidth = 300; // min width
        if (newWidth > 800) newWidth = 800; // max width
        setFocusWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingFocus(false);
    };

    if (isResizingFocus) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingFocus]);

  const handleVisualize = async () => {
    const allText = blocks.map(b => b.content).join("\n\n");
    if (allText.trim().length < 20) {
      setError("Write a bit more before visualizing");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check mobile and show warning (only if not dismissed)
    if (isMobileDevice && !mobileWarningDismissed) {
      setShowMobileWarning(true);
      return;
    }

    // Visualization is FREE for everyone - no limits!
    setIsAnalyzing(true);
    setError(null);

    // Track visualization generation
    posthog.capture("visualization_generated", {
      document_id: currentDocId,
      text_length: allText.length,
      block_count: blocks.length,
    });

    try {
      // Send blocks with type information so visualization can use structured blocks
      const res = await fetch("/api/visualize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: allText,
          blocks: blocks.map(b => ({ type: b.type, content: b.content }))
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.result) {
        setAIResult(data.result);
        setShowVisualView(true);

        // Save visualization result to document
        if (currentDocId && session?.user?.id) {
          try {
            const { saveDocument } = await import("@/lib/db");
            await saveDocument(currentDocId, session.user.id, {
              visualization_result: data.result
            });
          } catch (err) {
            console.error("Failed to save visualization result:", err);
          }
        }
      }
    } catch (e: any) {
      setError("Visualization temporarily unavailable. Try again.");
      posthog.captureException(e);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertToDoc = () => {
    if (!aiResult) return;
    const newBlocks: DocBlock[] = aiResult.nodes.map((node, i) => ({
      id: `gen-${i}-${Date.now()}`,
      type: (node.type?.toLowerCase() as BlockType) || "claim",
      content: node.label,
    }));
    if (newBlocks.length > 0) setBlocks(newBlocks);
    setShowVisualView(false);
  };

  const handleDownloadPDF = () => {
    // Track document export
    posthog.capture("document_exported", {
      document_id: currentDocId,
      format: "pdf",
      word_count: wordCount,
    });

    const printContent = `
      <html>
        <head><title>${docTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 60px; max-width: 700px; margin: 0 auto; }
          h1 { font-size: 28px; margin-bottom: 8px; }
          .meta { color: #888; font-size: 12px; margin-bottom: 40px; }
          .block { margin-bottom: 16px; }
          .block-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
          .block-content { font-size: 15px; line-height: 1.7; color: #333; white-space: pre-wrap; }
          @media print {
            body { padding: 40px; }
          }
        </style></head>
        <body>
          <h1>${docTitle}</h1>
          <div class="meta">${wordCount} words · ${new Date().toLocaleDateString()}</div>
          ${blocks.map(b => `<div class="block">${b.type !== 'text' ? `<div class="block-label">${blockMeta[b.type].label}</div>` : ''}<div class="block-content">${b.content || ''}</div></div>`).join('')}
        </body>
      </html>
    `;

    // Use a hidden iframe to prevent popup blockers
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.write(printContent);
      doc.close();

      // Wait for content to load then print
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
        // Cleanup after print dialog usage (delay to allow dialog to open)
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 2000);
      };
      
      // Fallback if onload doesn't fire immediately (sometimes needed)
      if (iframe.contentWindow) {
         // Some browsers fire onload instantly if write is sync
         setTimeout(() => {
           if(document.body.contains(iframe)) {
              // Trigger manually if needed or just let the onload handle it
           }
         }, 500);
      }
    }
    
    setShowExportMenu(false);
  };

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
        },
      },
    });
  };

  // --- Focus Mode Functions ---

  // Selection tracking for Focus mode (for replace functionality)
  useEffect(() => {
    if (!showFocusMode) {
      setSelectedText("");
      setSelectedRange(null);
      return;
    }

    const handleSelection = (e?: Event) => {
      // Ignore selection changes from Focus sidebar interactions
      const target = e?.target as HTMLElement;
      if (target && typeof target.closest === 'function' && (target.closest('.focus-sidebar') || target.closest('[data-focus-sidebar]'))) {
        return;
      }

      setTimeout(() => {
        try {
          // Check for textarea selections first
          const activeElement = document.activeElement;
          if (activeElement && activeElement.tagName === 'TEXTAREA') {
            const textarea = activeElement as HTMLTextAreaElement;
            // Ensure inputs are within the editor
            if (!textarea.closest('[data-editor-content="true"]')) return;

            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            if (start !== end) {
              const text = textarea.value.substring(start, end);
              if (text.length > 0 && text.length < 1000) {
                setSelectedText(text);
                setSelectedRange({ start, end, textarea });
                return;
              }
            }
          }

          // Check for regular text selections
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            let anchorNode = selection.anchorNode;
            // Handle text nodes
            if (anchorNode && anchorNode.nodeType === 3) {
              anchorNode = anchorNode.parentElement;
            }
            
            // Verify selection is inside the editor
            const element = anchorNode as HTMLElement;
            if (!element || !element.closest || !element.closest('[data-editor-content="true"]')) {
               return; 
            }

            const text = selection.toString().trim();
            if (text.length > 0 && text.length < 1000) {
              setSelectedText(text);
              // Store the range for later replacement
              const range = selection.getRangeAt(0).cloneRange();
              setSelectedRange({ start: 0, end: 0 }); // Will use the range directly
              // Store the range in a way we can access it later
              (window as any).__lastSelectionRange = range;
              return;
            }
          }
          
          // Don't clear selection on empty - keep it until user makes a new selection
          // This way clicking buttons won't clear the selection
        } catch (error) {
          // Ignore errors - keep existing selection
        }
      }, 10);
    };

    document.addEventListener("selectionchange", handleSelection);
    document.addEventListener("mouseup", handleSelection);
    document.addEventListener("select", handleSelection); // For textarea selections

    return () => {
      document.removeEventListener("selectionchange", handleSelection);
      document.removeEventListener("mouseup", handleSelection);
      document.removeEventListener("select", handleSelection);
    };
  }, [showFocusMode]);

  // Toggle Focus Mode with intro popup check
  const handleToggleFocusMode = () => {
    if (showVisualView) {
      setError("Please 'Sync to Editor' first to use Assistant.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (showFocusMode) {
      setShowFocusMode(false);
    } else {
      // Close Quick Check panel if open
      if (showQuickCheckPanel) {
        setShowQuickCheckPanel(false);
      }
      // Check if first time
      const hasSeenFocusIntro = localStorage.getItem(`eliee_focus_intro_${session?.user?.id}`);
      if (!hasSeenFocusIntro && !dontShowFocusIntro) {
        setShowFocusIntro(true);
      } else {
        setShowFocusMode(true);
      }
    }
  };

  // Toggle Visualize with intro popup check
  const handleToggleVisualize = async () => {
    if (showFocusMode) {
      // Can't visualize while in Focus Mode
      return;
    }
    
    // If already in visualize view, allow re-visualizing
    if (showVisualView) {
      await handleVisualize();
      return;
    }
    
    const hasSeenVisualizeIntro = localStorage.getItem(`eliee_visualize_intro_${session?.user?.id}`);
    if (!hasSeenVisualizeIntro && !dontShowVisualizeIntro) {
      setShowVisualizeIntro(true);
    } else {
      await handleVisualize();
    }
  };

  const completeFocusIntro = (dontShowAgain: boolean) => {
    if (dontShowAgain && session?.user?.id) {
      localStorage.setItem(`eliee_focus_intro_${session.user.id}`, "true");
    }
    setShowFocusIntro(false);
    setShowFocusMode(true);
  };

  const completeVisualizeIntro = async (dontShowAgain: boolean) => {
    if (dontShowAgain && session?.user?.id) {
      localStorage.setItem(`eliee_visualize_intro_${session.user.id}`, "true");
    }
    setShowVisualizeIntro(false);
    // Actually perform the visualization
    await handleVisualize();
  };

  // --- Quick Check Functions ---

  // Toggle Quick Check panel and run check
  const handleToggleQuickCheck = useCallback(async () => {
    if (showQuickCheckPanel) {
      setShowQuickCheckPanel(false);
      return;
    }

    // Get all text content from blocks
    const fullText = blocks.map(b => b.content).join("\n\n").trim();
    if (!fullText || fullText.length < 20) {
      setError("Add more text before running Quick Check");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check if we have cached suggestions for this exact text
    if (quickCheckCacheRef.current && quickCheckCacheRef.current.text === fullText) {
      setShowQuickCheckPanel(true);
      setQuickCheckSuggestions(quickCheckCacheRef.current.suggestions);
      setQuickCheckBlockId(blocks[0]?.id || null);
      return;
    }

    // Check free tier limit (unless Pro user)
    if (!isPro) {
      const used = focusUsage["quick_check"] || 0;
      const limit = FREE_LIMITS["quick_check"] || 3;
      if (used >= limit) {
        setLimitReachedAction("quick_check");
        setShowLimitReachedModal(true);
        return;
      }
    }

    // Close Focus Mode if open
    if (showFocusMode) {
      setShowFocusMode(false);
    }

    setShowQuickCheckPanel(true);
    setQuickCheckLoading(true);
    setQuickCheckSuggestions([]);
    setQuickCheckBlockId(blocks[0]?.id || null);

    // Track usage for non-pro users
    if (!isPro) {
      const newUsage = { ...focusUsage, quick_check: (focusUsage["quick_check"] || 0) + 1 };
      setFocusUsage(newUsage);
      if (session?.user?.id) {
        try {
          await updateUserUsage(session.user.id, newUsage);
        } catch (error) {
          console.error("Failed to save usage:", error);
        }
      }
    }

    // Track in PostHog
    posthog.capture("quick_check_used", {
      text_length: fullText.length,
      is_pro: isPro,
    });

    try {
      const response = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "interactive_check",
          text: fullText,
          userId: session?.user?.id,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const result = data.result;
      const suggestions = result.suggestions || [];
      
      // Cache the results
      quickCheckCacheRef.current = {
        text: fullText,
        suggestions: suggestions,
      };
      
      setQuickCheckSuggestions(suggestions);
    } catch (error: any) {
      console.error("Quick Check error:", error);
      setError("Failed to analyze text");
      setTimeout(() => setError(null), 3000);
    } finally {
      setQuickCheckLoading(false);
    }
  }, [showQuickCheckPanel, blocks, showFocusMode, session, isPro, focusUsage, FREE_LIMITS]);

  // Apply a single suggestion
  const applyQuickCheckSuggestion = useCallback((suggestion: QuickCheckSuggestion) => {
    // Find the block that contains this suggestion
    const fullText = blocks.map(b => b.content).join("\n\n");
    
    // Use startIndex if available, otherwise fall back to indexOf
    let suggestionIndex = suggestion.startIndex !== undefined 
      ? suggestion.startIndex 
      : fullText.indexOf(suggestion.original);

    if (suggestionIndex === -1) {
      // Original text not found, remove suggestion from list
      setQuickCheckSuggestions(prev => prev.filter(s => s !== suggestion));
      return;
    }

    // Verify the text at this position matches
    const textAtPosition = suggestion.endIndex !== undefined
      ? fullText.slice(suggestionIndex, suggestion.endIndex)
      : fullText.slice(suggestionIndex, suggestionIndex + suggestion.original.length);
    
    if (textAtPosition !== suggestion.original) {
      // Text has changed, try to find it
      suggestionIndex = fullText.indexOf(suggestion.original);
      if (suggestionIndex === -1) {
        setQuickCheckSuggestions(prev => prev.filter(s => s !== suggestion));
        return;
      }
    }

    // Find which block contains this text and update it
    let currentIndex = 0;
    for (const block of blocks) {
      const blockEnd = currentIndex + block.content.length;
      const relativeStart = suggestionIndex - currentIndex;

      if (relativeStart >= 0 && relativeStart < block.content.length) {
        // This block contains the suggestion
        const newContent = block.content.slice(0, relativeStart) +
          suggestion.replacement +
          block.content.slice(relativeStart + suggestion.original.length);

        setBlocks(prev => prev.map(b =>
          b.id === block.id ? { ...b, content: newContent } : b
        ));
        break;
      }
      currentIndex = blockEnd + 2; // +2 for "\n\n" separator
    }

    // Clear cache since text has changed
    quickCheckCacheRef.current = null;
    
    // Remove applied suggestion from list
    setQuickCheckSuggestions(prev => prev.filter(s => s !== suggestion));
  }, [blocks]);

  // Dismiss a suggestion (remove from list without applying)
  const dismissQuickCheckSuggestion = useCallback((suggestion: QuickCheckSuggestion) => {
    setQuickCheckSuggestions(prev => prev.filter(s => s !== suggestion));
  }, []);

  // Apply all suggestions (sorted by position descending to avoid index shift)
  const applyAllQuickCheckSuggestions = useCallback(() => {
    // Get current full text
    let fullText = blocks.map(b => b.content).join("\n\n");
    
    // Filter suggestions that have valid indices and sort by startIndex descending
    // This ensures we apply from end to start to avoid index shifting issues
    const sortedSuggestions = [...quickCheckSuggestions]
      .filter(s => s.startIndex !== undefined && s.endIndex !== undefined)
      .sort((a, b) => (b.startIndex || 0) - (a.startIndex || 0));

    // Apply each suggestion using the stored indices
    for (const suggestion of sortedSuggestions) {
      const startIndex = suggestion.startIndex!;
      const endIndex = suggestion.endIndex!;
      
      // Verify the original text still matches at this position
      const textAtPosition = fullText.slice(startIndex, endIndex);
      if (textAtPosition === suggestion.original) {
        // Apply the replacement
        fullText = fullText.slice(0, startIndex) + suggestion.replacement + fullText.slice(endIndex);
      } else {
        // Text has changed, try to find it using indexOf as fallback
        const fallbackIndex = fullText.indexOf(suggestion.original, startIndex - 50); // Search near original position
        if (fallbackIndex !== -1) {
          fullText = fullText.slice(0, fallbackIndex) + suggestion.replacement + fullText.slice(fallbackIndex + suggestion.original.length);
        }
      }
    }

    // Split back into blocks
    if (blocks.length === 1) {
      setBlocks([{ ...blocks[0], content: fullText }]);
    } else {
      // For multiple blocks, split by double newlines
      const parts = fullText.split("\n\n");
      const newBlocks = blocks.map((block, i) => ({
        ...block,
        content: parts[i] || ""
      }));
      setBlocks(newBlocks);
    }

    // Clear cache since text has changed
    quickCheckCacheRef.current = null;
    setQuickCheckSuggestions([]);
  }, [quickCheckSuggestions, blocks]);

  // Keyboard shortcuts: Cmd/Ctrl + K to toggle Focus Mode, Cmd/Ctrl + Shift + C for Quick Check, Cmd/Ctrl + Z for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Toggle Focus Mode (works for AI Native documents)
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!showVisualView) {
          // Only allow Focus Mode for AI Native documents
          if (documentType === "ai_native") {
            handleToggleFocusMode();
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + C: Toggle Quick Check
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        if (!showVisualView && documentType === "ai_native") {
          handleToggleQuickCheck();
        }
        return;
      }

      // Cmd/Ctrl + Z: Undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (history.length > 0 && historyIndex > 0) {
          const newIndex = historyIndex - 1;
          const historyState = history[newIndex];
          if (historyState) {
            setHistoryIndex(newIndex);
            setBlocks(JSON.parse(JSON.stringify(historyState))); // Deep clone
          }
        }
        return;
      }

      // Cmd/Ctrl + Shift + Z: Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        if (history.length > 0 && historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          const historyState = history[newIndex];
          if (historyState) {
            setHistoryIndex(newIndex);
            setBlocks(JSON.parse(JSON.stringify(historyState))); // Deep clone
          }
        }
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showVisualView, history, historyIndex, documentType, handleToggleQuickCheck]);

  // Check if action is allowed (free tier limits) - memoized for performance
  const isActionAllowed = useCallback((action: string): boolean => {
    // Pro users have unlimited access
    if (isPro) return true;

    const limit = FREE_LIMITS[action] || 0;
    const used = focusUsage[action] || 0;
    return used < limit;
  }, [isPro, focusUsage, FREE_LIMITS]);

  const getRemainingUses = useCallback((action: string): number => {
    // Pro users have unlimited
    if (isPro) return Infinity;

    const limit = FREE_LIMITS[action] || 0;
    const used = focusUsage[action] || 0;
    return Math.max(0, limit - used);
  }, [isPro, focusUsage, FREE_LIMITS]);

  const handleFocusAction = useCallback(async (action: string, text?: string) => {
    const textToProcess = text || selectedText;
    if (!textToProcess?.trim()) return;

    // Check free tier limit
    if (!isActionAllowed(action)) {
      setLimitReachedAction(action);
      setShowLimitReachedModal(true);
      return;
    }

    // Track AI action usage
    if (action === "chat") {
      posthog.capture("focus_mode_chat_sent", {
        model: focusModel,
        text_length: textToProcess.length,
        is_pro: isPro,
      });
    } else {
      posthog.capture("ai_action_used", {
        action_type: action,
        model: focusModel,
        text_length: textToProcess.length,
        is_pro: isPro,
        document_id: currentDocId,
      });
    }

    setIsFocusLoading(true);

    // Only clear selection after successful action (moved down)
    // Update usage (only for non-pro users)
    if (!isPro) {
      const newUsage = { ...focusUsage, [action]: (focusUsage[action] || 0) + 1 };
      setFocusUsage(newUsage);
      if (session?.user?.id) {
        try {
          await updateUserUsage(session.user.id, newUsage);
          // Reload usage to ensure it's saved
          const updatedUsage = await getUserUsage(session.user.id);
          if (updatedUsage?.focus_usage) {
            setFocusUsage(updatedUsage.focus_usage);
          }
        } catch (error) {
          console.error("Failed to save usage:", error);
        }
      }
    }

    // Add user message to chat
    const actionLabel = action === "chat" ? textToProcess : `[${action.toUpperCase()}] "${textToProcess.substring(0, 50)}${textToProcess.length > 50 ? "..." : ""}"`;
    setFocusChat(prev => [...prev, { role: "user", content: actionLabel }]);

    try {
      // Pass all document text as context (up to 4000 chars for better context)
      const context = blocks.map(b => b.content).join("\n\n").substring(0, 4000);

      // Include graph structure if available (for graph-aware actions)
      const graphStructure = aiResult?.nodes ? {
        nodes: aiResult.nodes,
        edges: aiResult.connections || []
      } : undefined;

      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: textToProcess,
          context,
          graphStructure,
          model: focusModel,
          userId: session?.user?.id
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      // Update premium prompt tracking if Pro user
      if (isPro && data.premiumPromptsRemaining !== undefined) {
        setPremiumPromptsUsed(premiumPromptsLimit - data.premiumPromptsRemaining);
      }

      // Format AI response for better readability
      let formattedResult = data.result || "";
      // Remove excessive markdown formatting but keep structure
      formattedResult = formattedResult
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/^#{1,6}\s+/gm, '') // Remove headers
        .replace(/```[\s\S]*?```/g, (match: string) => match.replace(/```/g, '')) // Remove code blocks but keep content
        .replace(/`([^`]+)`/g, '$1') // Remove inline code
        .trim();

      // For synonyms, format as a clean list
      if (action === "synonyms") {
        const lines = formattedResult.split('\n').filter((l: string) => l.trim());
        formattedResult = lines.map((line: string) => {
          const cleaned = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '').trim();
          return cleaned;
        }).filter((l: string) => l.length > 0).join('\n');
      }

      setFocusChat(prev => {
        const updated: { role: "user" | "assistant"; content: string }[] = [...prev, { role: "assistant" as const, content: formattedResult }];
        // Upgrade prompt is shown as a card UI element, not as a chat message
        // Scroll chat to bottom after state update
        setTimeout(() => {
          if (focusChatRef.current) {
            focusChatRef.current.scrollTo({ top: focusChatRef.current.scrollHeight, behavior: "smooth" });
          }
        }, 100);
        return updated;
      });
    } catch (err: any) {
      setFocusChat(prev => {
        const updated: { role: "user" | "assistant"; content: string }[] = [...prev, { role: "assistant" as const, content: `Error: ${err.message}` }];
        // Scroll to error message
        setTimeout(() => {
          if (focusChatRef.current) {
            focusChatRef.current.scrollTo({ top: focusChatRef.current.scrollHeight, behavior: "smooth" });
          }
        }, 100);
        return updated;
      });
    } finally {
      setIsFocusLoading(false);
    }
  }, [selectedText, isActionAllowed, isPro, focusUsage, session, blocks, focusModel]);

  const handleFocusChatSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!focusInput.trim()) return;
    handleFocusAction("chat", focusInput);
    setFocusInput("");
  }, [focusInput, handleFocusAction]);

  // Handle inline suggestion (Grammarly-style) - shows result right where you're writing
  const handleInlineSuggestion = useCallback(async (action: string, text: string, blockId: string, element: HTMLElement) => {
    if (!text?.trim()) return;

    // Check free tier limit
    if (!isActionAllowed(action)) {
      setLimitReachedAction(action);
      setShowLimitReachedModal(true);
      return;
    }

    // Get position for the popover
    const rect = element.getBoundingClientRect();
    const scrollContainer = scrollContainerRef.current;
    const scrollTop = scrollContainer?.scrollTop || 0;

    // Position below the element
    setInlineSuggestion({
      show: true,
      content: "",
      type: action,
      position: {
        top: rect.bottom + scrollTop - (scrollContainer?.getBoundingClientRect().top || 0) + 8,
        left: Math.max(16, rect.left - (scrollContainer?.getBoundingClientRect().left || 0))
      },
      blockId,
      isLoading: true
    });

    // Track usage
    posthog.capture("inline_suggestion_used", {
      action_type: action,
      text_length: text.length,
      is_pro: isPro,
    });

    // Update usage for non-pro users
    if (!isPro) {
      const newUsage = { ...focusUsage, [action]: (focusUsage[action] || 0) + 1 };
      setFocusUsage(newUsage);
      if (session?.user?.id) {
        try {
          await updateUserUsage(session.user.id, newUsage);
        } catch (error) {
          console.error("Failed to save usage:", error);
        }
      }
    }

    try {
      const context = blocks.map(b => b.content).join("\n\n").substring(0, 4000);
      const graphStructure = aiResult?.nodes ? {
        nodes: aiResult.nodes,
        edges: aiResult.connections || []
      } : undefined;

      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text,
          context,
          graphStructure,
          model: focusModel,
          userId: session?.user?.id
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Update premium prompt tracking
      if (isPro && data.premiumPromptsRemaining !== undefined) {
        setPremiumPromptsUsed(premiumPromptsLimit - data.premiumPromptsRemaining);
      }

      // Format result
      let formattedResult = data.result || "";
      formattedResult = formattedResult
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .trim();

      setInlineSuggestion(prev => ({
        ...prev,
        content: formattedResult,
        isLoading: false
      }));
    } catch (err: any) {
      setInlineSuggestion(prev => ({
        ...prev,
        content: `Error: ${err.message}`,
        isLoading: false
      }));
    }
  }, [isActionAllowed, isPro, focusUsage, session, blocks, focusModel, aiResult, premiumPromptsLimit]);

  // Memoize focus action buttons to prevent re-renders
  const focusActionButtons = useMemo(() => [
    { action: "check_logic", label: "Check Logic" },
    { action: "fact_check", label: "Verify" },
    { action: "paraphrase_preserve", label: "Paraphrase" },
    { action: "find_similes", label: "Find Synonyms" },
    { action: "decompose_claims", label: "Extract Claims" },
    { action: "counterargument", label: "Counter" },
    { action: "expand", label: "Expand" },
    { action: "simplify", label: "Simplify" },
    { action: "improve", label: "Polish" },
  ], []);

  const focusActionIcons: Record<string, any> = {
    check_logic: GitMerge,
    fact_check: AlertTriangle,
    paraphrase_preserve: FileText,
    find_similes: Eye,
    decompose_claims: ListTree,
    counterargument: Lightbulb,
    expand: Target,
    simplify: LayoutPanelLeft,
    improve: Wand2,
  };

  const mermaidChart = useMemo(() => {
    if (!aiResult || !aiResult.nodes || aiResult.nodes.length === 0) return "";
    const nodes = aiResult.nodes.map((node, i) => {
      const letter = String.fromCharCode(65 + i);
      const cleanLabel = (node.label || "").replace(/"/g, "'").replace(/\n/g, " ").substring(0, 40);
      const nodeType = (node.type || "claim").toLowerCase();
      // Add class based on node type for styling
      return `${letter}["${cleanLabel}"]:::${nodeType}`;
    });
    const edges: string[] = [];
    if (aiResult.connections && aiResult.connections.length > 0) {
      aiResult.connections.forEach(conn => {
        const fromIdx = aiResult.nodes.findIndex(n => n.id === conn.from);
        const toIdx = aiResult.nodes.findIndex(n => n.id === conn.to);
        if (fromIdx >= 0 && toIdx >= 0) edges.push(`${String.fromCharCode(65 + fromIdx)} --> ${String.fromCharCode(65 + toIdx)}`);
      });
    }
    if (edges.length === 0 && nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) edges.push(`${String.fromCharCode(65 + i)} --> ${String.fromCharCode(65 + i + 1)}`);
    }
    // Add class definitions for node types
    const classDefs = [
      'classDef claim fill:#dbeafe,stroke:#3b82f6,stroke-width:2px',
      'classDef assumption fill:#fef3c7,stroke:#f59e0b,stroke-width:2px',
      'classDef evidence fill:#d1fae5,stroke:#10b981,stroke-width:2px',
      'classDef decision fill:#e9d5ff,stroke:#8b5cf6,stroke-width:2px',
      'classDef risk fill:#fce7f3,stroke:#ec4899,stroke-width:2px',
      'classDef unknown fill:#f1f5f9,stroke:#64748b,stroke-width:2px'
    ];
    return `graph TD\n${nodes.join("\n")}\n${edges.join("\n")}\n${classDefs.join("\n")}`;
  }, [aiResult]);

  const hasContent = wordCount >= 10;

  // Show loading while checking session
  if (sessionLoading || isLoadingDocs) {
    return (
      <div className="min-h-screen bg-[#f5f3ef] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
          <p className="text-sm text-black/40">{sessionLoading ? "Loading..." : "Loading documents..."}</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white text-black font-sans overflow-hidden">
      {/* Document Type Selection Modal */}
      {/* New Document Modal - Cursor-style minimal */}
      <AnimatePresence>
        {showDocumentTypeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDocumentTypeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1e1e1e] rounded-lg border border-white/10 shadow-2xl w-[320px] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-[13px] font-medium text-white/90">New document</p>
              </div>

              <div className="p-1">
                <button
                  onClick={() => handleCreateDocumentWithType("ai_native")}
                  className="w-full px-3 py-2.5 text-left rounded hover:bg-white/[0.06] transition-colors flex items-center gap-3"
                >
                  <Wand2 size={15} className="text-white/50" />
                  <div>
                    <p className="text-[13px] text-white/90">AI Native</p>
                    <p className="text-[11px] text-white/40">Write with AI assistance</p>
                  </div>
                </button>

                <div
                  className="w-full px-3 py-2.5 text-left rounded flex items-center gap-3 opacity-40 cursor-not-allowed"
                >
                  <Eye size={15} className="text-white/30" />
                  <div className="flex-1">
                    <p className="text-[13px] text-white/50">Visualization</p>
                    <p className="text-[11px] text-white/30">Map thoughts, see logic visually</p>
                  </div>
                  <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">Coming Soon</span>
                </div>
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.06] flex justify-end">
                <button
                  onClick={() => setShowDocumentTypeModal(false)}
                  className="px-3 py-1.5 text-[12px] text-white/50 hover:text-white/70 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Sidebar - INCREASED width for better usability */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 320 : 0 }}
        transition={{ 
          duration: sidebarMounted ? 0.3 : 0, // No animation on first render
          ease: [0.16, 1, 0.3, 1] 
        }}
        className="relative border-r border-black/[0.06] bg-[#fcfcfc] flex flex-col overflow-hidden flex-shrink-0"
        style={{ 
          width: sidebarMounted ? undefined : (isSidebarOpen ? 320 : 0), // Fixed width on first render
          minWidth: isSidebarOpen ? 320 : 0, 
          maxWidth: isSidebarOpen ? 320 : 0 
        }}
      >
        <div className="p-6 flex items-center justify-between border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <img src="/eliee_logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold tracking-tight text-black text-base">Eliee</span>
            {isPro && (
              <span className="px-2 py-1 text-[10px] font-bold bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-md uppercase tracking-wide">
                Pro
              </span>
            )}
          </div>
          <button
            onClick={handleNewDocument}
            className="p-2 hover:bg-black/[0.05] rounded-lg transition-colors"
            title="New document"
          >
            <Plus size={20} className="text-black/40" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Documents List - INCREASED sizes */}
          <div className="p-5 space-y-2.5">
            <div className="flex items-center justify-between px-3 mb-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-black/30">Documents</p>
              {!isPro && (
                <span className="text-[12px] text-black/35">{documents.length}/{FREE_DOCUMENT_LIMIT}</span>
              )}
            </div>
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDocument(doc)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all",
                  currentDocId === doc.id
                    ? "bg-white border border-black/[0.08] shadow-sm"
                    : "hover:bg-white/60"
                )}
              >
                <FileText size={18} className={cn("flex-shrink-0", currentDocId === doc.id ? "text-black/60" : "text-black/35")} />
                <span className={cn("text-[14px] font-medium truncate flex-1", currentDocId === doc.id ? "text-black/80" : "text-black/55")}>
                  {doc.title || "Untitled"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-black/[0.05] rounded-lg transition-all"
                >
                  <Trash2 size={16} className="text-black/30 hover:text-rose-500" />
                </button>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-sm text-black/35 text-center py-8">No documents yet</p>
            )}
          </div>

          {/* Current Document Stats - INCREASED sizes */}
          <div className="p-5 space-y-6 border-t border-black/[0.04]">
            <div className="p-5 rounded-xl bg-white border border-black/[0.04] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-black/50">
                  <FileText size={18} />
                  <span className="text-[14px] font-medium truncate">{docTitle}</span>
                </div>
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black/50 rounded-full animate-spin" />
                ) : lastSaved ? (
                  <Check size={16} className="text-emerald-500" />
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[13px] text-black/40">
                <span>{wordCount} words</span>
                {lastSaved && <span>Saved</span>}
              </div>
              <div className="h-2 bg-black/[0.04] rounded-full overflow-hidden">
                <div className="h-full bg-black/25 transition-all duration-300" style={{ width: `${Math.min(100, (wordCount / 300) * 100)}%` }} />
              </div>
            </div>

            {/* Show features based on document type - BIGGER buttons */}
            {documentType === "visualization" ? (
              <button
                onClick={handleToggleVisualize}
                disabled={isAnalyzing || (!hasContent && !showVisualView)}
                className={cn(
                  "w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-all",
                  (hasContent || showVisualView) && !isAnalyzing
                    ? showVisualView
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-black text-white hover:bg-black/90"
                    : "bg-black/[0.03] text-black/25 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Eye size={20} />
                )}
                <span>{showVisualView ? "Refresh" : "Visualize"}</span>
              </button>
            ) : documentType === "ai_native" ? (
              <div className="space-y-3">
                <button
                  onClick={handleToggleFocusMode}
                  className={cn(
                    "w-full py-3 rounded-lg text-[13px] font-medium transition-colors text-center",
                    showFocusMode
                      ? "bg-black text-white"
                      : "bg-black/[0.04] text-black/70 hover:bg-black/[0.06]"
                  )}
                >
                  Focus Mode
                </button>
                {/* Quick Check Button - Sidebar */}
                <button
                  onClick={() => setShowQuickCheckBetaModal(true)}
                  disabled={quickCheckLoading}
                  className={cn(
                    "group relative w-full flex items-center justify-center gap-2 py-3 rounded-lg text-[13px] font-medium transition-all",
                    showQuickCheckPanel
                      ? "bg-violet-600 text-white"
                      : "bg-black/[0.04] text-black/70 hover:bg-black/[0.06]"
                  )}
                >
                  {quickCheckLoading ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <CheckCheck size={16} className={showQuickCheckPanel ? "text-white" : "text-violet-500"} />
                  )}
                  <span>Quick Check</span>
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide",
                    showQuickCheckPanel
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    BETA
                  </span>
                </button>
              </div>
            ) : null}

            {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">{error}</div>}
          </div>
        </div>

        <div className="p-5 border-t border-black/[0.04]">
          {isPro ? (
            /* Pro user status - Cursor/Linear style: minimal */
            <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] border border-black/[0.04]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[13px] font-medium text-black/70">Pro</span>
              </div>
              <span className="text-[12px] text-black/40">{premiumPromptsLimit - premiumPromptsUsed} prompts left</span>
            </div>
          ) : (
            /* Upgrade to Pro button - Cursor/Linear style: clean, minimal */
            <button
              onClick={() => {
                posthog.capture("upgrade_modal_opened", { location: "sidebar" });
                setShowProModal(true);
              }}
              className="w-full py-3 rounded-lg bg-black text-white text-[13px] font-medium hover:bg-black/90 transition-colors text-center"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 relative bg-white overflow-hidden flex flex-col" style={{ minWidth: 0 }}>
        {/* Mobile Desktop Hint */}
        <AnimatePresence>
          {isMobileDevice && showMobileWarning && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-6 left-6 right-6 z-[100] flex justify-center pointer-events-none"
            >
              <div className="bg-[#1e1e1e] text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center justify-between gap-4 max-w-sm pointer-events-auto">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Desktop Recommended</span>
                  <span className="text-xs text-white/50">For the full Pro experience, try Eliee on your computer.</span>
                </div>
                <button
                  onClick={() => {
                    setShowMobileWarning(false);
                    setMobileWarningDismissed(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={16} className="text-white/50" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="h-16 flex items-center justify-between px-4 md:px-8 lg:px-12 border-b border-black/[0.06] bg-white/80 backdrop-blur-md sticky top-0 z-50 flex-shrink-0 min-w-0">
          <div className="flex items-center gap-3 md:gap-5 lg:gap-8 min-w-0 flex-1">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-2.5 hover:bg-black/[0.04] rounded-xl transition-all flex-shrink-0 active:scale-90"
              title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <Menu size={20} className="text-black/60" />
            </button>

            <div className="flex items-center min-w-0 flex-1 max-w-[180px] md:max-w-sm lg:max-w-md xl:max-w-lg">
              <input 
                type="text" 
                value={docTitle} 
                onChange={(e) => setDocTitle(e.target.value)} 
                className="text-sm md:text-base font-bold bg-transparent border-none focus:outline-none text-black/80 placeholder:text-black/20 min-w-0 w-full truncate hover:bg-black/[0.02] px-2 py-1 rounded-lg transition-all" 
                placeholder="Untitled Document" 
              />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-5 lg:gap-8 flex-shrink-0 pl-4 md:pl-0">
            {/* Autosave indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs md:text-sm text-black/35 font-medium">
              {isSaving ? (
                <>
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute inset-0 opacity-40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 relative" />
                  </div>
                  <span className="whitespace-nowrap hidden md:inline">Syncing...</span>
                </>
              ) : lastSaved ? (
                <>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="whitespace-nowrap hidden md:inline">Saved</span>
                </>
              ) : null}
            </div>
            {/* Upgrade prompt when usage is low */}
            {!isPro && !showVisualView && Object.entries(FREE_LIMITS).some(([action]) => {
              const remaining = getRemainingUses(action);
              return remaining !== Infinity && remaining <= 1 && (focusUsage[action] || 0) > 0;
            }) && (
              <button
                onClick={() => setShowProModal(true)}
                className="hidden md:flex items-center px-4 py-2 rounded-lg bg-black text-xs font-bold text-white hover:bg-black/90 transition-all shadow-lg shadow-black/10 active:scale-95"
              >
                Upgrade
              </button>
            )}
            {showVisualView && (
              <button onClick={() => setShowVisualView(false)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-black/50 hover:text-black hover:bg-black/[0.03] transition-all active:scale-95 border border-transparent hover:border-black/[0.05]">
                <ArrowLeft size={16} strokeWidth={2.5} /> <span className="hidden md:inline">Back to Doc</span>
              </button>
            )}
            {!showVisualView && documentType === "visualization" && (
              <div className="flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => setCanvasMode(!canvasMode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border shadow-sm active:scale-95",
                    canvasMode
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-black/40 hover:text-black/60 border-black/[0.04]"
                  )}
                  title={canvasMode ? "Switch to structured mode" : "Switch to canvas mode"}
                >
                  <Maximize2 size={12} strokeWidth={2.5} />
                  <span className="hidden sm:inline">{canvasMode ? "Canvas" : "Structured"}</span>
                </button>
                <button 
                  onClick={handleToggleVisualize}
                  disabled={isAnalyzing}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95",
                    isAnalyzing
                      ? "bg-black/[0.02] text-black/30 cursor-not-allowed border border-black/[0.04]"
                      : "bg-black text-white hover:bg-black/90 shadow-black/10"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Analysing...</span>
                    </>
                  ) : (
                    <>
                      <Eye size={16} strokeWidth={2.5} />
                      <span>Visualize</span>
                    </>
                  )}
                </button>
              </div>
            )}
            {/* Document type switcher */}
            {!showVisualView && documentType && (
              <button
                onClick={handleSwitchDocumentType}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-black/[0.02] hover:bg-black/[0.04] rounded transition-colors cursor-pointer group"
                title={`Switch to ${documentType === "visualization" ? "AI Native" : "Visualization"}`}
              >
                <span className="text-[10px] text-black/30 group-hover:text-black/50 transition-colors">
                  {documentType === "visualization" ? "Visualization" : "AI Native"}
                </span>
                <svg className="w-3 h-3 text-black/20 group-hover:text-black/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
            {/* Pro Badge */}
            {isPro && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-full border border-amber-500/20">
                <Crown size={10} className="text-amber-600" />
                <span className="text-[10px] font-semibold text-amber-700">Pro</span>
              </div>
            )}
            {/* Header Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="p-1.5 hover:bg-black/[0.03] rounded-lg transition-colors"
                title="Menu"
              >
                <MoreVertical size={16} className="text-black/50" />
              </button>
              <AnimatePresence>
                {showHeaderMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/[0.06] rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="relative">
                      <button 
                        onClick={() => {
                          setShowExportMenu(!showExportMenu);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02] transition-all"
                      >
                        <Download size={14} />
                        Export
                      </button>
                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="absolute left-full top-0 ml-2 bg-white border border-black/10 rounded-lg shadow-xl overflow-hidden z-50"
                          >
                            <button 
                              onClick={() => {
                                handleDownloadPDF();
                                setShowExportMenu(false);
                                setShowHeaderMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02] whitespace-nowrap"
                            >
                              <FileDown size={14} />
                              Download PDF
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button 
                      onClick={() => {
                        window.location.href = "/";
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02] transition-all"
                    >
                      <Home size={14} />
                      Home
                    </button>
                    <button 
                      onClick={() => {
                        router.push("/settings");
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02] transition-all"
                    >
                      <Settings size={14} />
                      Settings
                    </button>
                    <div className="h-px bg-black/[0.04]" />
                    <button 
                      onClick={() => {
                        handleSignOut();
                        setShowHeaderMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02] transition-all"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!showVisualView ? (
            <motion.div 
              key="doc" 
              ref={scrollContainerRef}
              data-editor-content="true"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 overflow-auto" 
              onClick={() => { setShowCommandMenu(false); setShowExportMenu(false); setShowHeaderMenu(false); }}
              onContextMenu={(e) => !showFocusMode && handleDocContextMenu(e)}
            >
              <div className="max-w-3xl mx-auto py-16 px-8">
                <div className="space-y-4">
                  {blocks.map((block, index) => (
                    <div key={block.id} data-block-id={block.id} onDragOver={(e) => handleDragOver(e, block.id)} className={cn("group relative rounded-xl transition-all", draggedId === block.id && "opacity-50", block.type !== "text" && "border-l-4", block.type !== "text" && blockMeta[block.type]?.borderColor)}>
                      <div className="flex items-start gap-3 py-2">
                        <div className="w-6 flex-shrink-0 pt-3 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                          <button onClick={() => removeBlock(block.id)} className="p-1 hover:bg-black/[0.04] rounded-lg text-black/20 hover:text-black/50"><X size={14} /></button>
                          <div
                            draggable
                            onDragStart={() => handleDragStart(block.id)}
                            onDragEnd={handleDragEnd}
                            className="p-1 text-black/15 cursor-grab active:cursor-grabbing hover:text-black/35"
                          >
                            <GripVertical size={14} />
                          </div>
                        </div>
                        <div className={cn("flex-1 min-w-0 py-3 px-5 rounded-xl transition-colors", block.type !== "text" && blockMeta[block.type]?.bgColor)} onContextMenu={(e) => !showFocusMode && handleContextMenu(e, index)}>
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              {block.type !== "text" && blockMeta[block.type] && (
                                <div className={cn("inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-2", blockMeta[block.type].color)}>
                                  {blockMeta[block.type].icon}
                                  {blockMeta[block.type].label}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="relative">
                            {/* Highlight overlay for Quick Check suggestions */}
                            {hoveredSuggestion && block.content && block.content.includes(hoveredSuggestion.original) && (
                              <div
                                className={cn(
                                  "absolute inset-0 whitespace-pre-wrap break-words pointer-events-none leading-relaxed",
                                  block.type === "text" ? "text-lg" : "text-base font-medium"
                                )}
                                style={{ color: "transparent" }}
                              >
                                {(() => {
                                  const content = block.content || "";
                                  const original = hoveredSuggestion.original;
                                  const index = content.indexOf(original);
                                  if (index === -1) return content;

                                  const before = content.slice(0, index);
                                  const match = content.slice(index, index + original.length);
                                  const after = content.slice(index + original.length);

                                  const highlightColor = hoveredSuggestion.severity === "error"
                                    ? "bg-rose-200/80"
                                    : hoveredSuggestion.severity === "warning"
                                    ? "bg-amber-200/80"
                                    : "bg-blue-200/80";

                                  return (
                                    <>
                                      <span>{before}</span>
                                      <span className={cn(highlightColor, "rounded px-0.5")}>{match}</span>
                                      <span>{after}</span>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            <textarea
                              value={block.content || ""}
                              onChange={(e) => {
                                updateBlock(block.id, e.target.value);
                              }}
                              onInput={(e) => autoResize(e.currentTarget)}
                              onFocus={(e) => autoResize(e.currentTarget)}
                              onBlur={(e) => {
                                // Ensure content is preserved on blur - sync state with DOM
                                const currentValue = e.target.value;
                                if (currentValue !== (block.content || "")) {
                                  updateBlock(block.id, currentValue);
                                }
                              }}
                              placeholder={block.type === "text" ? "Start writing..." : `Enter ${block.type}...`}
                              className={cn(
                                "w-full bg-transparent border-none focus:ring-0 p-0 resize-none leading-relaxed placeholder:text-black/20 focus:outline-none relative z-10",
                                block.type === "text" ? "text-lg text-black/80" : "text-base font-medium text-black/75"
                              )}
                              style={{ overflow: "hidden" }}
                              rows={1}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inline Suggestion Popover (Grammarly-style) - BETA */}
                <AnimatePresence>
                  {inlineSuggestion.show && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      style={{
                        position: "absolute",
                        top: inlineSuggestion.position.top,
                        left: inlineSuggestion.position.left,
                        maxWidth: "min(500px, calc(100% - 32px))",
                        zIndex: 50
                      }}
                      className="bg-white rounded-xl shadow-xl border border-black/[0.08] overflow-hidden"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.04] bg-black/[0.01]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-black/50 uppercase tracking-wider">
                            {inlineSuggestion.type.replace(/_/g, " ")}
                          </span>
                        </div>
                        <button
                          onClick={() => setInlineSuggestion(prev => ({ ...prev, show: false }))}
                          className="p-1 text-black/30 hover:text-black/60 hover:bg-black/[0.04] rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-4 max-h-[300px] overflow-y-auto">
                        {inlineSuggestion.isLoading ? (
                          <div className="flex items-center gap-3 text-black/40">
                            <div className="w-4 h-4 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
                            <span className="text-sm">Analyzing...</span>
                          </div>
                        ) : (
                          <div className="text-[13px] text-black/70 leading-relaxed whitespace-pre-wrap">
                            {inlineSuggestion.content}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!inlineSuggestion.isLoading && inlineSuggestion.content && (
                        <div className="flex items-center justify-between px-4 py-2.5 border-t border-black/[0.04] bg-black/[0.01]">
                          <button
                            onClick={() => {
                              // Copy to clipboard
                              navigator.clipboard.writeText(inlineSuggestion.content);
                            }}
                            className="text-[11px] text-black/40 hover:text-black/60 transition-colors"
                          >
                            Copy
                          </button>
                          <button
                            onClick={() => setInlineSuggestion(prev => ({ ...prev, show: false }))}
                            className="text-[11px] font-medium text-black/50 hover:text-black/70 px-2 py-1 rounded hover:bg-black/[0.04] transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-80" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="visual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col bg-[#f5f3ef] overflow-y-auto"
            >
              {/* Sticky header bar */}
              <div className="sticky top-0 z-30 h-16 border-b border-black/[0.06] bg-[#f5f3ef]/90 backdrop-blur-md flex items-center justify-between px-6 md:px-12 flex-shrink-0">
                <div className="flex items-center gap-4 md:gap-8 min-w-0">
                  <div className="flex items-center gap-3 md:gap-4 shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-black/30" />
                    <h2 className="text-sm md:text-base font-bold text-black/80 truncate max-w-[120px] md:max-w-xs">{docTitle}</h2>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <div className="h-6 w-[1px] bg-black/[0.08]" />
                    <span className="text-[10px] font-bold text-black/40 uppercase tracking-[0.1em]">
                      Logic Architecture
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
                  <span className="hidden lg:block text-[11px] text-black/35 font-bold uppercase tracking-wider">
                    {aiResult?.nodes?.length || 0} nodes
                  </span>
                  {!isPro && (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 hover:from-amber-500/20 hover:to-orange-500/20 transition-all active:scale-95 shadow-sm"
                    >
                      <Crown size={14} />
                      <span className="hidden md:inline">Upgrade to Pro</span>
                      <span className="md:hidden">Upgrade</span>
                    </button>
                  )}
                  <button
                    onClick={handleConvertToDoc}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-black/85 transition-all shadow-lg shadow-black/10 active:scale-95 flex-shrink-0"
                  >
                    <RefreshCw size={14} strokeWidth={3} className="group-hover:rotate-180 transition-transform duration-500" />
                    <span className="hidden sm:inline">Sync to Editor</span>
                    <span className="sm:hidden">Sync</span>
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 px-4 md:px-10 py-8 md:py-12">
                <div className="max-w-6xl mx-auto space-y-10 md:space-y-16">

                  {/* Core Premise - Hero style */}
                  {aiResult?.essence && (
                    <div className="text-center max-w-3xl mx-auto">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-black/30 mb-4">Core Premise</p>
                      <h1
                        className="text-2xl md:text-3xl lg:text-4xl text-black/80 leading-relaxed"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic" }}
                      >
                        {aiResult.essence}
                      </h1>
                    </div>
                  )}

                  {/* Legend bar */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-medium border border-blue-100">Claim</span>
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-100">Assumption</span>
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-medium border border-green-100">Evidence</span>
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 font-medium border border-purple-100">Decision</span>
                    <span className="text-xs px-3 py-1.5 rounded-lg bg-pink-50 text-pink-700 font-medium border border-pink-100">Risk</span>
                  </div>

                  {/* Diagram Section */}
                  <div className="bg-white rounded-2xl md:rounded-3xl border border-black/[0.06] shadow-xl shadow-black/[0.03] overflow-hidden">
                    <div className="relative min-h-[400px] md:min-h-[550px] lg:min-h-[650px]">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                      {isAnalyzing ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                          <div className="w-10 h-10 border-3 border-black/10 border-t-black/50 rounded-full animate-spin" />
                          <div className="text-center">
                            <p className="text-base font-medium text-black/60 mb-1">Analyzing structure...</p>
                            <p className="text-sm text-black/30">Extracting logic and connections</p>
                          </div>
                        </div>
                      ) : mermaidChart ? (
                        <div className="w-full h-full p-6 md:p-10 lg:p-14 overflow-auto">
                          <MermaidDiagram chart={mermaidChart} className="min-w-full" />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-center">
                          <div>
                            <p className="text-base text-black/40 mb-2">No diagram available</p>
                            <p className="text-sm text-black/25">Click "Refresh" to generate visualization</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Insights Grid */}
                  {((aiResult?.gaps && aiResult.gaps.length > 0) || (aiResult?.suggestions && aiResult.suggestions.length > 0)) && (
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">

                      {/* Structural Gaps */}
                      {aiResult?.gaps && aiResult.gaps.length > 0 && (
                        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 md:p-8 shadow-lg shadow-black/[0.02]">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center border border-amber-200">
                              <AlertTriangle size={18} className="text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-black/80">Structural Gaps</h3>
                              <p className="text-xs text-black/40">{aiResult.gaps.length} gaps identified</p>
                            </div>
                          </div>
                          <div className="space-y-5">
                            {aiResult.gaps.map((gap, i) => (
                              <div key={i} className="group">
                                <div className="flex items-start gap-4">
                                  <span className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold flex-shrink-0 border border-amber-100 group-hover:bg-amber-100 transition-colors">
                                    {i + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-base text-black/70 leading-relaxed group-hover:text-black/90 transition-colors">{gap}</p>
                                    {aiResult.thoughts?.gaps?.[i] && (
                                      <p className="text-sm text-black/40 mt-2 italic leading-relaxed">{aiResult.thoughts.gaps[i]}</p>
                                    )}
                                  </div>
                                </div>
                                {i < aiResult.gaps.length - 1 && (
                                  <div className="h-[1px] bg-black/[0.04] mt-5 ml-11" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Refinements */}
                      {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
                        <div className="bg-white rounded-2xl border border-black/[0.06] p-6 md:p-8 shadow-lg shadow-black/[0.02]">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center border border-emerald-200">
                              <Lightbulb size={18} className="text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-black/80">Refinements</h3>
                              <p className="text-xs text-black/40">{aiResult.suggestions.length} suggestions</p>
                            </div>
                          </div>
                          <div className="space-y-5">
                            {aiResult.suggestions.map((s, i) => (
                              <div key={i} className="group">
                                <div className="flex items-start gap-4">
                                  <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                                    <ArrowRight size={14} strokeWidth={2.5} />
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-base text-black/70 leading-relaxed group-hover:text-black/90 transition-colors">{s}</p>
                                    {aiResult.thoughts?.suggestions?.[i] && (
                                      <p className="text-sm text-black/40 mt-2 italic leading-relaxed">{aiResult.thoughts.suggestions[i]}</p>
                                    )}
                                  </div>
                                </div>
                                {i < aiResult.suggestions.length - 1 && (
                                  <div className="h-[1px] bg-black/[0.04] mt-5 ml-11" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom spacer */}
                  <div className="h-8" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCommandMenu && (
            <>
              <div className="fixed inset-0 z-[99]" onClick={() => setShowCommandMenu(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.1 }} style={{ left: menuPos.x, top: menuPos.y }} className="fixed z-[100] w-56 bg-white border border-black/10 rounded-xl shadow-xl overflow-hidden">
                <div className="p-2 border-b border-black/[0.04]">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-black/25 px-2">Insert</p>
                </div>
                <div className="p-1">
                  {(documentType === "visualization" 
                    ? (["claim", "assumption", "evidence", "decision", "risk", "unknown", "text"] as BlockType[])
                    : (["text"] as BlockType[])
                  ).map((type) => (
                    <button key={type} onClick={() => addBlock(type)} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/[0.03] transition-all">
                      <div className={cn("w-5 h-5 rounded flex items-center justify-center", type === "text" ? "bg-black/[0.03] text-black/40" : blockMeta[type].bgColor, blockMeta[type].color)}>{blockMeta[type].icon}</div>
                      <span className="text-sm text-black/70">{blockMeta[type].label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>

      {/* Focus Mode Panel - INCREASED width */}
      <AnimatePresence>
        {showFocusMode && (
          <>
            {/* Resize Handle (Right) */}
             {!isMobileDevice && (
               <div
                  onMouseDown={() => setIsResizingFocus(true)}
                  className="w-1.5 z-[51] cursor-col-resize hover:bg-black/10 active:bg-black/20 transition-colors flex-shrink-0 relative"
                  title="Drag to resize assistant"
               />
             )}
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={{ width: focusWidth }}
              className="h-full border-l border-black/[0.08] bg-white flex flex-col z-50 flex-shrink-0"
              data-focus-sidebar="true"
            >
            {/* Header - Compact */}
            <div className="h-12 border-b border-black/[0.06] flex items-center justify-between px-5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-black/70">Assistant</span>
                <span className="text-xs text-black/30 font-mono bg-black/[0.03] px-2 py-0.5 rounded">⌘K</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Usage Limits - Moved to header */}
                {!isPro ? (
                  <div className="flex items-center gap-2 text-[10px] text-black/40 px-2 py-1 rounded-md bg-black/[0.02]">
                    <span>Chat: {focusUsage.chat || 0}/{FREE_LIMITS.chat}</span>
                    {Object.entries(FREE_LIMITS).some(([action]) => {
                      const remaining = getRemainingUses(action);
                      return remaining !== Infinity && remaining <= 1 && (focusUsage[action] || 0) > 0;
                    }) && (
                      <button
                        onClick={() => setShowProModal(true)}
                        className="text-[10px] font-medium text-black/50 hover:text-black/70 transition-colors underline"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] px-2 py-1 rounded-md bg-emerald-50/50">
                    <span className="font-medium text-emerald-700">Pro</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-black/50">
                      {premiumPromptsUsed >= premiumPromptsLimit
                        ? "Free models"
                        : `${premiumPromptsLimit - premiumPromptsUsed} prompts`}
                    </span>
                  </div>
                )}
                {/* Quick Check button in Focus Mode */}
                <button
                  onClick={() => {
                    setShowFocusMode(false);
                    setTimeout(() => handleToggleQuickCheck(), 100);
                  }}
                  disabled={quickCheckLoading}
                  className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-gradient-to-r from-violet-50 to-purple-50 text-violet-600 hover:from-violet-500 hover:to-purple-600 hover:text-white border border-violet-200/50 hover:border-transparent transition-all"
                  title="Quick Check (⌘⇧C)"
                >
                  <CheckCheck size={12} className="text-violet-500 group-hover:text-white transition-colors" />
                  <span>Check</span>
                </button>
                <select
                  value={focusModel}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent selection clearing
                  onChange={(e) => {
                    e.stopPropagation();
                    setFocusModel(e.target.value as typeof focusModel);
                  }}
                  className="text-sm text-black/45 bg-transparent border-none focus:outline-none cursor-pointer hover:text-black/60"
                >
                  <option value="fast">fast</option>
                  <option value="balanced">balanced</option>
                  <option value="quality">quality</option>
                </select>
                <button
                  onClick={() => setShowFocusMode(false)}
                  className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors"
                >
                  <X size={18} className="text-black/35" />
                </button>
              </div>
            </div>


            {/* Actions - Compact */}
            <div className="px-5 py-2.5 border-b border-black/[0.04]">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-[10px] font-semibold uppercase tracking-wider text-black/30">Actions</h4>
                 <div className="flex bg-black/[0.04] p-0.5 rounded-lg">
                    <button
                      onClick={() => setFocusViewMode("text")}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all ${focusViewMode === "text" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setFocusViewMode("icons")}
                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all ${focusViewMode === "icons" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
                    >
                      Icons
                    </button>
                 </div>
              </div>
              
              <AnimatePresence mode="wait">
                {focusViewMode === "text" ? (
                  <motion.div 
                    key="text-mode"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-wrap gap-2"
                  >
                    {focusActionButtons.map((item) => {
                      const remaining = getRemainingUses(item.action);
                      const allowed = remaining > 0 || remaining === Infinity;
                      const showCount = remaining !== Infinity;
                      return (
                        <button
                          key={item.action}
                          onMouseDown={(e) => e.preventDefault()} // Prevent selection clearing
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedText) {
                              handleFocusAction(item.action, selectedText);
                            }
                          }}
                          disabled={!selectedText || isFocusLoading || !allowed}
                          className={cn(
                            "px-2 py-1 text-xs rounded-md transition-all",
                            !allowed
                              ? "text-black/20 cursor-not-allowed"
                              : selectedText && !isFocusLoading
                                ? "bg-black/[0.03] text-black/70 hover:text-black hover:bg-black/[0.06]"
                                : "text-black/25 cursor-not-allowed"
                          )}
                        >
                          {item.label}
                          {allowed && showCount && <span className="text-black/25 ml-1">{remaining}</span>}
                        </button>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div 
                     key="icon-mode"
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     transition={{ duration: 0.2 }}
                     layout 
                     className="flex flex-wrap gap-2"
                  >
                    {focusActionButtons.map((item) => {
                      const remaining = getRemainingUses(item.action);
                      const allowed = remaining > 0 || remaining === Infinity;
                      const Icon = focusActionIcons[item.action] || Wand2;
                      return (
                        <motion.button
                          layout
                          key={item.action}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (selectedText) {
                              handleFocusAction(item.action, selectedText);
                            }
                          }}
                          disabled={!selectedText || isFocusLoading || !allowed}
                          whileHover={allowed && selectedText ? { scale: 1.05 } : {}}
                          whileTap={allowed && selectedText ? { scale: 0.95 } : {}}
                          className={cn(
                            "w-7 h-7 flex items-center justify-center rounded-md border transition-all",
                            !allowed
                              ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                              : selectedText && !isFocusLoading
                                ? "bg-white border-black/[0.06] shadow-sm hover:shadow-md hover:border-black/[0.1]"
                                : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                          )}
                          title={item.label}
                        >
                           <Icon size={14} className={cn(
                             "mb-0", 
                             selectedText && !isFocusLoading && allowed ? "text-black/70" : "text-black/30"
                           )} />
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chat area - More space */}
            <div
              ref={focusChatRef}
              className="flex-1 overflow-y-auto min-h-0"
            >
              {focusChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-10 text-center">
                  <p className="text-base text-black/35 leading-relaxed">
                    Select text and choose an action above, or type a question below.
                  </p>
                </div>
              ) : (
                <div className="p-5 space-y-4">
                  {focusChat.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <p className="text-sm text-black/40 mb-2">{msg.content}</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="text-base text-black/70 leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          {/* Upgrade prompt for free users - show after every assistant response */}
                          {!isPro && msg.role === "assistant" && (
                            <div className="mt-3 flex items-center justify-between p-2.5 rounded-md bg-black/[0.02]">
                              <p className="text-[11px] text-black/50">
                                Get better results with Pro
                              </p>
                              <button
                                onClick={() => setShowProModal(true)}
                                className="text-[11px] font-medium text-black/70 hover:text-black px-2 py-1 rounded hover:bg-black/[0.04] transition-colors"
                              >
                                Upgrade →
                              </button>
                            </div>
                          )}
                          {/* Add/Replace buttons for all assistant responses */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                // Add this response to the document (insert at cursor or end)
                                const textareas = document.querySelectorAll('textarea');
                                if (textareas.length > 0) {
                                  const textarea = textareas[textareas.length - 1] as HTMLTextAreaElement;
                                  const blockElement = textarea.closest('[data-block-id]');
                                  const blockId = blockElement?.getAttribute('data-block-id');
                                  
                                  if (blockId) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const currentContent = textarea.value;
                                    const newText = currentContent.substring(0, start) + msg.content + currentContent.substring(end);
                                    
                                    // Update the block state directly
                                    updateBlock(blockId, newText);
                                    
                                    // Update textarea without scrolling
                                    textarea.value = newText;
                                    const newCursorPos = start + msg.content.length;
                                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                                    
                                    // Auto-resize the textarea
                                    autoResize(textarea);
                                    
                                    // Focus without scrolling
                                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                                    textarea.focus();
                                    window.scrollTo(0, scrollTop);
                                  }
                                }
                              }}
                              className="text-[11px] text-green-600 hover:text-green-700 hover:underline"
                            >
                              Add to document
                            </button>
                            {selectedText && selectedRange && (
                              <button
                                onClick={() => {
                                  // Replace the currently selected text with this response
                                  if (selectedRange.textarea) {
                                    // Textarea replacement - find the block ID
                                    const textarea = selectedRange.textarea;
                                    const blockElement = textarea.closest('[data-block-id]');
                                    const blockId = blockElement?.getAttribute('data-block-id');
                                    
                                    if (blockId) {
                                      // Calculate new text
                                      const currentContent = textarea.value;
                                      const newText = currentContent.substring(0, selectedRange.start) + 
                                                     msg.content + 
                                                     currentContent.substring(selectedRange.end);
                                      
                                      // Update the block state directly
                                      updateBlock(blockId, newText);
                                      
                                      // Update textarea without scrolling
                                      textarea.value = newText;
                                      const newCursorPos = selectedRange.start + msg.content.length;
                                      textarea.setSelectionRange(newCursorPos, newCursorPos);
                                      
                                      // Auto-resize the textarea
                                      autoResize(textarea);
                                      
                                      // Focus without scrolling
                                      const scrollTop = window.scrollY || document.documentElement.scrollTop;
                                      textarea.focus();
                                      window.scrollTo(0, scrollTop);
                                    }
                                  } else {
                                    // Regular text selection replacement (for non-textarea content)
                                    const storedRange = (window as any).__lastSelectionRange;
                                    if (storedRange) {
                                      storedRange.deleteContents();
                                      storedRange.insertNode(document.createTextNode(msg.content));
                                    } else {
                                      // Fallback: try to get current selection
                                      const selection = window.getSelection();
                                      if (selection && selection.rangeCount > 0) {
                                        const range = selection.getRangeAt(0);
                                        range.deleteContents();
                                        range.insertNode(document.createTextNode(msg.content));
                                      }
                                    }
                                  }
                                  // Clear selection after replacement
                                  setSelectedText("");
                                  setSelectedRange(null);
                                }}
                                className="text-[11px] text-blue-500 hover:text-blue-600 hover:underline"
                              >
                                Replace selected text
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {isFocusLoading && (
                    <div className="flex items-center gap-2 text-[11px] text-black/30">
                      <div className="w-2 h-2 bg-black/20 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input - Compact */}
            <form onSubmit={handleFocusChatSubmit} className="p-4 border-t border-black/[0.06] flex-shrink-0">
              {!isActionAllowed('chat') ? (
                  <div className="text-center py-4 px-5">
                      <p className="text-sm text-black/50 mb-3">Free chat limit reached.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setLimitReachedAction('chat');
                          setShowLimitReachedModal(true);
                        }}
                        className="text-sm font-semibold text-black underline hover:text-black/70"
                      >
                        Upgrade to continue
                      </button>
                  </div>
              ) : (
                <div className="flex items-center gap-3 bg-black/[0.02] rounded-xl px-4 py-3">
                    <input
                    type="text"
                    value={focusInput}
                    onChange={(e) => setFocusInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-base text-black/80 placeholder:text-black/30 focus:outline-none"
                    />
                    <button
                    type="submit"
                    disabled={!focusInput.trim() || isFocusLoading}
                    className={cn(
                        "text-lg px-3 py-1.5 rounded-lg transition-all",
                        focusInput.trim() && !isFocusLoading
                        ? "text-black/60 hover:text-black hover:bg-black/[0.04]"
                        : "text-black/20"
                    )}
                    >
                    ↵
                    </button>
                </div>
              )}
            </form>

            {/* Footer with clear */}
            {focusChat.length > 0 && (
              <div className="px-5 py-2 border-t border-black/[0.04] flex-shrink-0">
                <button
                  onClick={() => setFocusChat([])}
                  className="text-xs text-black/30 hover:text-black/55 transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Check Panel */}
      <QuickCheckPanel
        isOpen={showQuickCheckPanel}
        onClose={() => {
          setShowQuickCheckPanel(false);
          setHoveredSuggestion(null);
        }}
        isLoading={quickCheckLoading}
        suggestions={quickCheckSuggestions}
        onApply={applyQuickCheckSuggestion}
        onDismiss={dismissQuickCheckSuggestion}
        onApplyAll={applyAllQuickCheckSuggestions}
        onHoverSuggestion={setHoveredSuggestion}
      />

      {/* Focus Mode Intro */}
      <AnimatePresence>
        {showFocusIntro && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[300]"
              onClick={() => setShowFocusIntro(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 10 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto">
                <div className="p-6">
                  <p className="text-[13px] font-medium text-black/80 mb-4">Assistant</p>
                  
                  <div className="space-y-3 text-[13px] text-black/50 mb-6">
                    <p>Select text → choose an action (Verify, Rephrase, etc.)</p>
                    <p>Or type any question below.</p>
                  </div>

                  <p className="text-[11px] text-black/30 mb-6">
                    Free: 3 verifications, 1 of each other action. Upgrade for more access.
                  </p>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dontShowFocusIntro}
                        onChange={(e) => setDontShowFocusIntro(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-black/20"
                      />
                      <span className="text-[11px] text-black/30">Don't show again</span>
                    </label>
                    <button
                      onClick={() => completeFocusIntro(dontShowFocusIntro)}
                      className="px-4 py-2 bg-black text-white rounded-lg text-[12px] font-medium hover:bg-black/90 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Visualize Intro */}
      <AnimatePresence>
        {showVisualizeIntro && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[300]"
              onClick={() => setShowVisualizeIntro(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 10 }}
              className="fixed inset-0 z-[301] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full pointer-events-auto border border-black/[0.06]">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-black/80">How to Use Visualization</p>
                    <button
                      onClick={() => setShowVisualizeIntro(false)}
                      className="p-1 hover:bg-black/5 rounded transition-colors"
                    >
                      <X size={16} className="text-black/30" />
                    </button>
                  </div>
                  
                  <div className="space-y-4 mb-6">
                    {/* Step 1: Write */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-semibold text-black/60">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-black/70 mb-1">Write your thoughts</p>
                        <p className="text-[11px] text-black/50 leading-relaxed">
                          Type naturally. Your ideas don't need to be structured yet.
                        </p>
                      </div>
                    </div>

                    {/* Step 2: Right-click */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-semibold text-black/60">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-black/70 mb-1">Right-click to add structure</p>
                        <p className="text-[11px] text-black/50 leading-relaxed mb-2">
                          Right-click anywhere in your text to insert structured blocks:
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          <div className="px-2 py-1 rounded border border-blue-200 bg-blue-50/50 text-blue-700 font-medium">Claim</div>
                          <div className="px-2 py-1 rounded border border-amber-200 bg-amber-50/50 text-amber-700 font-medium">Assumption</div>
                          <div className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50/50 text-emerald-700 font-medium">Evidence</div>
                          <div className="px-2 py-1 rounded border border-purple-200 bg-purple-50/50 text-purple-700 font-medium">Decision</div>
                          <div className="px-2 py-1 rounded border border-rose-200 bg-rose-50/50 text-rose-700 font-medium">Risk</div>
                          <div className="px-2 py-1 rounded border border-slate-200 bg-slate-50/50 text-slate-700 font-medium">Unknown</div>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: Visualize */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[10px] font-semibold text-black/60">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-[12px] font-medium text-black/70 mb-1">Click Visualize</p>
                        <p className="text-[11px] text-black/50 leading-relaxed">
                          Once you have content, click "Visualize" to see your logic mapped as a diagram with connections and gaps identified.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Visual diagram */}
                  <div className="mb-6 p-4 bg-black/[0.02] rounded-lg border border-black/[0.04]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1 h-px bg-black/10"></div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <p className="text-[10px] text-black/40 text-center">Right-click menu appears here</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-black/[0.04]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={dontShowVisualizeIntro}
                        onChange={(e) => setDontShowVisualizeIntro(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-black/20"
                      />
                      <span className="text-[11px] text-black/30">Don't show again</span>
                    </label>
                    <button
                      onClick={() => completeVisualizeIntro(dontShowVisualizeIntro)}
                      className="px-4 py-2 bg-black text-white rounded-lg text-[12px] font-medium hover:bg-black/90 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              onClick={completeOnboarding}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-3xl shadow-2xl max-w-lg w-full p-10 pointer-events-auto border border-black/[0.03]">
                <div className="text-center mb-10">
                  <img 
                    src="/eliee_logo.jpg" 
                    alt="Eliee" 
                    className="w-12 h-12 rounded-xl mx-auto mb-6 shadow-sm grayscale opacity-80" 
                  />
                  <h2 className="text-3xl font-medium tracking-tight text-black/80 mb-3" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                    Welcome to Eliee
                  </h2>
                  <p className="text-sm text-black/40 leading-relaxed">
                    Your AI-powered writing companion for clearer, sharper thinking.
                  </p>
                </div>

                <div className="space-y-5 mb-10">
                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">01</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Write with AI assistance</h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">Write your thoughts while AI helps improve clarity, expand ideas, and catch errors in real-time.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">02</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Focus Mode <span className="text-[9px] text-black/20 font-medium px-1 py-0.5 rounded bg-black/[0.03]">⌘K</span></h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">Select text to fact-check claims, find better words, simplify complex sentences, or ask questions about your writing.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">03</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Think clearly</h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">Organize your reasoning with structured blocks. Mark claims, assumptions, evidence, and decisions to build stronger arguments.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={completeOnboarding}
                  className="w-full py-4 bg-black text-white rounded-xl font-medium text-sm hover:bg-black/90 transition-all shadow-lg shadow-black/5"
                >
                  Start writing
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Pro Upgrade Modal - Warm theme matching landing page */}
      <AnimatePresence>
        {showProModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
              onClick={() => setShowProModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-2xl shadow-2xl shadow-black/10 w-[380px] pointer-events-auto border border-black/[0.08] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
                  <div>
                    <h3 className="text-lg text-black/90" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Upgrade to Pro</h3>
                    <p className="text-[13px] text-black/40 mt-0.5">Unlock premium AI features</p>
                  </div>
                  <button
                    onClick={() => setShowProModal(false)}
                    className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors"
                  >
                    <X size={16} className="text-black/30" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 bg-white/50">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-black/80">Unlimited documents</p>
                        <p className="text-[11px] text-black/40 mt-0.5">Create as many as you need</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-black/80">150 premium chat prompts/month</p>
                        <p className="text-[11px] text-black/40 mt-0.5">Claude & GPT-4 for conversations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-black/80">Unlimited AI actions</p>
                        <p className="text-[11px] text-black/40 mt-0.5">Verify, synonyms, expand, simplify - all free</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check size={10} className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-black/80">Graph-aware AI</p>
                        <p className="text-[11px] text-black/40 mt-0.5">AI that understands your reasoning structure</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-5">
                    <span className="text-3xl font-semibold text-black/90">$9.99</span>
                    <span className="text-black/40 text-sm">/month</span>
                  </div>

                  <button
                    onClick={() => {
                      setShowProModal(false);
                      router.push("/pricing");
                    }}
                    className="w-full py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-black/90 transition-all"
                  >
                    Upgrade to Pro
                  </button>
                </div>

                <div className="px-6 py-3 border-t border-black/[0.04] bg-[#ebe7e0]">
                  <p className="text-[11px] text-black/40 text-center">
                    Cancel anytime
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upgrade Success Modal - Warm celebratory theme */}
      <AnimatePresence>
        {showUpgradeSuccess && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[250]"
              onClick={() => setShowUpgradeSuccess(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[251] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[400px] pointer-events-auto border border-black/[0.08] overflow-hidden">
                {/* Celebration Header */}
                <div className="relative px-6 py-6 border-b border-black/[0.06] bg-gradient-to-br from-emerald-50 to-green-50">
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                      <Check size={24} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <h3 className="text-xl text-black/90" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Welcome to Pro!</h3>
                      <p className="text-sm text-black/50">Payment successful</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 bg-white/50">
                  {/* Features unlocked */}
                  <p className="text-[11px] font-medium text-black/40 uppercase tracking-wider mb-4">Now unlocked</p>
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>Unlimited documents</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>150 premium chat prompts/month</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>Unlimited AI actions (verify, synonyms, etc.)</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>Graph-aware AI</span>
                    </div>
                  </div>

                  {/* Billing info */}
                  <div className="p-3 rounded-xl bg-[#ebe7e0] border border-black/[0.04] mb-5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-black/40">Next billing date</span>
                      <span className="text-black/70 font-medium">
                        {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px] mt-1.5">
                      <span className="text-black/40">Amount</span>
                      <span className="text-black/70 font-medium">$9.99/month</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowUpgradeSuccess(false)}
                    className="w-full py-3 bg-black text-white rounded-xl font-medium text-sm hover:bg-black/90 transition-all"
                  >
                    Start using Pro
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Limit Reached Modal - Warm theme */}
      <AnimatePresence>
        {showLimitReachedModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
              onClick={() => setShowLimitReachedModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[420px] pointer-events-auto border border-black/[0.08] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                      <Crown size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-[15px] text-black/90" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Upgrade to Pro</h3>
                      <p className="text-[12px] text-black/50 mt-0.5">
                        {limitReachedAction === 'chat'
                          ? isPro
                            ? 'Premium chat limit reached'
                            : 'Free chat limit reached'
                          : limitReachedAction === 'counterargument'
                          ? 'Counterargument limit reached'
                          : limitReachedAction === 'improve' || limitReachedAction === 'polish'
                          ? 'Polish limit reached'
                          : limitReachedAction === 'quick_check'
                          ? 'Quick Check limit reached'
                          : 'Action limit reached'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLimitReachedModal(false)}
                    className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors"
                  >
                    <X size={16} className="text-black/30" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 bg-white/50">
                  <div className="mb-5">
                    <p className="text-[13px] text-black/60 leading-relaxed mb-4">
                      {limitReachedAction === 'chat'
                        ? isPro
                          ? "You've used your 150 premium chat prompts this month. Upgrade for more premium access, or continue with free models."
                          : "You've used all 10 free chat messages. Upgrade to Pro for 150 premium chat prompts/month and more access."
                        : limitReachedAction === 'quick_check'
                        ? "You've used all 3 free Quick Checks. Upgrade to Pro for unlimited Quick Check access."
                        : "You've reached your limit for this feature. Upgrade to Pro for unlimited access."}
                    </p>

                    <div className="space-y-3 mb-5">
                      <div className="flex items-start gap-3 text-[13px] text-black/70">
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-black/80">Unlimited documents</p>
                          <p className="text-[11px] text-black/40 mt-0.5">No more 3 document limit</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-[13px] text-black/70">
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-black/80">150 premium chat prompts/month</p>
                          <p className="text-[11px] text-black/40 mt-0.5">Claude & GPT-4 for conversations</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-[13px] text-black/70">
                        <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={10} className="text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-black/80">Unlimited AI actions</p>
                          <p className="text-[11px] text-black/40 mt-0.5">Verify, synonyms, expand - always free</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-5 pb-5 border-b border-black/[0.06]">
                    <span className="text-3xl font-semibold text-black/90">$9.99</span>
                    <span className="text-black/40 text-sm">/month</span>
                    <span className="ml-auto text-[11px] text-black/40">Cancel anytime</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowLimitReachedModal(false)}
                      className="flex-1 px-4 py-2.5 bg-black/[0.05] text-black/60 rounded-xl text-[13px] font-medium hover:bg-black/[0.08] transition-colors"
                    >
                      Maybe later
                    </button>
                    <button
                      onClick={() => {
                        setShowLimitReachedModal(false);
                        router.push("/pricing");
                      }}
                      className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-[13px] font-medium hover:bg-black/90 transition-all"
                    >
                      Upgrade now
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Document Limit Modal - Warm theme */}
      <AnimatePresence>
        {showDocLimitModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[200]"
              onClick={() => setShowDocLimitModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-2xl shadow-2xl shadow-black/10 w-full max-w-[420px] pointer-events-auto border border-black/[0.08] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-black/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                      <FileText size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-[15px] text-black/90" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>Document limit reached</h3>
                      <p className="text-[12px] text-black/50 mt-0.5">You've used all 3 free documents</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocLimitModal(false)}
                    className="p-1.5 hover:bg-black/[0.04] rounded-lg transition-colors"
                  >
                    <X size={16} className="text-black/30" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 bg-white/50">
                  <p className="text-[13px] text-black/60 mb-5 leading-relaxed">
                    Upgrade to Pro for <span className="text-black/80 font-medium">unlimited documents</span> plus premium AI with Claude & GPT-4.
                  </p>

                  <div className="space-y-3 mb-6 p-4 bg-[#ebe7e0] rounded-xl border border-black/[0.04]">
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>Unlimited documents</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>150 premium chat prompts/month</span>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-black/70">
                      <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                      <span>Unlimited AI actions (verify, synonyms, etc.)</span>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mb-5">
                    <span className="text-2xl font-semibold text-black/90">$9.99</span>
                    <span className="text-black/40 text-sm">/month</span>
                    <span className="ml-auto text-[11px] text-black/40">Cancel anytime</span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDocLimitModal(false)}
                      className="flex-1 px-4 py-2.5 bg-black/[0.05] text-black/60 rounded-xl text-[13px] font-medium hover:bg-black/[0.08] transition-colors"
                    >
                      Maybe later
                    </button>
                    <button
                      onClick={() => {
                        setShowDocLimitModal(false);
                        router.push("/pricing");
                      }}
                      className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-[13px] font-medium hover:bg-black/90 transition-all"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Warning Modal */}
      <AnimatePresence>
        {showMobileWarning && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              onClick={() => setShowMobileWarning(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto border border-black/[0.03]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black">Mobile Experience</h2>
                  <button
                    onClick={() => setShowMobileWarning(false)}
                    className="p-1 hover:bg-black/5 rounded transition-colors"
                  >
                    <X size={18} className="text-black/30" />
                  </button>
                </div>
                
                <div className="space-y-3 text-sm text-black/60 mb-6">
                  <p>Visualization works best on desktop or in full-screen mode.</p>
                  <p className="text-xs text-black/40">For the best experience, use a computer or rotate your device to landscape mode.</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowMobileWarning(false)}
                    className="flex-1 px-4 py-2.5 bg-black/5 text-black/70 rounded-lg text-sm font-medium hover:bg-black/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setShowMobileWarning(false);
                      // Proceed anyway - visualization is FREE for everyone
                      const allText = blocks.map(b => b.content).join("\n\n");
                      setIsAnalyzing(true);
                      setError(null);
                      try {
                        const res = await fetch("/api/visualize", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            text: allText,
                            blocks: blocks.map(b => ({ type: b.type, content: b.content }))
                          }),
                        });
                        const data = await res.json();
                        if (data.error) throw new Error(data.error);
                        if (data.result) {
                          setAIResult(data.result);
                          setShowVisualView(true);
                          // Save visualization result
                          if (currentDocId && session?.user?.id) {
                            try {
                              const { saveDocument } = await import("@/lib/db");
                              await saveDocument(currentDocId, session.user.id, {
                                visualization_result: data.result
                              });
                            } catch (err) {
                              console.error("Failed to save visualization result:", err);
                            }
                          }
                        }
                      } catch (e: any) {
                        setError("Visualization temporarily unavailable. Try again.");
                        setTimeout(() => setError(null), 5000);
                      } finally {
                        setIsAnalyzing(false);
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-black/90 transition-colors"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Check Beta Modal */}
      <AnimatePresence>
        {showQuickCheckBetaModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              onClick={() => setShowQuickCheckBetaModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-[#f5f3ef] rounded-2xl shadow-2xl max-w-md w-full p-8 pointer-events-auto border border-black/[0.03]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <CheckCheck size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-black/80">Quick Check</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide bg-amber-100 text-amber-700">
                          BETA
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowQuickCheckBetaModal(false)}
                    className="p-1.5 hover:bg-black/5 rounded-lg transition-colors"
                  >
                    <X size={18} className="text-black/30" />
                  </button>
                </div>

                <div className="space-y-4 text-sm text-black/60 mb-6">
                  <p className="text-black/70 leading-relaxed">
                    Quick Check scans your entire document for grammar issues, clarity improvements, and style suggestions - all at once.
                  </p>
                  <div className="bg-white/60 rounded-xl p-4 border border-black/[0.04]">
                    <p className="text-[13px] font-medium text-black/70 mb-2">What it does:</p>
                    <ul className="space-y-2 text-[13px] text-black/50">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                        <span><span className="text-rose-600 font-medium">Errors</span> - Grammar and spelling mistakes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        <span><span className="text-amber-600 font-medium">Warnings</span> - Clarity and readability issues</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                        <span><span className="text-blue-600 font-medium">Suggestions</span> - Style and word choice improvements</span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] text-amber-700 leading-relaxed">
                      This feature is still in development. Results may not always be accurate. We&apos;re actively improving it based on feedback.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowQuickCheckBetaModal(false)}
                    className="flex-1 px-4 py-3 bg-black/5 text-black/70 rounded-xl text-sm font-medium hover:bg-black/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowQuickCheckBetaModal(false);
                      handleToggleQuickCheck();
                    }}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20"
                  >
                    Try Quick Check
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

