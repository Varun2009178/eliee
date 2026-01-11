-- Add visualization_result column to documents table
-- Run this in your Supabase SQL Editor

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS visualization_result JSONB;
