import { NextRequest, NextResponse } from "next/server";
import { getExplanation } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let prompt = "";
    let personaId = "";
    let history = [];
    
    const contentType = req.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      prompt = formData.get("prompt") as string || "";
      personaId = formData.get("personaId") as string || "";
      const historyStr = formData.get("history") as string || "[]";
      history = JSON.parse(historyStr);
      
      const file = formData.get("file") as File;
      if (file) {
        // Use the standard package name
        const { PDFParse } = await import("pdf-parse");
        
        // Fix for "Setting up fake worker failed" in Next.js/Node environment
        try {
          const path = await import("path");
          const workerPath = path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
          PDFParse.setWorker(workerPath);
        } catch (workerError) {
          console.error("Warning: Could not set PDF worker path:", workerError);
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Parse the PDF
        const parser = new PDFParse({
          data: buffer,
          verbosity: 0
        });
        
        // Extract text from PDF
        const result = await parser.getText();
        const text = result.text;
        
        // Combine the prompt with the extracted text
        prompt = `User Question: ${prompt}\n\nPDF Content to Analyze:\n${text}`;
        
        // Clean up
        await parser.destroy();
      }
    } else {
      const body = await req.json();
      prompt = body.prompt;
      personaId = body.personaId;
      history = body.history || [];
    }

    if (!prompt) {
      return NextResponse.json({ error: "No content to explain" }, { status: 400 });
    }

    const isFollowUp = history && history.length > 0;
    const previousContext = isFollowUp ? JSON.stringify(history) : undefined;

    const result = await getExplanation(prompt, personaId, isFollowUp, previousContext);

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Explain API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get explanation" },
      { status: 500 }
    );
  }
}


