import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssistAction = "chat" | "fact_check" | "synonyms" | "expand" | "simplify" | "explain" | "improve";

interface AssistRequest {
  action: AssistAction;
  text: string;
  context?: string; // surrounding document context
  model?: string;
}

const MODEL_MAP: Record<string, string> = {
  "fast": "google/gemma-3-27b-it:free",
  "balanced": "deepseek/deepseek-chat-v3-0324:free",
  "quality": "qwen/qwen-2.5-72b-instruct:free",
};

const ACTION_PROMPTS: Record<AssistAction, (text: string, context?: string) => string> = {
  chat: (text) => text,
  fact_check: (text) => `Fact-check this statement. If it's accurate, confirm it. If it's questionable or false, explain why and provide the correct information. Be concise.\n\nStatement: "${text}"`,
  synonyms: (text) => `Provide 5 alternative ways to phrase this. Keep the same meaning but vary the tone (formal, casual, punchy, academic, simple). Just list them, no explanation.\n\nOriginal: "${text}"`,
  expand: (text, context) => `Expand on this idea with more detail, examples, or supporting points. Keep the same voice and style as the surrounding context.\n\nContext: ${context || "N/A"}\n\nText to expand: "${text}"`,
  simplify: (text) => `Rewrite this to be simpler and clearer. Use shorter sentences and common words. Keep the core meaning.\n\nOriginal: "${text}"`,
  explain: (text) => `Explain this concept in simple terms, as if to someone unfamiliar with the topic. Be concise but thorough.\n\nText: "${text}"`,
  improve: (text, context) => `Improve this writing. Fix any issues with clarity, grammar, flow, or persuasiveness. Return only the improved version.\n\nContext: ${context || "N/A"}\n\nText to improve: "${text}"`,
};

export async function POST(req: NextRequest) {
  try {
    const body: AssistRequest = await req.json();
    const { action, text, context, model = "fast" } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const selectedModel = MODEL_MAP[model] || MODEL_MAP.fast;
    const prompt = ACTION_PROMPTS[action](text, context);

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
            content: "You are a precise writing assistant. Be concise, helpful, and direct. No fluff." 
          },
          { role: "user", content: prompt }
        ],
        temperature: action === "synonyms" ? 0.7 : 0.3,
        max_tokens: action === "expand" ? 800 : 400,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "AI request failed");
    }

    const result = data.choices?.[0]?.message?.content || "";
    
    return NextResponse.json({ 
      result,
      model: selectedModel.split("/")[1]?.split(":")[0] || model
    });
  } catch (error: any) {
    console.error("Assist API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

