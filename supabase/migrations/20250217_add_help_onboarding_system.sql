-- Session 25: Help Center, Onboarding & Launch Preparation
-- Tables for help articles, FAQs, onboarding progress, feature tours, and beta signups

-- ============================================================
-- Help Categories
-- ============================================================
CREATE TABLE IF NOT EXISTS help_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_categories_slug ON help_categories(slug);
CREATE INDEX IF NOT EXISTS idx_help_categories_published ON help_categories(is_published) WHERE is_published = true;

-- ============================================================
-- Help Articles
-- ============================================================
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  summary TEXT,
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  not_helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published) WHERE is_published = true;

-- ============================================================
-- Article Feedback
-- ============================================================
CREATE TABLE IF NOT EXISTS article_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_feedback_article ON article_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_article_feedback_user ON article_feedback(user_id);

-- ============================================================
-- FAQs
-- ============================================================
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_published ON faqs(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);

-- ============================================================
-- Onboarding Progress
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_step INT DEFAULT 0,
  completed_steps TEXT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  role TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);

-- ============================================================
-- Onboarding Checklists
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  step_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  action_url TEXT,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_role ON onboarding_checklists(role);

-- ============================================================
-- Feature Tours
-- ============================================================
CREATE TABLE IF NOT EXISTS feature_tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  target_roles TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- User Tour Progress
-- ============================================================
CREATE TABLE IF NOT EXISTS user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES feature_tours(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  current_step INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, tour_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tour_progress_user ON user_tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tour_progress_tour ON user_tour_progress(tour_id);

-- ============================================================
-- Beta Signups
-- ============================================================
CREATE TABLE IF NOT EXISTS beta_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  firm_name TEXT,
  role TEXT,
  firm_size TEXT,
  practice_areas TEXT[] DEFAULT '{}',
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beta_signups_email ON beta_signups(email);
CREATE INDEX IF NOT EXISTS idx_beta_signups_status ON beta_signups(status);

-- ============================================================
-- RLS Policies
-- ============================================================

-- Help Categories: public read for published
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published categories"
  ON help_categories FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role manages categories"
  ON help_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Help Articles: public read for published
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles"
  ON help_articles FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role manages articles"
  ON help_articles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Article Feedback: authenticated users can read/write their own
ALTER TABLE article_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own feedback"
  ON article_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert feedback"
  ON article_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages feedback"
  ON article_feedback FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- FAQs: public read for published
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published faqs"
  ON faqs FOR SELECT
  USING (is_published = true);

CREATE POLICY "Service role manages faqs"
  ON faqs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Onboarding Progress: users own their progress
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own onboarding"
  ON onboarding_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON onboarding_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON onboarding_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages onboarding"
  ON onboarding_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Onboarding Checklists: authenticated read
ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read checklists"
  ON onboarding_checklists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role manages checklists"
  ON onboarding_checklists FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Feature Tours: authenticated read
ALTER TABLE feature_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active tours"
  ON feature_tours FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role manages tours"
  ON feature_tours FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User Tour Progress: users own their progress
ALTER TABLE user_tour_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tour progress"
  ON user_tour_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tour progress"
  ON user_tour_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tour progress"
  ON user_tour_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages tour progress"
  ON user_tour_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Beta Signups: public insert, service role read
ALTER TABLE beta_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can sign up for beta"
  ON beta_signups FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role manages beta signups"
  ON beta_signups FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
