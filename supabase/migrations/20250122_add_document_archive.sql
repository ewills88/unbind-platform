-- Add archive functionality to documents table
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/rpbjravqgflidnwjkgvc/sql

-- Add is_archived column (defaults to false for existing documents)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add archived_at timestamp column
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for faster archive filtering
CREATE INDEX IF NOT EXISTS idx_documents_is_archived ON documents(is_archived);

-- Update any null values to false
UPDATE documents SET is_archived = FALSE WHERE is_archived IS NULL;
