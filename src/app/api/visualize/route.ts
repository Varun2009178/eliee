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

    const systemPrompt = `You are a world-class systems thinker and logic mapper. Your goal is to reveal the "hidden architecture" of a user's writing.

VISUAL STYLE:
- Professional, clinical, and precise.
- Use SHORT, punchy node labels (e.g., "Margin Compression" instead of "The margins are being compressed").
- Map 5-10 concepts only. Focus on the MOST critical leverage points.

OUTPUT SECTIONS:
1. Essence: A single, profound realization from the text.
2. Logic Map: The causal chain of the argument.
3. Gaps (SPECIFIC): Don't say "more data needed". Say "The unit cost of X is missing, making the margin claim unverified."
4. Next Steps (ACTIONABLE): Don't say "do research". Say "Run a stress test on the assumption that Y happens in 3 months."

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
  "gaps": ["Detailed, specific gap in logic"],
  "suggestions": ["Specific, high-leverage next step"]
}`;

    const userPrompt = `Extract structure from this writing. Pay special attention to any structured blocks (claims, assumptions, evidence, decisions, risks) that are explicitly marked:\n\n${enhancedText}`;

    let lastError = "";
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
            max_tokens: 1000,
            response_format: { type: "json_object" }
          }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || "AI Error");

        let content = data.choices?.[0]?.message?.content || "";
        
        // Clean up response
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();
        const startIdx = content.indexOf("{");
        const endIdx = content.lastIndexOf("}");
        if (startIdx !== -1 && endIdx !== -1) {
          content = content.substring(startIdx, endIdx + 1);
        }

        const parsed: VisualResult = JSON.parse(content);
        
        // Validate and provide defaults
        const result: VisualResult = {
          essence: parsed.essence || "Structure extracted",
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          connections: Array.isArray(parsed.connections) ? parsed.connections : [],
          gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        };

        return NextResponse.json({ result });
      } catch (e: any) {
        lastError = e.message;
        continue;
      }
    }

    throw new Error(`Visualization failed: ${lastError}`);
  } catch (error: any) {
    console.error("Visualize API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to visualize" },
      { status: 500 }
    );
  }
}

