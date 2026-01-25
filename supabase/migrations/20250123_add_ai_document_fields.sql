-- Add AI analysis fields to documents table
-- Run this in your Supabase SQL Editor

-- AI categorization fields
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;

-- AI summary and extraction (stored as JSONB for flexibility)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_summary JSONB,
ADD COLUMN IF NOT EXISTS ai_extraction JSONB;

-- Create index for AI-categorized documents
CREATE INDEX IF NOT EXISTS idx_documents_ai_category ON documents(ai_category);
CREATE INDEX IF NOT EXISTS idx_documents_ai_processed ON documents(ai_processed_at);

-- Comment on columns
COMMENT ON COLUMN documents.ai_category IS 'AI-suggested category (financial, legal, property, etc.)';
COMMENT ON COLUMN documents.ai_confidence IS 'AI confidence score 0-100';
COMMENT ON COLUMN documents.ai_reasoning IS 'AI explanation for categorization';
COMMENT ON COLUMN documents.ai_summary IS 'AI-generated summary with key points';
COMMENT ON COLUMN documents.ai_extraction IS 'Extracted data (financial figures, dates, parties, etc.)';
