import { faker } from '@faker-js/faker';
import { Sync, each } from 'factory.ts';

// User Factory
export const userFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  email: each(() => faker.internet.email()),
  full_name: each(() => faker.person.fullName()),
  avatar_url: each(() => faker.image.avatar()),
  created_at: each(() => faker.date.past().toISOString()),
  last_login_at: each(() => faker.date.recent().toISOString()),
});

// Firm Factory
export const firmFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  name: each(() => faker.company.name() + ' Law'),
  slug: each(() =>
    faker.helpers.slugify(faker.company.name()).toLowerCase()
  ),
  created_at: each(() => faker.date.past().toISOString()),
});

// Client Factory
export const clientFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  firm_id: each(() => faker.string.uuid()),
  first_name: each(() => faker.person.firstName()),
  last_name: each(() => faker.person.lastName()),
  email: each(() => faker.internet.email()),
  phone: each(() => faker.phone.number()),
  address_line1: each(() => faker.location.streetAddress()),
  city: each(() => faker.location.city()),
  state: each(() => faker.location.state({ abbreviated: true })),
  zip_code: each(() => faker.location.zipCode()),
  created_at: each(() => faker.date.past().toISOString()),
});

// Case Factory
export const caseFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  firm_id: each(() => faker.string.uuid()),
  case_number: each(
    () =>
      `CASE-${faker.date.recent().getFullYear()}-${faker.number.int({ min: 1000, max: 9999 })}`
  ),
  client_name: each(() => faker.person.fullName()),
  client_id: each(() => faker.string.uuid()),
  attorney_id: each(() => faker.string.uuid()),
  opposing_party_name: each(() => faker.person.fullName()),
  case_type: each(() =>
    faker.helpers.arrayElement(['divorce', 'custody', 'support', 'property'])
  ),
  status: each(() =>
    faker.helpers.arrayElement(['active', 'pending', 'closed'])
  ),
  current_phase: each(() =>
    faker.helpers.arrayElement([
      'intake',
      'filing',
      'discovery',
      'negotiation',
      'trial',
    ])
  ),
  filing_date: each(() => faker.date.past().toISOString()),
  created_at: each(() => faker.date.past().toISOString()),
  updated_at: each(() => faker.date.recent().toISOString()),
});

// Generated Document Factory
export const documentFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  document_title: each(
    () => `${faker.word.noun()}_${faker.word.adjective()}.pdf`
  ),
  document_type: each(() =>
    faker.helpers.arrayElement([
      'petition',
      'response',
      'motion',
      'declaration',
      'stipulation',
    ])
  ),
  status: each(() =>
    faker.helpers.arrayElement(['draft', 'in_review', 'approved', 'filed'])
  ),
  created_by: each(() => faker.string.uuid()),
  created_at: each(() => faker.date.past().toISOString()),
});

// Invoice Factory (matches actual schema: issue_date, not invoice_date)
export const invoiceFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  invoice_number: each(
    () => `INV-${faker.number.int({ min: 1000, max: 9999 })}`
  ),
  issue_date: each(() =>
    faker.date.recent().toISOString().split('T')[0]
  ),
  due_date: each(() =>
    faker.date.future().toISOString().split('T')[0]
  ),
  status: each(() =>
    faker.helpers.arrayElement([
      'draft',
      'sent',
      'paid',
      'partially_paid',
      'overdue',
      'void',
    ])
  ),
  total_amount: each(() =>
    parseFloat(faker.commerce.price({ min: 500, max: 10000 }))
  ),
  amount_paid: each(() =>
    parseFloat(faker.commerce.price({ min: 0, max: 500 }))
  ),
  balance_due: each(() =>
    parseFloat(faker.commerce.price({ min: 0, max: 9500 }))
  ),
  created_by: each(() => faker.string.uuid()),
  created_at: each(() => faker.date.past().toISOString()),
});

// Client Task Factory (matches actual client_tasks schema)
export const clientTaskFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  client_id: each(() => faker.string.uuid()),
  task_type: each(() =>
    faker.helpers.arrayElement([
      'upload_document',
      'review_form',
      'complete_questionnaire',
      'attend_appointment',
      'make_payment',
      'signature',
      'other',
    ])
  ),
  title: each(() => faker.lorem.sentence({ min: 3, max: 8 })),
  description: each(() => faker.lorem.paragraph()),
  instructions: each(() => faker.lorem.sentence()),
  status: each(() =>
    faker.helpers.arrayElement([
      'pending',
      'in_progress',
      'submitted',
      'approved',
      'rejected',
      'cancelled',
    ])
  ),
  priority: each(() =>
    faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'])
  ),
  due_date: each(() =>
    faker.date.future().toISOString().split('T')[0]
  ),
  estimated_minutes: each(() =>
    faker.number.int({ min: 10, max: 120 })
  ),
  created_at: each(() => faker.date.past().toISOString()),
});

// Delegated Task Factory (matches actual delegated_tasks schema)
export const delegatedTaskFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  firm_id: each(() => faker.string.uuid()),
  title: each(() => faker.lorem.sentence({ min: 3, max: 8 })),
  description: each(() => faker.lorem.paragraph()),
  assigned_to: each(() => faker.string.uuid()),
  assigned_by: each(() => faker.string.uuid()),
  status: each(() =>
    faker.helpers.arrayElement([
      'pending',
      'in_progress',
      'completed',
      'approved',
      'rejected',
    ])
  ),
  priority: each(() =>
    faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent'])
  ),
  due_date: each(() =>
    faker.date.future().toISOString().split('T')[0]
  ),
  created_at: each(() => faker.date.past().toISOString()),
});

// Time Entry Factory (matches actual schema: attorney_id, not user_id)
export const timeEntryFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  attorney_id: each(() => faker.string.uuid()),
  description: each(() => faker.lorem.sentence()),
  duration_minutes: each(() =>
    faker.number.int({ min: 6, max: 480 })
  ),
  hourly_rate: each(() => faker.number.int({ min: 150, max: 500 })),
  amount: each(() =>
    parseFloat(faker.commerce.price({ min: 50, max: 2000 }))
  ),
  billable: each(() => faker.datatype.boolean()),
  activity_type: each(() =>
    faker.helpers.arrayElement([
      'client_communication',
      'document_review',
      'document_drafting',
      'court_appearance',
      'research',
      'administrative',
    ])
  ),
  entry_date: each(() =>
    faker.date.recent().toISOString().split('T')[0]
  ),
  billed_at: null as string | null,
  created_by: each(() => faker.string.uuid()),
  created_at: each(() => faker.date.past().toISOString()),
});

// Client Notification Factory (matches actual schema: user_id, read_at)
export const notificationFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  user_id: each(() => faker.string.uuid()),
  client_id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  type: each(() =>
    faker.helpers.arrayElement([
      'task_assigned',
      'message_received',
      'document_request',
      'payment_due',
      'appointment_reminder',
      'milestone_reached',
    ])
  ),
  category: each(() =>
    faker.helpers.arrayElement([
      'message',
      'document',
      'task',
      'appointment',
      'payment',
      'case_update',
      'deadline',
      'system',
    ])
  ),
  title: each(() => faker.lorem.sentence({ min: 3, max: 6 })),
  message: each(() => faker.lorem.sentence()),
  priority: each(() =>
    faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent'])
  ),
  read_at: null as string | null,
  created_at: each(() => faker.date.recent().toISOString()),
});

// Filing Deadline Factory
export const filingDeadlineFactory = Sync.makeFactory({
  id: each(() => faker.string.uuid()),
  case_id: each(() => faker.string.uuid()),
  deadline_name: each(() => faker.lorem.sentence({ min: 3, max: 6 })),
  deadline_date: each(() => faker.date.future().toISOString()),
  deadline_type: each(() =>
    faker.helpers.arrayElement([
      'filing',
      'response',
      'hearing',
      'service',
      'court_order',
    ])
  ),
  priority: each(() =>
    faker.helpers.arrayElement(['low', 'normal', 'high', 'critical'])
  ),
  status: each(() =>
    faker.helpers.arrayElement([
      'upcoming',
      'completed',
      'overdue',
      'waived',
      'extended',
    ])
  ),
  assigned_to: each(() => faker.string.uuid()),
  created_at: each(() => faker.date.past().toISOString()),
});
