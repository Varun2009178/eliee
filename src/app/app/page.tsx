"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MermaidDiagram } from "@/components/MermaidDiagram";
import { cn } from "@/lib/utils";
import { getUserUsage, updateUserUsage } from "@/lib/db";
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
  CornerDownLeft
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
}

// Block type metadata
const blockMeta: Record<BlockType, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  text: { label: "Text", icon: <Type size={14} />, color: "text-black/50", bgColor: "bg-transparent", borderColor: "border-transparent" },
  claim: { label: "Claim", icon: <Target size={14} />, color: "text-blue-600", bgColor: "bg-blue-50/50", borderColor: "border-blue-200" },
  assumption: { label: "Assumption", icon: <Lightbulb size={14} />, color: "text-amber-600", bgColor: "bg-amber-50/50", borderColor: "border-amber-200" },
  evidence: { label: "Evidence", icon: <Zap size={14} />, color: "text-emerald-600", bgColor: "bg-emerald-50/50", borderColor: "border-emerald-200" },
  decision: { label: "Decision", icon: <ArrowRight size={14} />, color: "text-purple-600", bgColor: "bg-purple-50/50", borderColor: "border-purple-200" },
  risk: { label: "Risk", icon: <AlertTriangle size={14} />, color: "text-rose-600", bgColor: "bg-rose-50/50", borderColor: "border-rose-200" },
  unknown: { label: "Unknown", icon: <HelpCircle size={14} />, color: "text-slate-600", bgColor: "bg-slate-50/50", borderColor: "border-slate-200" },
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
  const [blocks, setBlocks] = useState<DocBlock[]>([
    { id: "1", type: "text", content: "" }
  ]);
  const [docTitle, setDocTitle] = useState("Untitled");
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const FREE_LIMITS: Record<string, number> = {
    fact_check: 3,
    synonyms: 1,
    expand: 1,
    simplify: 1,
    explain: 1,
    improve: 1,
    chat: 3,
  };

  // Load usage from Supabase
  useEffect(() => {
    const loadUsage = async () => {
      if (session?.user?.id) {
        try {
          const usageData = await getUserUsage(session.user.id);
          if (usageData?.focus_usage) {
            setFocusUsage(usageData.focus_usage);
          }
          if (usageData?.is_pro !== undefined) {
            setIsPro(usageData.is_pro);
          }
        } catch (error) {
          console.error("Failed to load usage:", error);
        }
      }
    };
    loadUsage();
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
          // Reload user's pro status
          const usageData = await getUserUsage(session.user.id);
          if (usageData?.is_pro) {
            setIsPro(true);
          }
          // Remove query param
          window.history.replaceState({}, "", "/app");
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
            setCurrentDocId(docs[0].id);
            setDocTitle(docs[0].title);
            const loadedBlocks = (docs[0].blocks || [{ id: "1", type: "text", content: "" }]).map(b => ({
              ...b,
              content: b.content || ""
            }));
            setBlocks(loadedBlocks);
          } else {
            // No documents - create one automatically
            try {
              const newDoc = await createDocument(userId, "Untitled");
              setDocuments([newDoc]);
              setCurrentDocId(newDoc.id);
              setDocTitle(newDoc.title);
              const newBlocks = (newDoc.blocks || []).map(b => ({
                ...b,
                content: b.content || ""
              }));
              setBlocks(newBlocks);
            } catch (err: any) {
              console.error("Failed to create initial document:", err.message || err);
              setError(err.message || "Failed to create initial document.");
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load documents:", err);
          setError("Failed to load documents");
        })
        .finally(() => setIsLoadingDocs(false));
    }
  }, [session, sessionLoading]);

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
  const handleNewDocument = async () => {
    if (!session?.user?.id) return;
    try {
      const newDoc = await createDocument(session.user.id, "Untitled");
      setDocuments((prev) => [newDoc, ...prev]);
      setCurrentDocId(newDoc.id);
      setDocTitle(newDoc.title);
      const createdBlocks = (newDoc.blocks || []).map(b => ({
        ...b,
        content: b.content || ""
      }));
      setBlocks(createdBlocks);
      setShowVisualView(false);
      setAIResult(null);
    } catch (err) {
      console.error("Failed to create document:", err);
      setError("Failed to create document");
    }
  };

  // Switch to a different document
  const handleSelectDocument = (doc: Document) => {
    setCurrentDocId(doc.id);
    setDocTitle(doc.title);
    const selectedBlocks = (doc.blocks || [{ id: "1", type: "text", content: "" }]).map(b => ({
      ...b,
      content: b.content || ""
    }));
    setBlocks(selectedBlocks);
    setShowVisualView(false);
    setAIResult(null);
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

  const addBlock = useCallback((type: BlockType) => {
    const newBlock: DocBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: "",
    };
    setBlocks(prev => {
      const updated = [...prev];
      updated.splice(insertIndex + 1, 0, newBlock);
      return updated;
    });
    setShowCommandMenu(false);
  }, [insertIndex]);

  const updateBlock = useCallback((id: string, content: string) => {
    setBlocks(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          // Ensure content is always a string, never undefined or null
          return { ...b, content: content || "" };
        }
        return b;
      });
      return updated;
    });
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks(prev => prev.length > 1 ? prev.filter(b => b.id !== id) : prev);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    // Only show context menu in visualize mode (when focus mode is off)
    if (showFocusMode) return;

    e.preventDefault();
    e.stopPropagation();
    const maxX = window.innerWidth - 280;
    const maxY = window.innerHeight - 350;
    setMenuPos({ x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY) });
    // Insert AFTER this block (at index + 1)
    setInsertIndex(index);
    setShowCommandMenu(true);
  }, [showFocusMode]);

  const handleDocContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show context menu in visualize mode (when focus mode is off)
    if (showFocusMode) return;

    e.preventDefault();
    const maxX = window.innerWidth - 280;
    const maxY = window.innerHeight - 350;
    setMenuPos({ x: Math.min(e.clientX, maxX), y: Math.min(e.clientY, maxY) });
    // Insert at the end
    setInsertIndex(blocks.length - 1);
    setShowCommandMenu(true);
  }, [blocks.length, showFocusMode]);

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

  const handleVisualize = async () => {
    const allText = blocks.map(b => b.content).join("\n\n");
    if (allText.trim().length < 20) {
      setError("Write a bit more before visualizing");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setIsAnalyzing(true);
    setError(null);
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
      }
    } catch (e: any) {
      setError("Visualization temporarily unavailable. Try again.");
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


  // Keyboard shortcut: Cmd/Ctrl + K to toggle Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (!showVisualView) {
          handleToggleFocusMode();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showVisualView]);

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
    // Don't auto-visualize - user must click the button
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
      setShowProModal(true);
      return;
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
        } catch (error) {
          console.error("Failed to save usage:", error);
        }
      }
    }

    // Add user message to chat
    const actionLabel = action === "chat" ? textToProcess : `[${action.toUpperCase()}] "${textToProcess.substring(0, 50)}${textToProcess.length > 50 ? "..." : ""}"`;
    setFocusChat(prev => [...prev, { role: "user", content: actionLabel }]);

    try {
      const context = blocks.map(b => b.content).join("\n\n").substring(0, 1000);
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          text: textToProcess,
          context,
          model: focusModel
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

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

      setFocusChat(prev => [...prev, { role: "assistant", content: formattedResult }]);

      // Scroll chat to bottom with RAF for smoother performance
      requestAnimationFrame(() => {
        focusChatRef.current?.scrollTo({ top: focusChatRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (err: any) {
      setFocusChat(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
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
    { action: "synonyms", label: "Rephrase" },
    { action: "expand", label: "Expand" },
    { action: "simplify", label: "Simplify" },
    { action: "improve", label: "Polish" },
  ], []);

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
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="h-full border-r border-black/[0.06] bg-[#fafafa] flex flex-col z-40 overflow-hidden"
      >
        <div className="p-5 flex items-center justify-between border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-lg" />
            <span className="font-semibold tracking-tight text-black text-sm">Eliee</span>
          </div>
          <button 
            onClick={handleNewDocument}
            className="p-1.5 hover:bg-black/[0.05] rounded-lg transition-colors"
            title="New document"
          >
            <Plus size={16} className="text-black/40" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Documents List */}
          <div className="p-3 space-y-1">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-black/25 px-2 mb-2">Documents</p>
            {documents.map((doc) => (
              <div 
                key={doc.id}
                onClick={() => handleSelectDocument(doc)}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all",
                  currentDocId === doc.id 
                    ? "bg-white border border-black/[0.06]" 
                    : "hover:bg-white/50"
                )}
              >
                <FileText size={14} className={cn("flex-shrink-0", currentDocId === doc.id ? "text-black/60" : "text-black/30")} />
                <span className={cn("text-xs font-medium truncate flex-1", currentDocId === doc.id ? "text-black/80" : "text-black/50")}>
                  {doc.title || "Untitled"}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/[0.05] rounded transition-all"
                >
                  <Trash2 size={12} className="text-black/30 hover:text-rose-500" />
                </button>
              </div>
            ))}
            {documents.length === 0 && (
              <p className="text-xs text-black/30 text-center py-4">No documents yet</p>
            )}
          </div>

          {/* Current Document Stats */}
          <div className="p-4 space-y-4 border-t border-black/[0.04]">
            <div className="p-4 rounded-xl bg-white border border-black/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-black/50">
                  <FileText size={14} />
                  <span className="text-xs font-medium truncate">{docTitle}</span>
                </div>
                {isSaving ? (
                  <div className="w-3 h-3 border border-black/20 border-t-black/50 rounded-full animate-spin" />
                ) : lastSaved ? (
                  <Check size={12} className="text-emerald-500" />
                ) : null}
              </div>
              <div className="flex items-center justify-between text-[11px] text-black/30">
                <span>{wordCount} words</span>
                {lastSaved && <span>Saved</span>}
              </div>
              <div className="h-1 bg-black/[0.03] rounded-full overflow-hidden">
                <div className="h-full bg-black/20 transition-all duration-300" style={{ width: `${Math.min(100, (wordCount / 300) * 100)}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleToggleVisualize}
                disabled={isAnalyzing || showFocusMode || (!hasContent && !showVisualView)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-medium transition-all relative",
                  showFocusMode 
                    ? "bg-black/[0.03] text-black/20 cursor-not-allowed"
                    : (hasContent || showVisualView) && !isAnalyzing 
                      ? showVisualView
                        ? "bg-blue-500 text-white hover:bg-blue-600"
                        : "bg-black text-white hover:bg-black/90"
                      : "bg-black/[0.03] text-black/20 cursor-not-allowed"
                )}
              >
                {isAnalyzing ? (
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Eye size={14} />
                )}
                <span>{showVisualView ? "Refresh" : "Visualize"}</span>
                {showFocusMode && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" title="Exit Focus Mode first" />
                )}
              </button>
              
              <button 
                onClick={handleToggleFocusMode}
                disabled={showVisualView}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs font-medium transition-all border",
                  showVisualView
                    ? "bg-black/[0.03] text-black/20 border-black/[0.04] cursor-not-allowed"
                    : showFocusMode 
                      ? "bg-blue-500 text-white border-blue-500" 
                      : "bg-white text-black/60 border-black/[0.08] hover:border-black/20"
                )}
              >
                <Wand2 size={14} />
                <span>Focus</span>
              </button>
            </div>
            
            {showFocusMode && (
              <p className="text-[9px] text-amber-600/70 text-center">Exit Focus Mode to use Visualize</p>
            )}

            {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-xs">{error}</div>}
          </div>
        </div>

        <div className="p-4 border-t border-black/[0.04] space-y-2">
          {/* Upgrade to Pro */}
          <button 
            onClick={() => setShowProModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
          >
            <Crown size={14} /> Upgrade to Pro
          </button>

          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-black/[0.06] text-xs font-medium text-black/50 hover:border-black/20 transition-all">
              <Download size={14} /> Export
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-black/10 rounded-lg shadow-xl overflow-hidden">
                  <button onClick={handleDownloadPDF} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-black/70 hover:bg-black/[0.02]">
                    <FileDown size={14} /> Download PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={() => window.location.href = "/"} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-all"
          >
            <Home size={14} /> Home
          </button>

          <button 
            onClick={() => router.push("/settings")} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-all"
          >
            <Settings size={14} /> Settings
          </button>
          
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-black/40 hover:text-black/70 hover:bg-black/[0.02] transition-all">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <main className="flex-1 relative bg-white overflow-hidden flex flex-col">
        <header className="h-12 flex items-center justify-between px-5 border-b border-black/[0.04] bg-white z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1.5 hover:bg-black/[0.03] rounded-lg transition-colors">
              <Menu size={16} className="text-black/40" />
            </button>
            <input type="text" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="text-sm font-medium bg-transparent border-none focus:outline-none text-black/80 placeholder:text-black/30" placeholder="Untitled" />
          </div>
          <div className="flex items-center gap-4">
            {/* Autosave indicator */}
            <div className="flex items-center gap-2 text-xs text-black/30">
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
            {showVisualView && (
              <button onClick={() => setShowVisualView(false)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-black/50 hover:text-black hover:bg-black/[0.03] transition-all">
                <ArrowLeft size={14} /> Back to Doc
              </button>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!showVisualView ? (
            <motion.div 
              key="doc" 
              ref={scrollContainerRef}
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="flex-1 overflow-auto" 
              onClick={() => { setShowCommandMenu(false); setShowExportMenu(false); }}
              onContextMenu={(e) => !showFocusMode && handleDocContextMenu(e)}
            >
              <div className="max-w-2xl mx-auto py-12 px-6">
                <div className="mb-8 space-y-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-black/20">Document</p>
                  <p className="text-sm text-black/30">Write naturally. Right-click to add structured blocks (available in Visualize mode).</p>
                </div>

                <div className="space-y-2">
                  {blocks.map((block, index) => (
                    <div key={block.id} onDragOver={(e) => handleDragOver(e, block.id)} className={cn("group relative rounded-lg transition-all", draggedId === block.id && "opacity-50", block.type !== "text" && "border-l-2", block.type !== "text" && blockMeta[block.type]?.borderColor)}>
                      <div className="flex items-start gap-2 py-1.5">
                        <div className="w-5 flex-shrink-0 pt-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-0.5">
                          <button onClick={() => removeBlock(block.id)} className="p-0.5 hover:bg-black/[0.03] rounded text-black/15 hover:text-black/40"><X size={10} /></button>
                          <div
                            draggable
                            onDragStart={() => handleDragStart(block.id)}
                            onDragEnd={handleDragEnd}
                            className="p-0.5 text-black/10 cursor-grab active:cursor-grabbing hover:text-black/25"
                          >
                            <GripVertical size={10} />
                          </div>
                        </div>
                        <div className={cn("flex-1 min-w-0 py-1.5 px-3 rounded-lg transition-colors", block.type !== "text" && blockMeta[block.type]?.bgColor)} onContextMenu={(e) => !showFocusMode && handleContextMenu(e, index)}>
                          {block.type !== "text" && blockMeta[block.type] && (
                            <div className={cn("inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider mb-1", blockMeta[block.type].color)}>
                              {blockMeta[block.type].icon}
                              {blockMeta[block.type].label}
                            </div>
                          )}
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
                                  "w-full bg-transparent border-none focus:ring-0 p-0 resize-none leading-relaxed placeholder:text-black/15 focus:outline-none",
                                  block.type === "text" ? "text-[15px] text-black/80" : "text-[14px] font-medium text-black/70"
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
              className="flex-1 flex flex-col bg-[#fafafa]"
            >
              {/* Simple header bar */}
              <div className="h-14 border-b border-black/[0.04] bg-white flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-black/20" />
                    <h2 className="text-sm font-semibold text-black/80">{docTitle}</h2>
                  </div>
                  <div className="h-4 w-[1px] bg-black/[0.04]" />
                  <span className="text-[11px] font-medium text-black/30 uppercase tracking-widest">
                    Logic Architecture
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-black/20 font-medium mr-2">
                    {aiResult?.nodes?.length || 0} nodes mapped
                  </span>
                  <button 
                    onClick={handleConvertToDoc} 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-black/90 transition-all shadow-sm"
                  >
                    <RefreshCw size={12} strokeWidth={3} /> 
                    Sync to Editor
                  </button>
                </div>
              </div>

              {/* Main content - clinical and precise */}
              <div className="flex-1 overflow-auto bg-[#fafafa]">
                <div className="flex flex-col lg:flex-row min-h-full">
                  
                  {/* Diagram Area */}
                  <div className="flex-1 p-4 sm:p-6 flex flex-col min-w-0">
                    
                    {/* Findings - Mobile Only (Top) */}
                    <div className="lg:hidden mb-6 space-y-4">
                        {aiResult?.essence && (
                            <div className="bg-white p-4 rounded-xl border border-black/[0.04]">
                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20 mb-2">Core Premise</p>
                                <p className="text-sm text-black/80 font-medium leading-relaxed">{aiResult.essence}</p>
                            </div>
                        )}
                    </div>

                    {/* Diagram Container */}
                    <div className="bg-white rounded-2xl border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.02)] relative min-h-[500px] flex flex-col items-center">
                      <div className="absolute inset-0 opacity-[0.015] pointer-events-none rounded-2xl" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                      
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center justify-center flex-1 py-10 gap-4">
                          <div className="w-8 h-8 border-3 border-black/10 border-t-black/40 rounded-full animate-spin" />
                          <div className="text-center">
                            <p className="text-[14px] font-medium text-black/60 mb-1">Analyzing structure...</p>
                            <p className="text-[12px] text-black/30">Extracting logic and connections</p>
                          </div>
                        </div>
                      ) : mermaidChart ? (
                        <div className="w-full p-4 sm:p-8 lg:p-12 overflow-x-auto">
                          <MermaidDiagram chart={mermaidChart} className="min-w-full" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center flex-1 py-20 text-center">
                          <div>
                            <p className="text-[14px] text-black/40 mb-2">No diagram available</p>
                            <p className="text-[12px] text-black/25">Click "Refresh" to generate visualization</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sidebar - Desktop (Right) / Mobile (Bottom) */}
                  <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-black/[0.04] bg-white flex flex-col flex-shrink-0">
                    <div className="p-6 space-y-8">
                        {/* Legend */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-black/[0.02]">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20 mb-3">Legend</p>
                            <div className="flex flex-wrap gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">Claim</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100">Assumption</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium border border-green-100">Evidence</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-100">Decision</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-pink-50 text-pink-700 font-medium border border-pink-100">Risk</span>
                            </div>
                        </div>

                      {/* Essence */}
                      {aiResult?.essence && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20 mb-3">Core Premise</p>
                          <p className="text-[14px] text-black/80 font-medium leading-relaxed">{aiResult.essence}</p>
                        </div>
                      )}

                      {/* Gaps */}
                      {aiResult?.gaps && aiResult.gaps.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20">Structural Gaps</p>
                            <div className="h-[1px] flex-1 bg-black/[0.04]" />
                          </div>
                          <div className="space-y-4">
                            {aiResult.gaps.map((gap, i) => (
                              <div key={i} className="flex items-start gap-3 group">
                                <span className="w-5 h-5 rounded-full bg-black/[0.03] text-black/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                  {i + 1}
                                </span>
                                <p className="text-[13px] text-black/50 leading-relaxed group-hover:text-black/70 transition-colors">{gap}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Next Steps */}
                      {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-black/20">Refinements</p>
                            <div className="h-[1px] flex-1 bg-black/[0.04]" />
                          </div>
                          <div className="space-y-4">
                            {aiResult.suggestions.map((s, i) => (
                              <div key={i} className="flex items-start gap-3 group">
                                <div className="w-5 h-5 rounded-full bg-black/[0.03] text-black/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                  <ArrowRight size={10} strokeWidth={3} />
                                </div>
                                <p className="text-[13px] text-black/50 leading-relaxed group-hover:text-black/70 transition-colors">{s}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                  {(["claim", "assumption", "evidence", "decision", "risk", "unknown", "text"] as BlockType[]).map((type) => (
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

      {/* Focus Mode Panel */}
      <AnimatePresence>
        {showFocusMode && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-80 h-full border-l border-black/[0.08] bg-white flex flex-col z-50"
            data-focus-sidebar="true"
          >
            {/* Header - minimal */}
            <div className="h-11 border-b border-black/[0.06] flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-black/70">Assistant</span>
                <span className="text-[10px] text-black/25 font-mono">⌘K</span>
              </div>
              <div className="flex items-center gap-1">
                <select
                  value={focusModel}
                  onMouseDown={(e) => e.stopPropagation()} // Prevent selection clearing
                  onChange={(e) => {
                    e.stopPropagation();
                    setFocusModel(e.target.value as typeof focusModel);
                  }}
                  className="text-[10px] text-black/40 bg-transparent border-none focus:outline-none cursor-pointer hover:text-black/60"
                >
                  <option value="fast">fast</option>
                  <option value="balanced">balanced</option>
                  <option value="quality">quality</option>
                </select>
                <button
                  onClick={() => setShowFocusMode(false)}
                  className="p-1 hover:bg-black/[0.04] rounded transition-colors"
                >
                  <X size={14} className="text-black/30" />
                </button>
              </div>
            </div>

            {/* Actions - compact row */}
            <div className="px-3 py-2 border-b border-black/[0.04]">
              <div className="flex flex-wrap gap-1">
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
                        "px-2 py-1 text-[11px] rounded transition-all",
                        !allowed
                          ? "text-black/15 cursor-not-allowed"
                          : selectedText && !isFocusLoading
                            ? "text-black/50 hover:text-black/80 hover:bg-black/[0.04]"
                            : "text-black/20 cursor-not-allowed"
                      )}
                    >
                      {item.label}
                      {allowed && showCount && <span className="text-black/20 ml-0.5">{remaining}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat area */}
            <div
              ref={focusChatRef}
              className="flex-1 overflow-y-auto"
            >
              {focusChat.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center px-8 text-center">
                  <p className="text-[13px] text-black/30 leading-relaxed">
                    Select text and choose an action above, or type a question below.
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-3">
                  {focusChat.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <p className="text-[11px] text-black/30 mb-1">{msg.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-[13px] text-black/70 leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </div>
                          {/* Add/Replace buttons for all assistant responses */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                // Add this response to the document (insert at cursor or end)
                                const textareas = document.querySelectorAll('textarea');
                                if (textareas.length > 0) {
                                  const textarea = textareas[textareas.length - 1] as HTMLTextAreaElement;
                                  const start = textarea.selectionStart;
                                  const end = textarea.selectionEnd;
                                  const newText = textarea.value.substring(0, start) + msg.content + textarea.value.substring(end);
                                  textarea.value = newText;
                                  textarea.focus();
                                  textarea.setSelectionRange(start + msg.content.length, start + msg.content.length);
                                  // Trigger the onChange to update the block
                                  const event = new Event('input', { bubbles: true });
                                  textarea.dispatchEvent(event);
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
                                    // Textarea replacement
                                    const textarea = selectedRange.textarea;
                                    const newText = textarea.value.substring(0, selectedRange.start) + 
                                                   msg.content + 
                                                   textarea.value.substring(selectedRange.end);
                                    textarea.value = newText;
                                    textarea.focus();
                                    textarea.setSelectionRange(selectedRange.start + msg.content.length, selectedRange.start + msg.content.length);
                                    // Trigger the onChange to update the block
                                    const event = new Event('input', { bubbles: true });
                                    textarea.dispatchEvent(event);
                                  } else {
                                    // Regular text selection replacement
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

            {/* Input - minimal */}
            <form onSubmit={handleFocusChatSubmit} className="p-3 border-t border-black/[0.06]">
              {!isActionAllowed('chat') ? (
                  <div className="text-center py-2">
                      <p className="text-[11px] text-black/40 mb-2">Free chat limit reached.</p>
                      <button 
                        type="button"
                        onClick={() => setShowProModal(true)}
                        className="text-[11px] font-semibold text-black underline hover:text-black/70"
                      >
                        Upgrade to continue
                      </button>
                  </div>
              ) : (
                <div className="flex items-center gap-2">
                    <input
                    type="text"
                    value={focusInput}
                    onChange={(e) => setFocusInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 bg-transparent text-[13px] text-black/80 placeholder:text-black/25 focus:outline-none"
                    />
                    <button
                    type="submit"
                    disabled={!focusInput.trim() || isFocusLoading}
                    className={cn(
                        "text-[11px] px-2 py-1 rounded transition-all",
                        focusInput.trim() && !isFocusLoading
                        ? "text-black/60 hover:text-black"
                        : "text-black/15"
                    )}
                    >
                    ↵
                    </button>
                </div>
              )}
            </form>
            
            {/* Footer with clear */}
            {focusChat.length > 0 && (
              <div className="px-3 py-2 border-t border-black/[0.04]">
                <button
                  onClick={() => setFocusChat([])}
                  className="text-[10px] text-black/25 hover:text-black/50 transition-colors"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </motion.div>
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
                    Free: 3 verifications, 1 of each other action. Upgrade for unlimited.
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
              <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full pointer-events-auto">
                <div className="p-6">
                  <p className="text-[13px] font-medium text-black/80 mb-4">Visualize</p>
                  
                  <div className="space-y-3 text-[13px] text-black/50 mb-6">
                    <p>Extracts the logical structure from your document into a diagram.</p>
                    <p>Best when your document gets long or ideas are tangled.</p>
                  </div>

                  <div className="flex items-center justify-between">
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
                      Continue
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

      {/* Pro Upgrade Modal */}
      <AnimatePresence>
        {showProModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
              onClick={() => setShowProModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="fixed inset-0 z-[201] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 pointer-events-auto border border-black/[0.03]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <Crown size={20} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-black">Upgrade to Pro</h2>
                      <p className="text-xs text-black/40">Unlock unlimited potential</p>
                    </div>
                  </div>
                  <button onClick={() => setShowProModal(false)} className="p-2 hover:bg-black/5 rounded-lg transition-colors">
                    <X size={18} className="text-black/30" />
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {[
                    "Unlimited Focus Assistant actions",
                    "Unlimited documents",
                    "Unlimited visualizations",
                    "Advanced AI analysis",
                    "Gap detection & suggestions",
                    "Priority support"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-black/70">
                      <Check size={16} className="text-emerald-500" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#fafafa] border border-black/[0.04] mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-black">$8.99</span>
                    <span className="text-black/40">/month</span>
                  </div>
                  <p className="text-xs text-black/40 mt-1">Billed monthly. Cancel anytime.</p>
                </div>

                <button
                  onClick={() => {
                    setShowProModal(false);
                    router.push("/pricing");
                  }}
                  className="w-full py-3.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-black/90 transition-all"
                >
                  View Pricing
                </button>

                <p className="text-center text-xs text-black/30 mt-4">
                  14-day free trial included
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

