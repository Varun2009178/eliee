import { NextRequest, NextResponse } from "next/server";
import { getUserUsage, updateUserUsage } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssistAction = "chat" | "fact_check" | "synonyms" | "expand" | "simplify" | "explain" | "improve" | "paraphrase_preserve" | "find_similes" | "decompose_claims" | "counterargument";

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
  fact_check: (text) => `Verify the factual accuracy of this statement. If accurate, confirm with a brief note. If inaccurate or questionable, identify the specific errors and provide accurate information with credible sources if applicable. Be objective and precise.\n\nStatement: "${text}"`,
  synonyms: (text) => `Provide 5 alternative phrasings that maintain the exact meaning. Vary formality levels (formal, professional, casual, academic, concise). List only the alternatives, no explanations.\n\nOriginal: "${text}"`,
  expand: (text, context) => `Expand this idea with substantive detail, relevant examples, and supporting evidence. Maintain the author's voice and writing style. Be thorough but focused.\n\nContext: ${context || "N/A"}\n\nText to expand: "${text}"`,
  simplify: (text) => `Rewrite this for clarity and accessibility. Use shorter sentences, simpler vocabulary, and direct language. Preserve all essential meaning.\n\nOriginal: "${text}"`,
  explain: (text) => `Explain this concept clearly and accurately for a general audience. Use precise terminology with brief definitions. Be comprehensive yet concise.\n\nText: "${text}"`,
  improve: (text, context) => `Improve this writing's clarity, precision, grammar, and flow. Enhance persuasiveness where appropriate. Return only the revised text, no commentary.\n\nContext: ${context || "N/A"}\n\nText to improve: "${text}"`,
  paraphrase_preserve: (text, context, graphStructure) => {
    const graphContext = graphStructure?.nodes
      ? `\n\nArgument Graph Nodes:\n${graphStructure.nodes.map(n => `- ${n.label} [${n.type}]`).join('\n')}`
      : '';
    return `Paraphrase this text while preserving the semantic nodes and claims present in it. Maintain the logical structure and key assertions, but improve clarity and flow.\n\nContext: ${context || "N/A"}${graphContext}\n\nText to paraphrase: "${text}"`;
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
    return `Generate thoughtful counterarguments or alternative perspectives to this claim. Consider edge cases, opposing viewpoints, and potential weaknesses in the reasoning.\n\nContext: ${context || "N/A"}${graphContext}\n\nClaim to challenge: "${text}"`;
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

    // Select model based on premium availability
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
            content: `You are a professional writing and reasoning assistant for Eliee, a thinking tool that helps users structure their arguments.

${graphStructure?.nodes && graphStructure.nodes.length > 0 ? `You have access to the user's REASONING GRAPH - a visual map of their document's logical structure. You can:
- Reference specific nodes (claims, assumptions, evidence, decisions, risks) from their graph
- Help them extract implicit claims and turn them into explicit graph nodes
- Suggest how to reorganize their argument by manipulating the graph structure
- Identify logical gaps or missing connections between nodes
- Help rewrite sections based on rearranged graph nodes

When you reference the graph, be specific about which nodes you're discussing.` : ''}

Be precise, substantive, and focused on improving the clarity and logical structure of their thinking. Address the user directly as "you". Avoid vague platitudes - give concrete, actionable suggestions.`
          },
          { role: "user", content: prompt }
        ],
        temperature: action === "synonyms" ? 0.7 : 0.3,
        max_tokens: action === "expand" ? 800 : 500,
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

