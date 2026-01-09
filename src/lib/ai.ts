import { ExplanationResult, PERSONAS } from "./constants";

const SYSTEM_PROMPT = `You are Eliee, an AI system that instantly converts any user input into a clear, visual, decision-focused diagram using Mermaid. Your goal is to help humans understand complex situations, systems, or concepts, highlighting causal relationships, feedback loops, and high-leverage points that influence outcomes. This is about clarity, judgment, and actionable insight.

VIRAL UTILITY:
You are designed for high-engagement, "scroll-stopping" clarity. 
- Current Events: Why gas prices rise, why someone is being canceled, the real cost of a wildfire.
- Life Hacks: Why diets fail, why procrastination happens, cognitive shortcuts.
- Curiosity: Counterintuitive insights, hidden causes, why X movie moment makes sense.
- Homework/PDFs: Analyze the specific content provided. Answer the actual question using the data from the PDF. Do not provide boilerplate about "how to analyze a PDF." Provide real answers based on the text.

STRICT CONSTRAINTS:
1. ESSENCE: Max 10 words. Must directly answer the user's specific question using simple words. No generic summaries.
2. NODES: Max 6-8 nodes for clarity.
3. LABELS: Use quotes for ALL labels. NO special characters, NO internal quotes, NO escaped quotes. (e.g., A["High Impact Node"] is good, A["High "Impact" Node"] is BAD).

INSTRUCTIONS:
1. Identify the core nodes (concepts, factors, or variables).
   - Highlight nodes that have high impact on outcomes (leverage points).
2. Determine the relationships:
   - Use "-->" for causal links, loops for feedback, and "-.->" for weak influences.
3. Organize hierarchically: causes/inputs at top, outcomes/decisions at bottom.
4. Annotate leverage points: Add "(High Impact)" inside the label.
5. Generate a punchy "Judgment Insight" (1 sentence): Reveal where small actions have outsized effects.

STRICT JSON OUTPUT:
Return ONLY a single valid JSON object.
{
  "intro": "Max 12 words. A sharp, instant hook.",
  "essence": "MAX 10 WORDS. Direct answer to the question using content-specific data.",
  "mermaidDiagram": "Mermaid code. Use TD or LR. Use quotes for ALL labels. NO quotes or special chars inside the label. Example: 'graph TD\\nA[\"Input\"] --> B[\"Process (High Impact)\"]'",
  "mermaidNodeDetails": [
    { "nodeId": "A", "description": "Quick context (max 12 words)", "color": "#ffffff" }
  ],
  "mentalModel": "Max 20 words. The underlying logic.",
  "provocation": "Max 12 words. A surprising truth.",
  "counterIntuitive": "Max 12 words. Why the obvious path fails.",
  "howToPlay": "The core action step based on the content.",
  "consequences": [
    "Input: [The cause]",
    "Process: [The interaction]",
    "Payoff: [The decision/outcome]"
  ],
  "firstPrinciples": [
    { "label": "Core Component", "whyItMatters": "Role in the system.", "icon": "Lucide icon", "color": "#000000" }
  ]
}
`;

export async function getExplanation(text: string, personaId: string, isFollowUp = false, previousContext?: string): Promise<ExplanationResult> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;

  if (!apiKey) throw new Error("API Key Missing");

  // Basic Heuristic Check for Spam/Gibberish
  const isGibberish = (str: string) => {
    const text = str.toLowerCase().trim();
    if (text.length < 3) return true;
    
    // Check for repetitive characters like "aaaaaa"
    if (/^(.)\1+$/.test(text)) return true;
    
    // Keyboard mash check: Very low vowel-to-consonant ratio in long strings with no spaces
    if (text.length > 8 && !text.includes(' ')) {
      const vowels = (text.match(/[aeiouy]/g) || []).length;
      const ratio = vowels / text.length;
      if (ratio < 0.2) return true;
    }

    // Repeated patterns like "asdfasdf"
    if (text.length >= 8) {
      const half = Math.floor(text.length / 2);
      const firstHalf = text.substring(0, half);
      const secondHalf = text.substring(half);
      if (firstHalf === secondHalf) return true;
    }

    return false;
  };

  if (!isFollowUp && isGibberish(text)) {
    throw new Error("This doesn't look like a concept Eliee can architect. Try entering a real topic or question.");
  }

  const tryRequest = async (model: string) => {
    const userPrompt = isFollowUp
      ? `Original System: ${previousContext || "Previous analysis"}. 
               User Question: "${text}". 
               Refine the diagrammatic understanding. Include a VALID Mermaid.js diagram.`
      : `Analyze "${text}". Generate a Mermaid.js diagram of the system. Reveal the lever. STRICT BREVITY. Return ONLY raw JSON.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://eliee-ai.app",
        "X-Title": "Eliee"
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5, // Lower temperature for more consistent JSON and speed
        max_tokens: 1000, // Limit tokens for speed
        response_format: { type: "json_object" } // Tell OpenRouter/Model we want JSON
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "AI Error");

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Eliee went silent. Try again!");

    try {
      // Robust JSON Extraction
      let jsonStr = content;

      // 1. Strip Markdown Code Blocks
      jsonStr = jsonStr.replace(/```json/g, "").replace(/```/g, "");

      // 2. Find the main JSON object
      const startIdx = jsonStr.indexOf('{');
      const endIdx = jsonStr.lastIndexOf('}');

      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = jsonStr.substring(startIdx, endIdx + 1);
      }

      // 3. Fix Common AI formatting errors
      // Replace backticks with double quotes for valid JSON (invalid in JSON spec)
      jsonStr = jsonStr.replace(/`/g, '"');
      // Remove invalid control characters (keep newlines/tabs)
      jsonStr = jsonStr.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, "");

      let parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) parsed = parsed[0];

      // Basic validation
      if (!parsed.essence || !parsed.firstPrinciples) {
        throw new Error("Missing parts of the brick!");
      }

      return parsed as ExplanationResult;
    } catch (e) {
      console.error("Parse Error Content:", content);
      throw new Error(`Bad AI format. Eliee was thinking too fast.`);
    }
  };

  const models = [
    "google/gemini-2.0-flash-exp:free", 
    "google/gemini-flash-1.5-8b-exp:free", // Much faster 8b model
    "meta-llama/llama-3.2-11b-vision-instruct:free", // Very fast
    "mistralai/mistral-7b-instruct:free" // Stable fallback
  ];
  let lastError = "";
  for (const model of models) {
    try {
      return await tryRequest(model);
    } catch (e: any) {
      lastError = e.message;
      continue;
    }
  }
  throw new Error(`Eliee is confused: ${lastError}`);
}

// --- Reasoning doc analysis (blocks) ---

interface ReasoningBlock {
  id: string;
  type: "claim" | "assumption" | "evidence" | "decision" | "risk" | "unknown";
  text: string;
  links?: string[];
}

export async function analyzeBlocks(blocks: ReasoningBlock[]): Promise<{
  essence: string;
  contradictions: string[];
  missingAssumptions: string[];
  secondOrder: string[];
  alternativeFramings: string[];
}> {
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("API Key Missing");

  const models = [
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-flash-1.5-8b-exp:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "mistralai/mistral-7b-instruct:free"
  ];

  const blockText = blocks
    .map((b, idx) => `${idx + 1}. [${b.type}] ${b.text}${b.links?.length ? ` (links: ${b.links.join(",")})` : ""}`)
    .join("\n");

  const reviewPrompt = `
You are Eliee. Analyze a structured reasoning doc.
Return STRICT JSON. No markdown.
Constraints:
- Essence: max 10 words. Direct answer / key takeaway from blocks.
- Provide contradictions, missing assumptions, second-order effects, alternative framings.
- Be concise; no fluff.

Blocks:
${blockText}

Return JSON:
{
  "essence": "max 10 words",
  "contradictions": ["..."],
  "missingAssumptions": ["..."],
  "secondOrder": ["..."],
  "alternativeFramings": ["..."]
}
`;

  let lastError = "";
  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://eliee-ai.app",
          "X-Title": "Eliee"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a terse reasoning auditor. Output strict JSON only." },
            { role: "user", content: reviewPrompt }
          ],
          temperature: 0.3,
          max_tokens: 600,
          response_format: { type: "json_object" }
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "AI Error");
      let content = data.choices?.[0]?.message?.content || "";

      content = content.replace(/```json/g, "").replace(/```/g, "");
      const startIdx = content.indexOf("{");
      const endIdx = content.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        content = content.substring(startIdx, endIdx + 1);
      }
      const parsed = JSON.parse(content);
      return {
        essence: parsed.essence || "",
        contradictions: parsed.contradictions || [],
        missingAssumptions: parsed.missingAssumptions || [],
        secondOrder: parsed.secondOrder || [],
        alternativeFramings: parsed.alternativeFramings || [],
      };
    } catch (e: any) {
      lastError = e.message;
      continue;
    }
  }
  throw new Error(`Reasoning analysis failed: ${lastError}`);
}
