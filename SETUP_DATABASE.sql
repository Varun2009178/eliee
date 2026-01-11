-- ============================================
-- Complete Database Setup for Eliee
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create documents table (if it doesn't exist)
-- Note: canvas is a valid document_type that allows free-form positioning
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  document_type TEXT NOT NULL DEFAULT 'visualization' CHECK (document_type IN ('visualization', 'ai_native')),
  visualization_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add constraint separately to handle existing tables
DO $$
BEGIN
  -- Try to add constraint, ignore if it already exists
  ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
    CHECK (document_type IN ('visualization', 'ai_native', 'canvas'));
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 2. Create user_usage table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS user_usage (
  user_id TEXT PRIMARY KEY,
  focus_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  premium_prompts_used INTEGER NOT NULL DEFAULT 0,
  premium_prompts_limit INTEGER NOT NULL DEFAULT 150,
  premium_reset_date TIMESTAMP WITH TIME ZONE,
  visualizations_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add document_type column if it doesn't exist (for existing documents table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'document_type'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN document_type TEXT DEFAULT 'visualization' 
    CHECK (document_type IN ('visualization', 'ai_native'));
    
    UPDATE documents
    SET document_type = 'visualization'
    WHERE document_type IS NULL;
  END IF;

  -- Ensure canvas is in the constraint (update constraint if needed)
  -- Drop and recreate constraint to include canvas
  BEGIN
    ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
    ALTER TABLE documents ADD CONSTRAINT documents_document_type_check
      CHECK (document_type IN ('visualization', 'ai_native', 'canvas'));
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore if constraint doesn't exist or can't be modified
  END;
END $$;

-- 4. Add premium prompt columns if they don't exist (for existing user_usage table)
DO $$ 
BEGIN
  -- Add is_pro column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_usage' AND column_name = 'is_pro'
  ) THEN
    ALTER TABLE user_usage ADD COLUMN is_pro BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add premium_prompts_used column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_usage' AND column_name = 'premium_prompts_used'
  ) THEN
    ALTER TABLE user_usage ADD COLUMN premium_prompts_used INTEGER DEFAULT 0;
  END IF;
  
  -- Add premium_prompts_limit column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_usage' AND column_name = 'premium_prompts_limit'
  ) THEN
    ALTER TABLE user_usage ADD COLUMN premium_prompts_limit INTEGER DEFAULT 150;
  END IF;
  
  -- Add premium_reset_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_usage' AND column_name = 'premium_reset_date'
  ) THEN
    ALTER TABLE user_usage ADD COLUMN premium_reset_date TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 5. Set initial reset date for existing Pro users
UPDATE user_usage
SET premium_reset_date = (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')
WHERE is_pro = TRUE AND premium_reset_date IS NULL;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_usage_is_pro ON user_usage(is_pro);

-- 7. Row Level Security (RLS) Setup
-- NOTE: Since we're using Better Auth (not Supabase Auth), we have two options:
-- Option A: Disable RLS and rely on application-level security (simpler, works with Better Auth)
-- Option B: Use service role key for all operations (current approach)

-- For Better Auth compatibility, we'll disable RLS
-- Your app uses service role key for server-side operations, which bypasses RLS anyway
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS later with Better Auth integration, you would need to:
-- 1. Create a function that validates user_id from Better Auth session
-- 2. Use that function in RLS policies
-- For now, disabling RLS is the simplest approach since Better Auth handles auth

-- 10. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
CREATE TRIGGER update_user_usage_updated_at
  BEFORE UPDATE ON user_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Verification Queries (optional - run to verify)
-- ============================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('documents', 'user_usage');

-- Check documents table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'documents'
-- ORDER BY ordinal_position;

-- Check user_usage table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_usage'
-- ORDER BY ordinal_position;
