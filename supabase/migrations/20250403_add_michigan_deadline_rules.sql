-- Add Michigan deadline rules including mediation
-- MCR = Michigan Court Rules

-- Petition filed deadlines
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'petition_filed', 'response_due', 21, TRUE,
   'Response/answer due 21 business days after service (MCR 2.108)'),
  (gen_random_uuid(), 'MI', 'petition_filed', 'waiting_period_end', 60, FALSE,
   'Michigan 60-day waiting period without minor children (MCL 552.9f)'),
  (gen_random_uuid(), 'MI', 'petition_filed', 'financial_affidavit_due', 28, FALSE,
   'Verified financial statement due within 28 days of filing (MCR 3.206)')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Response filed deadlines
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'response_filed', 'discovery_due', 28, TRUE,
   'Discovery requests may be served, responses due in 28 business days (MCR 2.309)')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Discovery served deadlines
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'discovery_served', 'discovery_response_due', 28, TRUE,
   'Discovery response due 28 business days after service (MCR 2.309)')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Mediation ordered deadlines (THE KEY ADDITION)
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'mediation_ordered', 'mediation_complete', 56, FALSE,
   'Mediation must be completed within 56 days of order (MCR 2.411)'),
  (gen_random_uuid(), 'MI', 'mediation_ordered', 'response_due', 14, FALSE,
   'Mediation brief/position statement due 14 days before mediation date')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Trial date set deadlines
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'trial_date_set', 'trial_brief_due', -14, FALSE,
   'Trial brief due 14 days before trial (local court rule)'),
  (gen_random_uuid(), 'MI', 'trial_date_set', 'discovery_due', -28, FALSE,
   'Discovery cut-off 28 days before trial (MCR 2.301)')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;

-- Separation date deadlines
INSERT INTO state_deadlines (id, state_code, event_type, next_event_type, deadline_days, is_working_days, description)
VALUES
  (gen_random_uuid(), 'MI', 'separation_date', 'grounds_established', 0, FALSE,
   'Michigan recognizes no-fault: breakdown of marriage relationship (MCL 552.6)')
ON CONFLICT (state_code, event_type, next_event_type) DO NOTHING;
