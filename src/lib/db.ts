import { supabase } from './supabase'

export type BlockType = 'text' | 'claim' | 'assumption' | 'evidence' | 'decision' | 'risk' | 'unknown';

export interface DocBlock {
  id: string;
  type: BlockType;
  content: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  blocks: DocBlock[];
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
export async function createDocument(userId: string, title = 'Untitled'): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ 
      user_id: userId, 
      title,
      blocks: [{ id: '1', type: 'text', content: '' }]
    })
    .select()
    .single()

  if (error) {
    console.error("Supabase createDocument error:", error);
    if (error.code === '42P01') {
      throw new Error("The 'documents' table does not exist in your Supabase database. Please create it first.");
    }
    throw error;
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
      // No row found - create default
      return null
    }
    console.error("Get user usage error:", error);
    return null
  }
  return data
}

// Update user usage
export async function updateUserUsage(userId: string, usage: Record<string, number>): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_usage')
      .upsert({
        user_id: userId,
        focus_usage: usage,
        updated_at: new Date().toISOString()
      }, {
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
    const { error } = await supabase
      .from('user_usage')
      .upsert({
        user_id: userId,
        is_pro: isPro,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error("Update user pro status error:", error);
      throw error
    }
  } catch (err: any) {
    console.warn("Failed to update user pro status:", err?.message || err);
  }
}