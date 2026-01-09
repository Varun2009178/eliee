import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Pool } from "pg";

export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Delete all user's documents from Supabase
    const { error: docsError } = await supabase
      .from("documents")
      .delete()
      .eq("user_id", userId);

    if (docsError) {
      console.error("Failed to delete documents:", docsError);
    }

    // 2. Delete the user from Better Auth tables (direct DB access)
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    try {
      // Better Auth tables use standard names: user, session, account, verification
      // We need to delete from user which cascades to session and account (if set up with CASCADE)
      await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);
    } finally {
      await pool.end();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

