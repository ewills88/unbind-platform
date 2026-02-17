-- Session 17 CP3: Settlement Agreement Generation, Document Workflow & Analytics
-- Builds on existing generated_documents and document_templates tables
-- Adds: template sections (state-specific content), signatures, review comments

-- ============================================================================
-- Settlement Template Sections (state-specific MSA clause text)
-- ============================================================================
CREATE TABLE settlement_template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which state/template this belongs to
  state_code TEXT NOT NULL,
  section_key TEXT NOT NULL,
  section_title TEXT NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,

  -- Content (with {{variable}} placeholders)
  content_template TEXT NOT NULL,
  plain_text_template TEXT,

  -- Which variables this section uses
  required_variables TEXT[] DEFAULT '{}',

  -- Conditional rendering
  condition_field TEXT,        -- e.g., 'has_children'
  condition_value TEXT,        -- e.g., 'true'

  -- Metadata
  is_required BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(state_code, section_key)
);

-- ============================================================================
-- Document Signatures
-- ============================================================================
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to generated document
  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  -- Signer info
  signer_role TEXT NOT NULL CHECK (signer_role IN (
    'petitioner', 'respondent', 'petitioner_attorney', 'respondent_attorney',
    'mediator', 'judge', 'notary', 'witness'
  )),
  signer_name TEXT NOT NULL,
  signer_email TEXT,

  -- Signature status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'viewed', 'signed', 'declined', 'expired'
  )),

  -- Signature data
  signed_at TIMESTAMPTZ,
  signature_method TEXT CHECK (signature_method IN ('electronic', 'wet_ink', 'docusign', 'notarized')),
  ip_address TEXT,

  -- Ordering
  sign_order INTEGER NOT NULL DEFAULT 0,

  -- Tracking
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  decline_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Document Review Comments
-- ============================================================================
CREATE TABLE document_review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,

  -- Who commented
  author_id UUID NOT NULL REFERENCES auth.users(id),
  author_name TEXT NOT NULL,

  -- Comment content
  section_key TEXT,            -- which section the comment is about
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'comment' CHECK (comment_type IN (
    'comment', 'suggestion', 'approval', 'rejection', 'question'
  )),

  -- Threading
  parent_comment_id UUID REFERENCES document_review_comments(id),

  -- Resolution
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Settlement Document Versions (track content changes)
-- ============================================================================
CREATE TABLE settlement_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  document_id UUID NOT NULL REFERENCES generated_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,

  -- Content snapshot
  sections_content JSONB NOT NULL DEFAULT '{}',
  variables_snapshot JSONB NOT NULL DEFAULT '{}',

  -- Change info
  change_summary TEXT,
  changed_by UUID NOT NULL REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(document_id, version_number)
);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_settlement_template_sections_state ON settlement_template_sections(state_code);
CREATE INDEX idx_settlement_template_sections_order ON settlement_template_sections(state_code, section_order);
CREATE INDEX idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_status ON document_signatures(status);
CREATE INDEX idx_document_review_comments_document ON document_review_comments(document_id);
CREATE INDEX idx_document_review_comments_author ON document_review_comments(author_id);
CREATE INDEX idx_settlement_document_versions_doc ON settlement_document_versions(document_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE settlement_template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_document_versions ENABLE ROW LEVEL SECURITY;

-- Template sections: readable by all authenticated users (system data)
CREATE POLICY "Authenticated users can read template sections"
  ON settlement_template_sections FOR SELECT
  TO authenticated
  USING (true);

-- Signatures: access through document's case
CREATE POLICY "Users can view signatures for their case documents"
  ON document_signatures FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_signatures.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage signatures for their case documents"
  ON document_signatures FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_signatures.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- Review comments: access through document's case
CREATE POLICY "Users can view comments on their case documents"
  ON document_review_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_review_comments.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can add comments to their case documents"
  ON document_review_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = document_review_comments.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own comments"
  ON document_review_comments FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid());

-- Document versions: access through document's case
CREATE POLICY "Users can view versions of their case documents"
  ON settlement_document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = settlement_document_versions.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

CREATE POLICY "Users can create versions of their case documents"
  ON settlement_document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    changed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM generated_documents gd
      JOIN cases c ON c.id = gd.case_id
      WHERE gd.id = settlement_document_versions.document_id
      AND (c.attorney_id = auth.uid() OR c.client_id = auth.uid())
    )
  );

-- ============================================================================
-- Updated_at triggers
-- ============================================================================
CREATE OR REPLACE TRIGGER set_settlement_template_sections_updated
  BEFORE UPDATE ON settlement_template_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_document_signatures_updated
  BEFORE UPDATE ON document_signatures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_document_review_comments_updated
  BEFORE UPDATE ON document_review_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Seed California MSA Template Sections
-- ============================================================================
INSERT INTO settlement_template_sections (state_code, section_key, section_title, section_order, content_template, plain_text_template, required_variables, is_required, description) VALUES

-- Preamble / Introduction
('CA', 'preamble', 'Preamble', 1,
'This Marital Settlement Agreement ("Agreement") is entered into by and between {{petitioner_name}} ("Petitioner") and {{respondent_name}} ("Respondent"), collectively referred to as "the Parties," in connection with the dissolution of their marriage, Case No. {{case_number}}, filed in the Superior Court of the State of California, County of {{county}}.',
'This Marital Settlement Agreement is entered into by {{petitioner_name}} (Petitioner) and {{respondent_name}} (Respondent) for Case No. {{case_number}} in {{county}} County, California.',
ARRAY['petitioner_name', 'respondent_name', 'case_number', 'county'],
true, 'Opening paragraph identifying parties and case'),

-- Recitals
('CA', 'recitals', 'Recitals', 2,
'WHEREAS, the Parties were married on {{marriage_date}} in {{marriage_location}}; and

WHEREAS, the Parties separated on {{separation_date}}; and

WHEREAS, the Parties desire to settle all issues arising from their marital relationship, including but not limited to property division, spousal support, child custody, child support, and all other matters;

NOW, THEREFORE, in consideration of the mutual promises and covenants contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:',
'The parties were married on {{marriage_date}} and separated on {{separation_date}}. They wish to settle all issues from the marriage including property, support, custody, and all other matters.',
ARRAY['marriage_date', 'separation_date', 'marriage_location'],
true, 'Background facts and consideration clause'),

-- Property Division
('CA', 'property_division', 'Division of Community Property', 3,
'The Parties agree to divide their community property as follows:

{{property_division_table}}

Each Party shall execute any and all documents necessary to effectuate the transfers described herein within thirty (30) days of the execution of this Agreement. All community property not specifically addressed in this Agreement shall be deemed divided equally between the Parties.

{{#if equalization_payment}}
To equalize the division of community property, {{equalization_payor}} shall pay to {{equalization_payee}} the sum of {{equalization_amount}} within {{equalization_deadline}} days of the execution of this Agreement.
{{/if}}',
'The parties agree to divide community property as listed. {{equalization_payment_text}}',
ARRAY['property_division_table'],
true, 'Community property division with equalization'),

-- Separate Property
('CA', 'separate_property', 'Confirmation of Separate Property', 4,
'Each Party confirms and agrees that the following property constitutes the separate property of the respective Party, and each Party waives any and all claims to the other Party''s separate property:

Petitioner''s Separate Property:
{{petitioner_separate_property}}

Respondent''s Separate Property:
{{respondent_separate_property}}',
'Each party confirms the other''s separate property. Petitioner: {{petitioner_separate_property}}. Respondent: {{respondent_separate_property}}.',
ARRAY['petitioner_separate_property', 'respondent_separate_property'],
false, 'Confirmation of each party''s separate property'),

-- Debt Division
('CA', 'debt_division', 'Division of Community Debts', 5,
'The Parties agree to divide their community debts as follows:

{{debt_division_table}}

Each Party shall hold the other harmless and indemnify the other from any claims arising from the debts allocated to them. Any community debt not specifically addressed in this Agreement shall be deemed the joint responsibility of both Parties.',
'The parties agree to divide community debts as listed. Each party indemnifies the other for debts allocated to them.',
ARRAY['debt_division_table'],
true, 'Community debt allocation with indemnification'),

-- Spousal Support
('CA', 'spousal_support', 'Spousal Support', 6,
'{{#if support_type_none}}
Each Party hereby permanently waives any and all rights to spousal support from the other, both now and in the future. The Court shall not retain jurisdiction over the issue of spousal support.
{{else}}
{{support_payor}} shall pay to {{support_payee}} spousal support in the amount of {{support_monthly_amount}} per month, commencing {{support_start_date}}.

{{#if support_duration}}
Spousal support shall continue for a period of {{support_duration_months}} months, terminating on {{support_end_date}}, unless earlier terminated by operation of law or the occurrence of a terminating event.
{{else}}
Spousal support shall continue until further order of the Court, death of either Party, or remarriage of the supported Party.
{{/if}}

{{#if support_step_down}}
The spousal support shall be subject to the following step-down schedule:
{{support_step_down_schedule}}
{{/if}}

Spousal support shall terminate upon the occurrence of any of the following events:
{{termination_events}}

{{#if support_modifiable}}
The Court shall retain jurisdiction over the issue of spousal support pursuant to Family Code Section 4336.
{{else}}
The Parties agree that this spousal support provision is non-modifiable as to amount and duration pursuant to Family Code Section 4336(b).
{{/if}}
{{/if}}',
'{{spousal_support_plain_text}}',
ARRAY['support_type_none'],
true, 'Spousal support terms including Gavron warning'),

-- Child Custody (conditional on having children)
('CA', 'child_custody', 'Child Custody and Visitation', 7,
'The Parties are the parents of the following minor child(ren): {{children_names_ages}}.

Legal Custody:
{{legal_custody_description}}

Physical Custody:
{{physical_custody_description}}

Parenting Schedule:
{{parenting_schedule_description}}

Holiday Schedule:
{{holiday_schedule_description}}

Decision-Making:
Education decisions: {{decision_education}}
Medical decisions: {{decision_medical}}
Religious decisions: {{decision_religious}}
Extracurricular activities: {{decision_extracurricular}}

{{#if relocation_provisions}}
Relocation:
{{relocation_provisions}}
{{/if}}

The Parties shall communicate in a respectful manner regarding all issues related to the children and shall encourage the children''s relationship with both parents.',
'{{child_custody_plain_text}}',
ARRAY['children_names_ages', 'legal_custody_description', 'physical_custody_description', 'parenting_schedule_description'],
false, 'Custody, visitation, and decision-making'),

-- Child Support (conditional)
('CA', 'child_support', 'Child Support', 8,
'{{support_payor_child}} shall pay to {{support_payee_child}} child support in the amount of {{child_support_amount}} per month for the support of the minor child(ren).

{{#if child_support_deviation}}
The Parties acknowledge that the guideline child support amount is {{guideline_amount}} per month. The Parties agree to {{deviation_direction}} deviation from guideline in the amount of {{deviation_amount}} because: {{deviation_reason}}.
{{/if}}

Health Insurance:
{{health_insurance_provisions}}

Unreimbursed Medical Expenses:
{{medical_expense_provisions}}

Childcare Expenses:
{{childcare_provisions}}

{{#if extracurricular_provisions}}
Extracurricular Activities:
{{extracurricular_provisions}}
{{/if}}

{{#if college_provisions}}
Post-Secondary Education:
{{college_provisions}}
{{/if}}

Child support shall continue for each child until the child reaches age 18 (or 19 if still a full-time high school student), marries, dies, becomes emancipated, or further order of the Court.',
'{{child_support_plain_text}}',
ARRAY['support_payor_child', 'support_payee_child', 'child_support_amount'],
false, 'Child support amount, health insurance, add-on expenses'),

-- Tax Provisions
('CA', 'tax_provisions', 'Tax Provisions', 9,
'For the tax year {{current_tax_year}} and any prior tax years not yet filed, the Parties agree to {{tax_filing_status}}.

{{#if tax_exemption_allocation}}
Tax Exemptions/Credits:
{{tax_exemption_allocation}}
{{/if}}

Each Party shall be solely responsible for any tax liability arising from their own income after the date of separation. The Parties shall cooperate in the filing of any joint returns and shall share equally in any refunds or liabilities from joint returns.',
'{{tax_provisions_plain_text}}',
ARRAY['current_tax_year', 'tax_filing_status'],
false, 'Tax filing status and exemption allocation'),

-- Insurance
('CA', 'insurance', 'Insurance Provisions', 10,
'{{insurance_provisions}}

Life Insurance:
{{#if life_insurance_required}}
{{life_insurance_payor}} shall maintain a life insurance policy with a death benefit of not less than {{life_insurance_amount}}, naming {{life_insurance_beneficiary}} as the primary beneficiary, for so long as {{life_insurance_payor}} has an obligation to pay support under this Agreement.
{{else}}
Neither Party is required to maintain life insurance for the benefit of the other under this Agreement.
{{/if}}',
'{{insurance_plain_text}}',
ARRAY['insurance_provisions'],
false, 'Health and life insurance provisions'),

-- Attorney Fees
('CA', 'attorney_fees', 'Attorney Fees and Costs', 11,
'{{#if attorney_fees_each_own}}
Each Party shall bear their own attorney fees and costs incurred in connection with this dissolution proceeding.
{{else}}
{{attorney_fees_payor}} shall pay {{attorney_fees_amount}} toward {{attorney_fees_payee}}''s attorney fees and costs within {{attorney_fees_deadline}} days of the execution of this Agreement.
{{/if}}',
'{{attorney_fees_plain_text}}',
ARRAY['attorney_fees_each_own'],
false, 'Attorney fees allocation'),

-- General Provisions
('CA', 'general_provisions', 'General Provisions', 12,
'Entire Agreement: This Agreement constitutes the entire agreement between the Parties and supersedes all prior negotiations, representations, or agreements.

Modification: This Agreement may not be modified except by a written instrument signed by both Parties.

Severability: If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.

Governing Law: This Agreement shall be governed by and construed in accordance with the laws of the State of California.

Incorporation: The Parties request that this Agreement be incorporated into and made a part of the Judgment of Dissolution.

Voluntary Execution: Each Party acknowledges that they have read this Agreement, understand its terms, and execute it voluntarily and without coercion.

{{#if independent_counsel}}
Independent Counsel: Each Party acknowledges that they have been advised to seek, and have had the opportunity to obtain, independent legal counsel regarding this Agreement.
{{/if}}',
'Standard general provisions including entire agreement, modification, severability, governing law, incorporation into judgment, and voluntary execution.',
ARRAY[]::TEXT[],
true, 'Standard boilerplate provisions'),

-- Signature Block
('CA', 'signatures', 'Signatures', 13,
'IN WITNESS WHEREOF, the Parties have executed this Agreement on the dates set forth below.


Date: ____________________          ________________________________________
                                    {{petitioner_name}}, Petitioner


Date: ____________________          ________________________________________
                                    {{respondent_name}}, Respondent


APPROVED AS TO FORM:

Date: ____________________          ________________________________________
                                    Attorney for Petitioner


Date: ____________________          ________________________________________
                                    Attorney for Respondent',
'Signature block for Petitioner, Respondent, and their attorneys.',
ARRAY['petitioner_name', 'respondent_name'],
true, 'Execution signature block');

-- Texas basic template sections (abbreviated - key differences from CA)
INSERT INTO settlement_template_sections (state_code, section_key, section_title, section_order, content_template, required_variables, is_required, description) VALUES

('TX', 'preamble', 'Preamble', 1,
'This Agreed Final Decree of Divorce and Property Settlement Agreement ("Agreement") is entered into by and between {{petitioner_name}} ("Petitioner") and {{respondent_name}} ("Respondent") in connection with Cause No. {{case_number}}, styled In the Matter of the Marriage of {{petitioner_name}} and {{respondent_name}}, in the District Court of {{county}} County, Texas.',
ARRAY['petitioner_name', 'respondent_name', 'case_number', 'county'],
true, 'Texas-style preamble with Cause No.'),

('TX', 'recitals', 'Recitals', 2,
'WHEREAS, the Parties were lawfully married and the marriage has become insupportable because of discord or conflict of personalities; and

WHEREAS, the Parties desire to settle all issues regarding the division of property, conservatorship of any children, and all other matters;

NOW, THEREFORE, the Parties agree as follows:',
ARRAY[]::TEXT[],
true, 'Texas recitals using insupportability language'),

('TX', 'property_division', 'Division of Community Estate', 3,
'The Court finds that the following division of the community estate is just and right, having due regard for the rights of each Party and any children of the marriage.

{{property_division_table}}

{{#if equalization_payment}}
As an equalizing payment, {{equalization_payor}} shall pay {{equalization_payee}} the sum of {{equalization_amount}}.
{{/if}}

IT IS ORDERED that all community property not specifically divided herein shall be divided equally.',
ARRAY['property_division_table'],
true, 'Texas community estate division - just and right standard'),

('TX', 'signatures', 'Signatures', 13,
'APPROVED AND CONSENTED TO:


Date: ____________________          ________________________________________
                                    {{petitioner_name}}, Petitioner


Date: ____________________          ________________________________________
                                    {{respondent_name}}, Respondent


APPROVED AS TO FORM AND SUBSTANCE:

________________________________________
Attorney for Petitioner

________________________________________
Attorney for Respondent


SIGNED on ____________________

________________________________________
JUDGE PRESIDING',
ARRAY['petitioner_name', 'respondent_name'],
true, 'Texas signature block with judge signature');
