import { NextRequest, NextResponse } from "next/server";
import { analyzeBlocks } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { blocks } = body;
    if (!blocks || !Array.isArray(blocks)) {
      return NextResponse.json({ error: "Blocks array required" }, { status: 400 });
    }

    const result = await analyzeBlocks(blocks);
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Reason API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze reasoning doc" },
      { status: 500 }
    );
  }
}

