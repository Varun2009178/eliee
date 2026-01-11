import { supabase } from './supabase'

export type BlockType = 'text' | 'claim' | 'assumption' | 'evidence' | 'decision' | 'risk' | 'unknown';

export interface DocBlock {
  id: string;
  type: BlockType;
  content: string;
}

export type DocumentType = 'visualization' | 'ai_native';

export interface Document {
  id: string;
  user_id: string;
  title: string;
  blocks: DocBlock[];
  document_type: DocumentType;
  visualization_result?: any; // Store the last visualization result
  created_at: string;
  updated_at: string;
}

// Get all docs for a user
export async function getUserDocuments(userId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Get single doc
export async function getDocument(docId: string, userId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

// Create new doc
export async function createDocument(userId: string, title = 'Untitled', documentType: DocumentType = 'visualization'): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ 
      user_id: userId, 
      title,
      document_type: documentType,
      blocks: [{ id: '1', type: 'text', content: '' }]
    })
    .select()
    .single()

  if (error) {
    console.error("Supabase createDocument error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    if (error.code === '42P01') {
      throw new Error("The 'documents' table does not exist in your Supabase database. Please create it first.");
    }
    if (error.code === '23514') {
      // Check constraint violation - likely document_type not in allowed values
      throw new Error(`Invalid document type. Allowed values: visualization, ai_native, canvas. Error: ${error.message}`);
    }
    throw new Error(error.message || "Failed to create document");
  }
  return data
}

// Save doc
export async function saveDocument(docId: string, userId: string, updates: Partial<Document>): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', docId)
    .eq('user_id', userId)

  if (error) throw error
}

// Delete doc
export async function deleteDocument(docId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId)
    .eq('user_id', userId)

  if (error) throw error
}

// User usage tracking for Focus Mode
export interface UserUsage {
  user_id: string;
  focus_usage: Record<string, number>; // { fact_check: 2, synonyms: 1, chat: 3, ... }
  is_pro: boolean; // Pro subscription status
  premium_prompts_used: number; // Number of premium model prompts used this month
  premium_prompts_limit: number; // Monthly limit for premium prompts (default: 150)
  premium_reset_date: string; // Date when premium prompts reset (monthly)
  visualizations_used: number; // Number of visualizations used (free users get 2)
  updated_at: string;
}

// Get user usage
export async function getUserUsage(userId: string): Promise<UserUsage | null> {
  const { data, error } = await supabase
    .from('user_usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No row found - return null, let updateUserUsage create it
      return null;
    }
    // For other errors (table doesn't exist, RLS issues), log and return null
    if (error.code === '42P01' || error.code === '42501') {
      console.warn("User usage table not accessible:", error.message);
      return null;
    }
    console.error("Get user usage error:", error);
    return null
  }
  return data
}

// Update user usage
export async function updateUserUsage(userId: string, usage: Record<string, number>, premiumPromptsUsed?: number, visualizationsUsed?: number): Promise<void> {
  try {
    // First, ensure the user_usage row exists
    const existing = await getUserUsage(userId);
    
    const updateData: any = {
      user_id: userId,
      focus_usage: usage,
      updated_at: new Date().toISOString()
    };
    
    if (premiumPromptsUsed !== undefined) {
      updateData.premium_prompts_used = premiumPromptsUsed;
    }
    
    if (visualizationsUsed !== undefined) {
      updateData.visualizations_used = visualizationsUsed;
    }
    
    // Preserve existing values if not provided
    if (existing) {
      if (updateData.is_pro === undefined) {
        updateData.is_pro = existing.is_pro || false;
      }
      if (updateData.premium_prompts_limit === undefined) {
        updateData.premium_prompts_limit = existing.premium_prompts_limit || 150;
      }
      if (updateData.premium_reset_date === undefined && existing.premium_reset_date) {
        updateData.premium_reset_date = existing.premium_reset_date;
      }
      if (updateData.visualizations_used === undefined) {
        updateData.visualizations_used = existing.visualizations_used || 0;
      }
    } else {
      // Set defaults for new row
      updateData.is_pro = false;
      updateData.premium_prompts_limit = 150;
      updateData.premium_prompts_used = premiumPromptsUsed || 0;
      updateData.visualizations_used = visualizationsUsed || 0;
    }
    
    const { error } = await supabase
      .from('user_usage')
      .upsert(updateData, {
        onConflict: 'user_id'
      })

    if (error) {
      // If table doesn't exist (42P01) or RLS issue, log but don't throw
      if (error.code === '42P01' || error.code === '42501') {
        console.warn("User usage table not accessible. Please create the table in Supabase:", error.message);
        return; // Gracefully fail - usage will be lost but app won't break
      }
      console.error("Update user usage error:", error);
      throw error
    }
  } catch (err: any) {
    // Catch any other errors and log without breaking the app
    console.warn("Failed to update user usage:", err?.message || err);
    // Don't throw - allow app to continue
  }
}

// Update user pro status
export async function updateUserProStatus(userId: string, isPro: boolean): Promise<void> {
  try {
    // First check if user exists
    const existing = await getUserUsage(userId);

    if (existing) {
      // Update existing row - only update is_pro field
      const { error } = await supabase
        .from('user_usage')
        .update({
          is_pro: isPro,
          // If upgrading to Pro, set premium reset date to next month
          ...(isPro && !existing.premium_reset_date ? {
            premium_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            premium_prompts_used: 0,
            premium_prompts_limit: 150
          } : {}),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error("Update user pro status error:", error);
        throw error;
      }
    } else {
      // Create new row
      const { error } = await supabase
        .from('user_usage')
        .insert({
          user_id: userId,
          is_pro: isPro,
          focus_usage: {},
          premium_prompts_used: 0,
          premium_prompts_limit: 150,
          premium_reset_date: isPro ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
          visualizations_used: 0,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Create user pro status error:", error);
        throw error;
      }
    }

    console.log(`Successfully updated user ${userId} pro status to: ${isPro}`);
  } catch (err: any) {
    console.error("Failed to update user pro status:", err?.message || err);
  }
}