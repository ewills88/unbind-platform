-- Session 5: Document Tagging System
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  color VARCHAR(20) DEFAULT 'gray',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  CONSTRAINT tags_name_unique UNIQUE (name)
);

-- Index for fast autocomplete searches
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);

-- ============================================
-- 2. DOCUMENT_TAGS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_tags (
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (document_id, tag_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_tags_document ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id);

-- ============================================
-- 3. DOCUMENT RELATIONSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS document_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  related_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL DEFAULT 'related',
  confidence INTEGER DEFAULT 100,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_document_relationship UNIQUE (source_document_id, related_document_id),
  CONSTRAINT no_self_relationship CHECK (source_document_id != related_document_id)
);

-- Indexes for relationship queries
CREATE INDEX IF NOT EXISTS idx_doc_rel_source ON document_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_rel_related ON document_relationships(related_document_id);

-- ============================================
-- 4. ENHANCED AI INSIGHTS FIELD
-- ============================================
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS ai_insights JSONB;

COMMENT ON COLUMN documents.ai_insights IS 'Enhanced AI insights: sentiment, entities, deadlines, action items';

-- ============================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_relationships ENABLE ROW LEVEL SECURITY;

-- Tags: Anyone authenticated can read, attorneys can create
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Attorneys can create tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

CREATE POLICY "Attorneys can update tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

CREATE POLICY "Attorneys can delete tags"
  ON tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('attorney', 'admin')
    )
  );

-- Document Tags: Access based on document access
CREATE POLICY "Users can view document tags for accessible documents"
  ON document_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_tags.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Attorneys can manage document tags"
  ON document_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_tags.document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- Document Relationships: Access based on document access
CREATE POLICY "Users can view relationships for accessible documents"
  ON document_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_relationships.source_document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Attorneys can manage document relationships"
  ON document_relationships FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents d
      JOIN cases c ON d.case_id = c.id
      WHERE d.id = document_relationships.source_document_id
      AND c.attorney_id = auth.uid()
    )
  );

-- ============================================
-- 6. FUNCTION TO UPDATE TAG USAGE COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage count
DROP TRIGGER IF EXISTS trigger_update_tag_usage ON document_tags;
CREATE TRIGGER trigger_update_tag_usage
  AFTER INSERT OR DELETE ON document_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_tag_usage_count();

-- ============================================
-- 7. SEED SOME DEFAULT TAGS
-- ============================================
INSERT INTO tags (name, color) VALUES
  ('urgent', 'red'),
  ('review-needed', 'orange'),
  ('approved', 'green'),
  ('pending-signature', 'yellow'),
  ('confidential', 'purple'),
  ('draft', 'gray'),
  ('final', 'blue'),
  ('discovery', 'cyan'),
  ('exhibit', 'indigo')
ON CONFLICT (name) DO NOTHING;
