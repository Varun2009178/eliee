import { NextRequest, NextResponse } from "next/server";
import { getUserUsage, updateUserUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssistAction = "chat" | "fact_check" | "synonyms" | "expand" | "simplify" | "explain" | "improve" | "paraphrase_preserve" | "find_similes" | "decompose_claims" | "counterargument" | "check_logic" | "interactive_check";

// Quick Check suggestion types
interface QuickCheckSuggestion {
  type: "word" | "sentence";
  severity: "error" | "warning" | "improvement";
  original: string;
  replacement: string;
  reason: string;
  startIndex?: number;
  endIndex?: number;
}

interface QuickCheckResponse {
  isClean: boolean;
  suggestions: QuickCheckSuggestion[];
  summary: string;
}

interface GraphNode {
  id: string;
  label: string;
  type: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

interface GraphStructure {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface AssistRequest {
  action: AssistAction;
  text: string;
  context?: string; // surrounding document context
  graphStructure?: GraphStructure; // graph nodes and edges for graph-aware actions
  model?: string;
  userId?: string; // User ID for premium prompt tracking
}

// Premium models (Claude, GPT-4)
const PREMIUM_MODEL_MAP: Record<string, string> = {
  "fast": "anthropic/claude-3.5-sonnet",
  "balanced": "openai/gpt-4o-mini",
  "quality": "anthropic/claude-3.5-sonnet",
};

// Free fallback models (when premium limit reached)
const FREE_MODEL_MAP: Record<string, string> = {
  "fast": "google/gemma-3-27b-it:free",
  "balanced": "mistralai/mistral-small-3.1-24b-instruct:free",
  "quality": "qwen/qwen-2.5-72b-instruct:free",
};

const PREMIUM_PROMPTS_LIMIT = 150; // Monthly limit for premium prompts

const ACTION_PROMPTS: Record<AssistAction, (text: string, context?: string, graphStructure?: GraphStructure) => string> = {
  chat: (text, context, graphStructure) => {
    let prompt = text;
    if (graphStructure?.nodes && graphStructure.nodes.length > 0) {
      const graphContext = `\n\n[DOCUMENT STRUCTURE - You have access to this reasoning graph from the user's document:]
Nodes (key concepts):
${graphStructure.nodes.map(n => `• ${n.label} [${n.type}]`).join('\n')}
${graphStructure.edges && graphStructure.edges.length > 0 ? `\nConnections:\n${graphStructure.edges.map(e => {
        const fromNode = graphStructure.nodes.find(n => n.id === e.from);
        const toNode = graphStructure.nodes.find(n => n.id === e.to);
        return `• ${fromNode?.label || e.from} → ${toNode?.label || e.to}`;
      }).join('\n')}` : ''}

[DOCUMENT TEXT:]
${context || 'No additional context.'}

[USER QUESTION:]
${text}`;
      prompt = graphContext;
    } else if (context) {
      prompt = `[DOCUMENT CONTEXT:]\n${context}\n\n[USER QUESTION:]\n${text}`;
    }
    return prompt;
  },
  fact_check: (text) => `Verify the factual accuracy of this statement. If accurate, confirm with "Accurate: [brief note]". If inaccurate, start with "Inaccurate: [correction]". Be objective and concise. NO preamble.\n\nStatement: "${text}"`,
  synonyms: (text) => `Provide 5 alternative phrasings. List ONLY the alternatives. No conversational filler.\n\nOriginal: "${text}"`,
  expand: (text, context) => `Expand this idea with substantive detail. Start directly with the expanded text. NO "Here is an expansion..." or similar.\n\nContext: ${context || "N/A"}\n\nText to expand: "${text}"`,
  simplify: (text) => `Rewrite this for clarity. Output ONLY the simplified text. NO preamble.\n\nOriginal: "${text}"`,
  explain: (text) => `Explain this concept clearly and accurately. Start directly with the explanation. NO "Sure" or "Here is...".\n\nText: "${text}"`,
  improve: (text, context) => `Improve this writing. Focus on:
1. **Clarity**: Make vague statements specific. If something is unclear, rewrite it to be concrete.
2. **Logic flow**: Ensure ideas connect smoothly. Add transitions where needed.
3. **Precision**: Replace weak words with stronger, more precise alternatives.
4. **Completeness**: If an idea feels incomplete, expand it briefly to make the point land.

Do NOT just fix grammar - actively strengthen the argument and make the reasoning clearer.
Return ONLY the revised text, no meta-commentary.

Context: ${context || "N/A"}

Text to improve: "${text}"`,
  paraphrase_preserve: (text, context, graphStructure) => {
    const graphContext = graphStructure?.nodes
      ? `\n\nArgument Graph Nodes:\n${graphStructure.nodes.map(n => `- ${n.label} [${n.type}]`).join('\n')}`
      : '';
    return `Paraphrase this text. Output ONLY the paraphrased version. NO intro/outro.\n\nContext: ${context || "N/A"}${graphContext}\n\nText to paraphrase: "${text}"`;
  },
  find_similes: (text, context, graphStructure) => {
    const graphContext = graphStructure?.nodes
      ? `\n\nArgument Graph:\n${graphStructure.nodes.map(n => `- ${n.label} [${n.type}]`).join('\n')}`
      : '';
    return `Find synonyms and alternative words for key terms in this text. Provide 5-7 synonyms for important words that could be replaced to improve clarity, vary language, or adjust formality. Focus on words that carry significant meaning in the context.\n\nDocument Context: ${context || "N/A"}${graphContext}\n\nText: "${text}"`;
  },
  decompose_claims: (text, context, graphStructure) => {
    const existingNodes = graphStructure?.nodes
      ? `\n\nExisting nodes in your reasoning graph:\n${graphStructure.nodes.map(n => `• ${n.label} [${n.type}]`).join('\n')}\n\nExtract NEW claims that aren't already captured above.`
      : '';
    return `Decompose this text into explicit, atomic claims that can be represented as nodes in a reasoning graph. Each claim should be:
- A single, testable assertion
- Labeled with a type: [CLAIM], [ASSUMPTION], [EVIDENCE], [DECISION], or [RISK]
- Connected to other potential nodes where relevant

Format each as: "• [TYPE] Short label: Full claim"
${existingNodes}
\nContext: ${context || "N/A"}\n\nText to decompose: "${text}"`;
  },
  counterargument: (text, context, graphStructure) => {
    const graphContext = graphStructure?.nodes
      ? `\n\nExisting Argument Structure:\n${graphStructure.nodes.map(n => `- ${n.label} [${n.type}]`).join('\n')}`
      : '';
    return `Generate 2-3 thoughtful counterarguments. Start directly with the points (e.g., "1. [Point]"). NO "We are going to challenge..." or "Here are...".\n\nContext: ${context || "N/A"}${graphContext}\n\nClaim to challenge: "${text}"`;
  },
  check_logic: (text, context, graphStructure) => {
    const graphContext = graphStructure?.nodes
      ? `\n\nExisting Argument Structure:\n${graphStructure.nodes.map(n => `- ${n.label} [${n.type}]`).join('\n')}`
      : '';
    return `Analyze this text for logical reasoning issues. Be specific and actionable. Format your response with these sections:

**Inconsistencies** (if any):
- Point out any contradictory statements or logical conflicts

**Missing Steps** (if any):
- Identify gaps in the reasoning chain where steps are skipped
- Note any unstated assumptions that should be explicit

**Unclear Logic** (if any):
- Flag vague or ambiguous claims that need clarification
- Identify where cause-and-effect relationships are weak

**Suggestions to Strengthen**:
- For each issue found, suggest specifically what to expand or clarify
- Be concrete: "Explain WHY X leads to Y" rather than just "clarify this"

If the logic is sound, say so briefly and suggest what could make it even stronger.

NO preamble like "I'll analyze..." - start directly with the analysis.

Context: ${context || "N/A"}${graphContext}

Text to analyze: "${text}"`;
  },
  interactive_check: (text) => {
    return `Find writing issues. Return JSON array only.

Format: [{"type":"word"|"sentence","severity":"error"|"warning"|"improvement","original":"exact text","replacement":"fix","reason":"5 words max"}]

Rules:
- type: "word" for words/phrases, "sentence" for full rewrites
- severity: "error"=grammar, "warning"=clarity, "improvement"=style
- original: copy EXACT text from input
- 1-3 suggestions max, most important first
- Return [] if clean

Text: "${text}"`;
  },
};

export async function POST(req: NextRequest) {
  try {
    const body: AssistRequest = await req.json();
    const { action, text, context, graphStructure, model = "fast", userId } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    // Premium prompts ONLY count for "chat" action (talking to assistant)
    // All other actions (verify, paraphrase, synonyms, etc.) are unlimited for Pro users and use free models
    let usePremiumModel = false;
    let premiumPromptsUsed = 0;
    let userUsage = null;

    if (userId) {
      userUsage = await getUserUsage(userId);
      // Only check premium limits for "chat" action
      if (userUsage?.is_pro && action === "chat") {
        // Check if we need to reset monthly counter
        const now = new Date();
        const resetDate = userUsage.premium_reset_date ? new Date(userUsage.premium_reset_date) : now;
        const shouldReset = now.getTime() > resetDate.getTime();

        if (shouldReset) {
          // Reset monthly counter
          premiumPromptsUsed = 0;
        } else {
          premiumPromptsUsed = userUsage.premium_prompts_used || 0;
        }

        const limit = userUsage.premium_prompts_limit || PREMIUM_PROMPTS_LIMIT;
        usePremiumModel = premiumPromptsUsed < limit;
      }
      // For Pro users, all non-chat actions are unlimited and use free models
    }

    const modelMap = usePremiumModel ? PREMIUM_MODEL_MAP : FREE_MODEL_MAP;
    const selectedModel = modelMap[model] || modelMap.fast;
    const prompt = ACTION_PROMPTS[action](text, context, graphStructure);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://eliee.app",
        "X-Title": "Eliee"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: `You are a writing assistant for Eliee.
            
EXTREMELY IMPORTANT: Output ONLY the requested content.
- NO conversational filler (e.g., "Here is the paraphrased text", "I have analyzed...", "Sure!").
- NO meta-commentary.
- Go STRAIGHT to the point.
- If asked for a list, provide just the list.
- If asked to rewrite, provide just the rewrite.

${graphStructure?.nodes && graphStructure.nodes.length > 0 ? `You have access to the user's REASONING GRAPH. Reference specific nodes (claims, evidence) where relevant.` : ''}

Be precise and concise.`
          },
          { role: "user", content: prompt }
        ],
        temperature: action === "synonyms" ? 0.7 : action === "interactive_check" ? 0.1 : 0.3,
        max_tokens: action === "interactive_check" ? 400 : action === "expand" ? 800 : 500,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "AI request failed");
    }

    const result = data.choices?.[0]?.message?.content || "";

    // Update premium prompt usage ONLY for "chat" action when premium model was used
    let premiumPromptsRemaining = undefined;
    if (userId && userUsage?.is_pro && action === "chat") {
      if (usePremiumModel) {
        const newCount = premiumPromptsUsed + 1;
        await updateUserUsage(userId, userUsage.focus_usage || {}, newCount);
        const limit = userUsage.premium_prompts_limit || PREMIUM_PROMPTS_LIMIT;
        premiumPromptsRemaining = Math.max(0, limit - newCount);
      } else {
        const limit = userUsage.premium_prompts_limit || PREMIUM_PROMPTS_LIMIT;
        premiumPromptsRemaining = Math.max(0, limit - premiumPromptsUsed);
      }
    }

    // Special handling for interactive_check - parse JSON and add indices
    if (action === "interactive_check") {
      try {
        // Clean the result - remove markdown code blocks if present
        let cleanedResult = result.trim();
        if (cleanedResult.startsWith("```json")) {
          cleanedResult = cleanedResult.slice(7);
        } else if (cleanedResult.startsWith("```")) {
          cleanedResult = cleanedResult.slice(3);
        }
        if (cleanedResult.endsWith("```")) {
          cleanedResult = cleanedResult.slice(0, -3);
        }
        cleanedResult = cleanedResult.trim();

        const suggestions: QuickCheckSuggestion[] = JSON.parse(cleanedResult);

        // Add startIndex and endIndex for each suggestion
        const processedSuggestions = suggestions.map(s => {
          const startIndex = text.indexOf(s.original);
          return {
            ...s,
            startIndex: startIndex >= 0 ? startIndex : undefined,
            endIndex: startIndex >= 0 ? startIndex + s.original.length : undefined,
          };
        });

        const quickCheckResponse: QuickCheckResponse = {
          isClean: processedSuggestions.length === 0,
          suggestions: processedSuggestions,
          summary: processedSuggestions.length === 0
            ? "Looking good! No issues found."
            : `Found ${processedSuggestions.length} suggestion${processedSuggestions.length === 1 ? "" : "s"}`,
        };

        return NextResponse.json({
          result: quickCheckResponse,
          model: selectedModel.split("/")[1]?.split(":")[0] || model,
          isPremium: usePremiumModel,
          premiumPromptsRemaining
        });
      } catch (parseError) {
        // If JSON parsing fails, return empty suggestions
        console.error("Failed to parse interactive_check response:", parseError);
        return NextResponse.json({
          result: {
            isClean: true,
            suggestions: [],
            summary: "Looking good! No issues found.",
          } as QuickCheckResponse,
          model: selectedModel.split("/")[1]?.split(":")[0] || model,
          isPremium: usePremiumModel,
          premiumPromptsRemaining
        });
      }
    }

    return NextResponse.json({
      result,
      model: selectedModel.split("/")[1]?.split(":")[0] || model,
      isPremium: usePremiumModel,
      premiumPromptsRemaining
    });
  } catch (error: any) {
    console.error("Assist API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

