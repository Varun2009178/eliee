-- Add visualizations_used column to user_usage table
-- Run this in your Supabase SQL Editor

-- Check if column exists, if not add it
ALTER TABLE user_usage 
ADD COLUMN IF NOT EXISTS visualizations_used INTEGER DEFAULT 0;
