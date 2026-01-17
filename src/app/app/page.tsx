"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MermaidDiagram } from "@/components/MermaidDiagram";
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
  Sparkles,
  Quote,
  Maximize2,
  Minimize2,
  CornerDownLeft,
  MoreVertical,
  LayoutPanelLeft,
  ListTree,
  GitMerge
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
    fact_check: 0,
    synonyms: 0,
    expand: 0,
    simplify: 0,
    explain: 0,
    improve: 0,
    chat: 0,
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

  const FREE_LIMITS: Record<string, number> = {
    fact_check: 3,
    paraphrase_preserve: 2,
    find_similes: 2,
    decompose_claims: 2,
    counterargument: 2,
    expand: 1,
    simplify: 1,
    explain: 1,
    improve: 1,
    chat: 3,
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
            // No documents - show type selection modal
            setShowDocumentTypeModal(true);
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

  // Create new document
  const handleNewDocument = () => {
    // Check document limit for free users
    if (!isPro && documents.length >= FREE_DOCUMENT_LIMIT) {
      setShowDocLimitModal(true);
      return;
    }
    // Show document type selection modal
    setShowDocumentTypeModal(true);
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
        </style></head>
        <body>
          <h1>${docTitle}</h1>
          <div class="meta">${wordCount} words · ${new Date().toLocaleDateString()}</div>
          ${blocks.map(b => `<div class="block">${b.type !== 'text' ? `<div class="block-label">${blockMeta[b.type].label}</div>` : ''}<div class="block-content">${b.content || ''}</div></div>`).join('')}
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
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


  // Keyboard shortcuts: Cmd/Ctrl + K to toggle Focus Mode, Cmd/Ctrl + Z for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Toggle Focus Mode
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!showVisualView) {
          handleToggleFocusMode();
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
  }, [showVisualView, history, historyIndex]);

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

  // Memoize focus action buttons to prevent re-renders
  const focusActionButtons = useMemo(() => [
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
    fact_check: AlertTriangle,
    paraphrase_preserve: FileText,
    find_similes: Eye,
    decompose_claims: ListTree,
    counterargument: Lightbulb,
    expand: Target,
    simplify: LayoutPanelLeft,
    improve: Sparkles,
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
                  onClick={() => handleCreateDocumentWithType("visualization")}
                  className="w-full px-3 py-2.5 text-left rounded hover:bg-white/[0.06] transition-colors flex items-center gap-3"
                >
                  <Eye size={15} className="text-white/50" />
                  <div>
                    <p className="text-[13px] text-white/90">Visualization</p>
                    <p className="text-[11px] text-white/40">Map thoughts, see logic visually</p>
                  </div>
                </button>

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
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-r border-black/[0.06] bg-[#fcfcfc] flex flex-col overflow-hidden flex-shrink-0"
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
          <div className="p-4 space-y-1.5">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-black/30">Documents</p>
              {!isPro && (
                <span className="text-[11px] text-black/35">{documents.length}/{FREE_DOCUMENT_LIMIT}</span>
              )}
            </div>
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleSelectDocument(doc)}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all",
                  currentDocId === doc.id
                    ? "bg-white border border-black/[0.08] shadow-sm"
                    : "hover:bg-white/60"
                )}
              >
                <FileText size={18} className={cn("flex-shrink-0", currentDocId === doc.id ? "text-black/60" : "text-black/35")} />
                <span className={cn("text-sm font-medium truncate flex-1", currentDocId === doc.id ? "text-black/80" : "text-black/55")}>
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
              <p className="text-sm text-black/35 text-center py-6">No documents yet</p>
            )}
          </div>

          {/* Current Document Stats - INCREASED sizes */}
          <div className="p-5 space-y-5 border-t border-black/[0.04]">
            <div className="p-5 rounded-xl bg-white border border-black/[0.04] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-black/50">
                  <FileText size={18} />
                  <span className="text-sm font-medium truncate">{docTitle}</span>
                </div>
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black/50 rounded-full animate-spin" />
                ) : lastSaved ? (
                  <Check size={16} className="text-emerald-500" />
                ) : null}
              </div>
              <div className="flex items-center justify-between text-sm text-black/40">
                <span>{wordCount} words</span>
                {lastSaved && <span>Saved</span>}
              </div>
              <div className="h-1.5 bg-black/[0.04] rounded-full overflow-hidden">
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
              <button
                onClick={handleToggleFocusMode}
                className={cn(
                  "w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl text-base font-semibold transition-all border-2",
                  showFocusMode
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-black/60 border-black/[0.1] hover:border-black/25"
                )}
              >
                <Wand2 size={20} />
                <span>Focus</span>
              </button>
            ) : null}

            {error && <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm">{error}</div>}
          </div>
        </div>

        <div className="p-5 border-t border-black/[0.04]">
          {isPro ? (
            /* Pro user status - BIGGER */
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Crown size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black/80">Pro Plan</p>
                  <p className="text-xs text-black/45">{premiumPromptsLimit - premiumPromptsUsed} premium prompts left</p>
                </div>
              </div>
              <Check size={18} className="text-emerald-500" />
            </div>
          ) : (
            /* Upgrade to Pro button - BIGGER */
            <button
              onClick={() => {
                posthog.capture("upgrade_modal_opened", { location: "sidebar" });
                setShowProModal(true);
              }}
              className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-base font-semibold hover:from-violet-600 hover:to-purple-600 transition-all shadow-sm"
            >
              <Crown size={20} /> Upgrade to Pro
            </button>
          )}
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 relative bg-white overflow-hidden flex flex-col">
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

        <header className="h-14 flex items-center justify-between px-6 border-b border-black/[0.06] bg-white z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-black/[0.04] rounded-lg transition-colors">
              <Menu size={20} className="text-black/40" />
            </button>
            <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="text-base font-medium bg-transparent border-none focus:outline-none text-black/80 placeholder:text-black/30" placeholder="Untitled" />
          </div>
          <div className="flex items-center gap-5">
            {/* Autosave indicator */}
            <div className="flex items-center gap-2 text-sm text-black/35">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>Saving...</span>
                </>
              ) : lastSaved ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Saved</span>
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
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/50 text-[11px] font-medium text-violet-700 hover:from-violet-100 hover:to-purple-100 transition-all"
              >
                <Crown size={12} />
                <span>Upgrade for more</span>
              </button>
            )}
            {showVisualView && (
              <button onClick={() => setShowVisualView(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-black/50 hover:text-black hover:bg-black/[0.03] transition-all">
                <ArrowLeft size={14} /> Back to Doc
              </button>
            )}
            {!showVisualView && documentType === "visualization" && (
              <>
                <button
                  onClick={() => setCanvasMode(!canvasMode)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium transition-colors",
                    canvasMode
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "text-black/40 hover:text-black/60 hover:bg-black/[0.02] border border-transparent"
                  )}
                  title={canvasMode ? "Switch to structured mode" : "Switch to canvas mode"}
                >
                  <Maximize2 size={12} />
                  {canvasMode ? "Canvas" : "Structured"}
                </button>
                <button 
                  onClick={handleToggleVisualize}
                  disabled={isAnalyzing}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    isAnalyzing
                      ? "text-black/30 cursor-not-allowed"
                      : "text-black/50 hover:text-black hover:bg-black/[0.03]"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black/20 border-t-black/50 rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Visualize
                    </>
                  )}
                </button>
              </>
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
                            {/* Action buttons for AI Native documents - BIGGER */}
                            {documentType === "ai_native" && showFocusMode && block.content.trim() && (
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex-wrap">
                                {focusActionButtons.map((item) => {
                                  const remaining = getRemainingUses(item.action);
                                  const allowed = remaining > 0 || remaining === Infinity;
                                  return (
                                    <button
                                      key={item.action}
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Select the block's text and trigger action
                                        const textarea = e.currentTarget.closest('.group')?.querySelector('textarea') as HTMLTextAreaElement;
                                        if (textarea && textarea.value.trim()) {
                                          textarea.focus();
                                          textarea.setSelectionRange(0, textarea.value.length);
                                          setSelectedText(textarea.value);
                                          setSelectedRange({ start: 0, end: textarea.value.length, textarea });
                                          handleFocusAction(item.action, textarea.value);
                                        }
                                      }}
                                      disabled={!allowed || isFocusLoading || !block.content.trim()}
                                      className={cn(
                                        "px-2.5 py-1 text-xs rounded-lg transition-all",
                                        !allowed || !block.content.trim()
                                          ? "text-black/20 cursor-not-allowed"
                                          : "text-black/50 hover:text-black/80 hover:bg-black/[0.06]"
                                      )}
                                      title={item.label}
                                    >
                                      {item.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <textarea
                            value={block.content || ""}
                            onChange={(e) => updateBlock(block.id, e.target.value)}
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
                              "w-full bg-transparent border-none focus:ring-0 p-0 resize-none leading-relaxed placeholder:text-black/20 focus:outline-none",
                              block.type === "text" ? "text-lg text-black/80" : "text-base font-medium text-black/75"
                            )}
                            style={{ overflow: "hidden" }}
                            rows={1}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
              <div className="sticky top-0 z-20 h-16 border-b border-black/[0.06] bg-[#f5f3ef]/90 backdrop-blur-md flex items-center justify-between px-6 md:px-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-black/30" />
                    <h2 className="text-base font-semibold text-black/80">{docTitle}</h2>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="h-5 w-[1px] bg-black/[0.08]" />
                    <span className="text-xs font-medium text-black/40 uppercase tracking-wider">
                      Logic Architecture
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden sm:block text-xs text-black/30 font-medium">
                    {aiResult?.nodes?.length || 0} nodes mapped
                  </span>
                  {!isPro && (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-700 hover:from-amber-500/15 hover:to-orange-500/15 transition-all"
                    >
                      <Crown size={12} />
                      <span>Upgrade to Pro</span>
                    </button>
                  )}
                  <button
                    onClick={handleConvertToDoc}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-semibold hover:bg-black/80 transition-all shadow-sm"
                  >
                    <RefreshCw size={14} strokeWidth={2.5} />
                    Sync to Editor
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
            {/* Header - BIGGER */}
            <div className="h-14 border-b border-black/[0.06] flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <span className="text-base font-semibold text-black/70">Assistant</span>
                <span className="text-xs text-black/30 font-mono bg-black/[0.03] px-2 py-0.5 rounded">⌘K</span>
              </div>
              <div className="flex items-center gap-2">
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

            {/* Usage Limits - BIGGER */}
            {!isPro ? (
              <div className="px-5 py-4 border-b border-black/[0.04] bg-black/[0.01]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-black/50 uppercase tracking-wider">Usage Limits</span>
                  {Object.entries(FREE_LIMITS).some(([action]) => {
                    const remaining = getRemainingUses(action);
                    return remaining !== Infinity && remaining < FREE_LIMITS[action];
                  }) && (
                    <button
                      onClick={() => setShowProModal(true)}
                      className="text-xs text-black/45 hover:text-black/65 underline"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {focusActionButtons.map((item) => {
                    const remaining = getRemainingUses(item.action);
                    const limit = FREE_LIMITS[item.action] || 0;
                    const used = focusUsage[item.action] || 0;
                    const showCount = remaining !== Infinity;
                    const isLow = showCount && remaining <= 1;
                    return (
                      <div
                        key={item.action}
                        className={cn(
                          "px-2.5 py-2 rounded-lg border",
                          isLow
                            ? "bg-rose-50/60 border-rose-200/60 text-rose-600"
                            : "bg-white/60 border-black/[0.08] text-black/60"
                        )}
                      >
                        <div className="font-medium truncate text-[11px]">{item.label}</div>
                        {showCount ? (
                          <div className="text-[10px] text-black/40 mt-0.5">
                            {used}/{limit}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 mt-0.5">∞</div>
                        )}
                      </div>
                    );
                  })}
                  <div className={cn(
                    "px-2.5 py-2 rounded-lg border",
                    getRemainingUses("chat") === Infinity
                      ? "bg-white/60 border-black/[0.08] text-black/60"
                      : (getRemainingUses("chat") <= 1
                          ? "bg-rose-50/60 border-rose-200/60 text-rose-600"
                          : "bg-white/60 border-black/[0.08] text-black/60")
                  )}>
                    <div className="font-medium truncate text-[11px]">Chat</div>
                    {getRemainingUses("chat") === Infinity ? (
                      <div className="text-[10px] text-emerald-600 mt-0.5">∞</div>
                    ) : (
                      <div className="text-[10px] text-black/40 mt-0.5">
                        {focusUsage.chat || 0}/{FREE_LIMITS.chat}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 border-b border-black/[0.04]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-200/50">
                    <Crown size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700">Pro</span>
                  </div>
                  <span className="text-sm text-black/45">
                    {premiumPromptsUsed >= premiumPromptsLimit
                      ? "Free models (unlimited)"
                      : `${premiumPromptsLimit - premiumPromptsUsed} premium prompts`}
                  </span>
                </div>
              </div>
            )}

            {/* Actions - BIGGER buttons */}
            <div className="px-5 py-4 border-b border-black/[0.04]">
              <div className="flex items-center justify-between mb-3">
                 <h4 className="text-[11px] font-semibold uppercase tracking-wider text-black/30">Actions</h4>
                 <div className="flex bg-black/[0.04] p-0.5 rounded-lg">
                    <button
                      onClick={() => setFocusViewMode("text")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${focusViewMode === "text" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
                    >
                      Text
                    </button>
                    <button
                      onClick={() => setFocusViewMode("icons")}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${focusViewMode === "icons" ? "bg-white shadow-sm text-black" : "text-black/40 hover:text-black/60"}`}
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
                            "px-3 py-1.5 text-sm rounded-lg transition-all",
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
                      const Icon = focusActionIcons[item.action] || Sparkles;
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
                            "w-9 h-9 flex items-center justify-center rounded-lg border transition-all",
                            !allowed
                              ? "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                              : selectedText && !isFocusLoading
                                ? "bg-white border-black/[0.06] shadow-sm hover:shadow-md hover:border-black/[0.1]"
                                : "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                          )}
                          title={item.label}
                        >
                           <Icon size={18} className={cn(
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

            {/* Chat area - BIGGER */}
            <div
              ref={focusChatRef}
              className="flex-1 overflow-y-auto"
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
                            <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50">
                              <div className="flex items-start gap-2.5">
                                <Crown size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-[12px] font-medium text-black/80 mb-1">Upgrade to Pro</p>
                                  <p className="text-[11px] text-black/60 leading-relaxed mb-2">
                                    For more high-quality responses, upgrade to Pro and get 150 premium prompts/month with Claude, ChatGPT, and more.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setShowProModal(true);
                                    }}
                                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline"
                                  >
                                    Learn more →
                                  </button>
                                </div>
                              </div>
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

            {/* Input - BIGGER */}
            <form onSubmit={handleFocusChatSubmit} className="p-5 border-t border-black/[0.06]">
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
              <div className="px-5 py-3 border-t border-black/[0.04]">
                <button
                  onClick={() => setFocusChat([])}
                  className="text-sm text-black/30 hover:text-black/55 transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </motion.div>
          </>
        )}
      </AnimatePresence>


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
                    A reasoning document designed for clarity.
                  </p>
                </div>

                <div className="space-y-5 mb-10">
                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">01</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Write naturally</h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">Type your thoughts. Right-click to add reasoning blocks.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">02</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Focus Mode <span className="text-[9px] text-black/20 font-medium px-1 py-0.5 rounded bg-black/[0.03]">⌘K</span></h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">Highlight text → fact-check, find synonyms, expand, or simplify. Your AI writing partner.</p>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-4 group">
                    <span className="text-[10px] font-bold text-black/20 uppercase tracking-widest w-4">03</span>
                    <div>
                      <h3 className="font-medium text-black/70 text-[15px] mb-1">Visualize</h3>
                      <p className="text-[13px] text-black/40 leading-relaxed">When stuck, hit Visualize to see your logic as a map and spot gaps.</p>
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
                    Cancel anytime. 14-day money-back guarantee.
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
                          ? 'Premium chat limit reached'
                          : limitReachedAction === 'counterargument'
                          ? 'Counterargument limit reached'
                          : limitReachedAction === 'improve' || limitReachedAction === 'polish'
                          ? 'Polish limit reached'
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
                        ? "You've used your 150 premium chat prompts this month. Upgrade for more premium access, or continue with free models."
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
    </div>
  );
}

