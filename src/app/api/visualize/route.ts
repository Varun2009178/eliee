import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VisualNode {
  id: string;
  label: string;
  type: string;
}

interface VisualResult {
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

interface BlockInfo {
  type: string;
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, blocks } = body;

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "Not enough content to visualize" }, { status: 400 });
    }

    // Extract structured blocks (claim, assumption, evidence, etc.) and include them in the prompt
    const structuredBlocks: BlockInfo[] = blocks || [];
    const structuredInfo = structuredBlocks
      .filter(b => b.type !== 'text' && b.content.trim())
      .map(b => `[${b.type.toUpperCase()}] ${b.content}`)
      .join('\n');
    
    const enhancedText = structuredInfo 
      ? `Structured blocks in document:\n${structuredInfo}\n\nFull text:\n${text}`
      : text;

    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }

    const models = [
      "google/gemma-3-27b-it:free",
      "deepseek/deepseek-chat-v3-0324:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "mistralai/mistral-small-3.1-24b-instruct:free",
    ];

    const systemPrompt = `You are a world-class systems thinker and logic mapper. Your goal is to reveal the "hidden architecture" of the user's writing by addressing them directly.

VISUAL STYLE:
- Professional, clinical, and precise.
- Use SHORT, punchy node labels (e.g., "Margin Compression" instead of "The margins are being compressed").
- Map 5-10 concepts only. Focus on the MOST critical leverage points.

OUTPUT SECTIONS:
1. Essence: A single, profound realization from the text.
2. Logic Map: The causal chain of the argument.
3. Gaps (SPECIFIC): Address the user directly as "you". Don't say "more data needed". Say "You're missing the unit cost of X, making your margin claim unverified."
4. Next Steps (ACTIONABLE): Address the user directly as "you". Don't say "do research". Say "You should run a stress test on the assumption that Y happens in 3 months."
5. Thoughts: For each gap and suggestion, provide a brief AI thought/comment explaining the reasoning (these can be in third person as meta-commentary).

Node types: claim, assumption, evidence, decision, risk

Return STRICT JSON:
{
  "essence": "Profound core realization",
  "nodes": [
    { "id": "n1", "label": "Short Label", "type": "claim|assumption|evidence|decision|risk" }
  ],
  "connections": [
    { "from": "n1", "to": "n2" }
  ],
  "gaps": ["Detailed, specific gap addressing the user as 'you'"],
  "suggestions": ["Specific, high-leverage next step addressing the user as 'you'"],
  "thoughts": {
    "gaps": ["AI thought about why this gap matters"],
    "suggestions": ["AI thought about why this suggestion is valuable"],
    "nodes": {
      "n1": "AI thought about this node"
    }
  }
}`;

    const userPrompt = `Extract structure from this writing. Pay special attention to any structured blocks (claims, assumptions, evidence, decisions, risks) that are explicitly marked:\n\n${enhancedText}`;

    let lastError = "";
    const errors: string[] = [];
    
    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://eliee.app",
            "X-Title": "Eliee"
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            max_tokens: 2000,
            // Some free models don't support response_format, so we'll parse manually
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          const errorMsg = data.error?.message || `HTTP ${response.status}`;
          errors.push(`${model}: ${errorMsg}`);
          lastError = errorMsg;
          continue;
        }

        let content = data.choices?.[0]?.message?.content || "";
        
        if (!content) {
          errors.push(`${model}: Empty response`);
          continue;
        }
        
        // Clean up response - remove markdown code blocks
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // Extract JSON from response
        const startIdx = content.indexOf("{");
        const endIdx = content.lastIndexOf("}");
        if (startIdx === -1 || endIdx === -1) {
          errors.push(`${model}: No JSON found in response`);
          continue;
        }
        
        content = content.substring(startIdx, endIdx + 1);

        let parsed: VisualResult;
        try {
          parsed = JSON.parse(content);
        } catch (parseError: any) {
          errors.push(`${model}: JSON parse error - ${parseError.message}`);
          continue;
        }
        
        // Validate and provide defaults
        const result: VisualResult = {
          essence: parsed.essence || "Structure extracted",
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          connections: Array.isArray(parsed.connections) ? parsed.connections : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          thoughts: parsed.thoughts || {},
        };

        return NextResponse.json({ result });
      } catch (e: any) {
        const errorMsg = e.message || "Unknown error";
        errors.push(`${model}: ${errorMsg}`);
        lastError = errorMsg;
        console.error(`Visualization failed for ${model}:`, errorMsg);
        continue;
      }
    }

    // All models failed - return detailed error
    console.error("All visualization models failed:", errors);
    throw new Error(`Visualization failed. Tried ${models.length} models. Last error: ${lastError || "Unknown error"}`);
  } catch (error: any) {
    console.error("Visualize API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to visualize" },
      { status: 500 }
    );
  }
}

