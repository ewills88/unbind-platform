-- Fix: Add missing columns to document_templates table

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- template_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'template_code') THEN
    ALTER TABLE document_templates ADD COLUMN template_code TEXT UNIQUE;
  END IF;

  -- state_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'state_code') THEN
    ALTER TABLE document_templates ADD COLUMN state_code TEXT;
  END IF;

  -- county_code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'county_code') THEN
    ALTER TABLE document_templates ADD COLUMN county_code TEXT;
  END IF;

  -- court_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'court_type') THEN
    ALTER TABLE document_templates ADD COLUMN court_type TEXT;
  END IF;

  -- form_number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'form_number') THEN
    ALTER TABLE document_templates ADD COLUMN form_number TEXT;
  END IF;

  -- template_file_path
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'template_file_path') THEN
    ALTER TABLE document_templates ADD COLUMN template_file_path TEXT NOT NULL DEFAULT '';
  END IF;

  -- preview_image_path
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'preview_image_path') THEN
    ALTER TABLE document_templates ADD COLUMN preview_image_path TEXT;
  END IF;

  -- field_mappings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'field_mappings') THEN
    ALTER TABLE document_templates ADD COLUMN field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;

  -- required_data_fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'required_data_fields') THEN
    ALTER TABLE document_templates ADD COLUMN required_data_fields TEXT[] DEFAULT '{}';
  END IF;

  -- conditional_sections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'conditional_sections') THEN
    ALTER TABLE document_templates ADD COLUMN conditional_sections JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- default_values
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'default_values') THEN
    ALTER TABLE document_templates ADD COLUMN default_values JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- version
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'version') THEN
    ALTER TABLE document_templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
  END IF;

  -- is_active
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'is_active') THEN
    ALTER TABLE document_templates ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- effective_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'effective_date') THEN
    ALTER TABLE document_templates ADD COLUMN effective_date DATE;
  END IF;

  -- superseded_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'superseded_by') THEN
    ALTER TABLE document_templates ADD COLUMN superseded_by UUID REFERENCES document_templates(id);
  END IF;

  -- category
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'category') THEN
    ALTER TABLE document_templates ADD COLUMN category TEXT;
  END IF;

  -- estimated_prep_time
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'estimated_prep_time') THEN
    ALTER TABLE document_templates ADD COLUMN estimated_prep_time INTEGER;
  END IF;

  -- instructions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_templates' AND column_name = 'instructions') THEN
    ALTER TABLE document_templates ADD COLUMN instructions TEXT;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_document_templates_code ON document_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_document_templates_state ON document_templates(state_code);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;
