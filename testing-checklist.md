# Unbind Platform - Testing Checklist

Generated: 2026-02-13
Status: Manual testing sweep for Sessions 1-14

---

## 1. Authentication

### Login
- [ ] Navigate to `/login` — page loads without console errors
  - Expected: Login form with email/password fields and submit button
  - Verify: No white screen, no JS errors in console
- [ ] Enter valid attorney credentials and submit
  - Expected: Redirect to `/dashboard`
  - Verify: Sidebar shows attorney nav items, profile name in bottom
- [ ] Enter invalid credentials
  - Expected: Error message displayed, no redirect
  - Verify: Error text visible, form stays on page
- [ ] Enter valid client credentials and submit
  - Expected: Redirect to `/client`
  - Verify: Sidebar shows client nav items (My Case, Tasks, Documents, Messages)

### Logout
- [ ] Click logout button in sidebar
  - Expected: Redirect to `/login`, session cleared
  - Verify: Navigating to `/dashboard` redirects back to login

### Registration
- [ ] Navigate to `/register` — page loads
  - Expected: Registration form with name, email, password fields
  - Verify: Form renders correctly

### Password Reset
- [ ] Navigate to `/reset-password` — page loads
  - Expected: Email input with reset button
  - Verify: Form renders, submitting shows confirmation message

---

## 2. Attorney Dashboard

- [ ] Navigate to `/dashboard` as attorney
  - Expected: Dashboard loads with case overview, recent activity, stats
  - Verify: No loading spinner stuck, data populates
- [ ] Verify case count matches actual cases
  - Expected: Active case count is accurate
  - Verify: Compare with `/dashboard/cases` list count
- [ ] Verify recent activity section populates
  - Expected: Shows recent case events, messages, or documents
  - Verify: Items have dates, descriptions, links
- [ ] Check document analytics section
  - Expected: Document stats render (if documents exist)
  - Verify: Charts/graphs display correctly

---

## 3. Case Management

### View Cases
- [ ] Navigate to `/dashboard/cases`
  - Expected: Case list loads with client names, case numbers, status
  - Verify: Cases are listed, search/filter controls visible

### Create Case
- [ ] Look for "New Case" or case creation method
  - Expected: Form to create a new case with client info
  - Verify: Required fields are validated

### View Single Case
- [ ] Click on a case from the list
  - Expected: Case detail page loads at `/dashboard/cases/[id]`
  - Verify: Case info, documents tab, messages tab, timeline visible
- [ ] Check all tabs on case detail page
  - Expected: Each tab loads its content without errors
  - Verify: Documents, Messages, Timeline, Financial tabs all work

### Case Assignment (Firm Feature)
- [ ] If firm member: open case assignment modal
  - Expected: Can assign lead, supporting, paralegal roles
  - Verify: Dropdown shows firm members, save persists

---

## 4. Document Management

### View Documents
- [ ] Navigate to `/dashboard/documents`
  - Expected: Document list with search, filters, tags
  - Verify: Documents display with type icons, names, dates

### Upload Document
- [ ] Click upload button, select a PDF
  - Expected: File uploads, appears in document list
  - Verify: File name, size, upload date correct
- [ ] Upload a non-PDF file (JPG, DOCX)
  - Expected: Upload succeeds or shows supported format message
  - Verify: File appears in list with correct type

### Document Preview
- [ ] Click a document to preview
  - Expected: Preview modal opens with document content
  - Verify: PDF renders, metadata shows (name, type, dates)

### Document Tags
- [ ] Add tags to a document
  - Expected: Tags save and display on document card
  - Verify: Tags persist after page refresh

### Document Categories
- [ ] Filter documents by category
  - Expected: List filters to show only matching documents
  - Verify: Count updates, correct documents shown

---

## 5. Messaging

### View Messages
- [ ] Navigate to `/dashboard/messages`
  - Expected: Message inbox loads with conversations
  - Verify: Messages listed with sender, preview, timestamp

### Send Message
- [ ] Open a conversation, type a message, click send
  - Expected: Message appears in conversation thread
  - Verify: Message shows with correct timestamp and sender

### Receive Message
- [ ] Have another user (client) send a message
  - Expected: Message appears without page refresh (or on refresh)
  - Verify: Unread badge updates in sidebar

### Attachments
- [ ] Send a message with a file attachment
  - Expected: Attachment uploads and displays in message
  - Verify: Attachment link/preview works

---

## 6. Calendar & Deadlines

### View Calendar
- [ ] Navigate to `/dashboard/calendar`
  - Expected: Calendar view loads with events
  - Verify: Month/week view renders, events display on dates

### Create Event
- [ ] Create a new calendar event
  - Expected: Event form with title, date, time, case association
  - Verify: Event saves and appears on calendar

### Event Reminders
- [ ] Set a reminder on an event
  - Expected: Reminder saves with specified timing
  - Verify: Reminder appears in notification preferences

### Deadline Calculation
- [ ] Check if state-specific deadlines calculate correctly
  - Expected: Deadlines auto-populate based on case state
  - Verify: Dates align with state filing requirements

---

## 7. Financial Tracking

### Assets
- [ ] Navigate to case financial section, add an asset
  - Expected: Asset form with description, value, type
  - Verify: Asset saves, appears in list, totals update

### Debts
- [ ] Add a debt to the case
  - Expected: Debt form with creditor, amount, type
  - Verify: Debt saves, net worth calculation updates

### Division Scenarios
- [ ] Create a property division scenario
  - Expected: Scenario shows assets/debts split
  - Verify: 50/50 split calculates correctly, totals balance

### Income Tracking
- [ ] Add income entry for a party
  - Expected: Income records for both parties
  - Verify: Support calculations use these values

---

## 8. Client Intake

### Submit Intake (as client)
- [ ] Navigate to `/intake` as a new/unlinked user
  - Expected: Multi-step intake questionnaire loads
  - Verify: Steps progress, validation works on required fields

### Upload Intake Documents
- [ ] Upload documents during intake (marriage cert, etc.)
  - Expected: Documents upload and associate with intake
  - Verify: Files appear in intake document list

### Review Intake (as attorney)
- [ ] Navigate to `/attorney/intakes`
  - Expected: List of submitted intakes with status
  - Verify: Can click to review, see client answers and documents
- [ ] Approve an intake
  - Expected: Intake converts to case, client gets linked
  - Verify: New case appears in cases list

---

## 9. Document Generation

### Template Library
- [ ] Navigate to `/dashboard/templates` (firm member)
  - Expected: Template library loads with categories
  - Verify: Templates listed with type, state, usage count

### Upload Template
- [ ] Click "Upload Template", fill form, submit
  - Expected: Template saves and appears in library
  - Verify: Template shows with correct type and tags

### Generate Document (from case)
- [ ] Open a case, use document generation feature
  - Expected: Template picker appears, merge fields populate
  - Verify: Generated document has case-specific data filled in

---

## 10. Billing & Time Tracking

### Time Entry
- [ ] Navigate to case billing, add a time entry
  - Expected: Form with date, duration, activity type, description
  - Verify: Entry saves, amount calculated (rate x hours)

### Timer
- [ ] Start a billing timer
  - Expected: Timer runs, tracks elapsed time
  - Verify: Timer can be stopped, creates time entry

### Create Invoice
- [ ] Generate an invoice from time entries
  - Expected: Invoice created with line items, totals, due date
  - Verify: Invoice number generated, amounts correct

### Payments
- [ ] Record a payment against an invoice
  - Expected: Payment records, balance due updates
  - Verify: Invoice status changes (partially_paid or paid)

### Payment Plans
- [ ] Create a payment plan for a case
  - Expected: Plan with installment amounts and dates
  - Verify: Plan saves, installments scheduled

---

## 11. State-Specific Features

### Residency Check
- [ ] Run residency verification for a case
  - Expected: State-specific residency requirements shown
  - Verify: Check passes/fails based on data

### State Law Engine
- [ ] View state-specific procedures
  - Expected: Filing requirements, forms, timelines for state
  - Verify: Data matches the case's state

### Support Calculators
- [ ] Run child/spousal support calculator
  - Expected: Calculator uses state-specific formulas
  - Verify: Amounts are reasonable for the income inputs

---

## 12. Client Portal

### Client Dashboard
- [ ] Login as client, check `/client`
  - Expected: Dashboard with case status, upcoming tasks, recent messages
  - Verify: Progress tracker shows current case stage

### Client Tasks
- [ ] Navigate to `/client/tasks`
  - Expected: List of tasks assigned to client
  - Verify: Can mark tasks as complete

### Client Documents
- [ ] Navigate to `/client/documents`
  - Expected: Documents shared with client are visible
  - Verify: Client can upload documents

### Client Messages
- [ ] Navigate to `/client/messages`
  - Expected: Messaging with attorney works
  - Verify: Can send and receive messages

---

## 13. Firm Management

### Create Firm
- [ ] Navigate to `/firm/setup` as attorney without a firm
  - Expected: 4-step wizard (Details, Plan, Invite, Complete)
  - Verify: Step 1 requires firm name, progress bar works
- [ ] Complete firm setup wizard
  - Expected: Firm created, user set as owner
  - Verify: Sidebar shows firm name, Team nav item appears

### Team Management
- [ ] Navigate to `/dashboard/team`
  - Expected: Member roster with roles, status
  - Verify: Current user shown as owner

### Invite Member
- [ ] Click "Invite Member", enter email and role
  - Expected: Invitation record created
  - Verify: Invited member appears in roster with "invited" status

### Edit Member
- [ ] Click edit on a team member, change role
  - Expected: Role updates, permissions change
  - Verify: Updated role reflects in roster

### Case Assignment
- [ ] Assign team members to a case
  - Expected: Modal shows firm members, can set lead/supporting roles
  - Verify: Assignments persist, visible on case detail

### Firm Dashboard
- [ ] Navigate to `/dashboard/firm`
  - Expected: Executive dashboard with metrics, charts, pipeline
  - Verify: Revenue chart renders, metric cards show data

### Workload
- [ ] Navigate to `/dashboard/workload`
  - Expected: Attorney workload comparison, capacity warnings
  - Verify: Capacity percentages, recommendations render

### Financial Reports
- [ ] Navigate to `/dashboard/reports/financial`
  - Expected: 4-tab report (Revenue, A/R, Profitability, Collections)
  - Verify: Each tab loads, data populates

### Attorney Performance
- [ ] Navigate to `/dashboard/reports/performance`
  - Expected: Performance table with hours, revenue, utilization
  - Verify: Attorney filter and date range work

### Templates Library
- [ ] Navigate to `/dashboard/templates`
  - Expected: Firm templates with search and category filters
  - Verify: Upload dialog works, templates appear after creation

### My Tasks (Paralegal)
- [ ] Navigate to `/dashboard/my-tasks`
  - Expected: Tasks assigned to current user with stats
  - Verify: Can update task status (start, complete)

### Subscription
- [ ] Navigate to `/dashboard/settings/subscription`
  - Expected: Current plan info, seat usage, plan comparison
  - Verify: Active seats listed, plan details correct

---

## 14. Mobile Responsiveness (test at 375px width)

Use browser DevTools, set viewport to 375px width (iPhone SE).

- [ ] Login page renders without horizontal scroll
  - Expected: Form stacks vertically, buttons full-width
- [ ] Dashboard renders with mobile menu
  - Expected: Hamburger menu replaces sidebar, content stacks
- [ ] Case list is readable and scrollable
  - Expected: Cards stack, text doesn't overflow
- [ ] Messaging works on mobile
  - Expected: Conversation list and thread are usable
- [ ] Calendar renders on small screen
  - Expected: Calendar or list view adapts to width
- [ ] Document list/upload works on mobile
  - Expected: Can browse and upload documents
- [ ] Client portal pages work on mobile
  - Expected: All client pages usable at 375px
- [ ] Firm dashboard charts don't overflow
  - Expected: Charts resize responsively
- [ ] Modals/dialogs fit on mobile screen
  - Expected: Dialog content scrollable, buttons accessible
- [ ] Forms don't overflow on mobile
  - Expected: All form fields visible and usable

---

## 15. Security & Permissions

### RLS Policies
- [ ] As attorney, try accessing another attorney's case via URL
  - Expected: 401/403 error or empty data returned
  - Verify: No case data leaks across attorneys
- [ ] As client, try accessing `/dashboard` routes
  - Expected: Redirect to client portal or 403 error
  - Verify: Attorney-only pages not accessible to clients
- [ ] As client, try API calls for other cases (use DevTools)
  - Expected: API returns 401 or empty results
  - Verify: RLS blocks cross-case data access

### Cross-Firm Security
- [ ] As firm member, try accessing another firm's data
  - Expected: No data returned from other firm
  - Verify: Firm-scoped queries only return own firm data

### Input Validation
- [ ] Submit empty required fields on forms
  - Expected: Validation errors shown, form not submitted
  - Verify: Error messages are clear and specific
- [ ] Enter extremely long text in fields
  - Expected: Handled gracefully (truncated or error)
  - Verify: No page crash or layout break
- [ ] Enter special characters (<script>, SQL injection attempts)
  - Expected: Input sanitized, no XSS or injection
  - Verify: Characters render as text, no code execution

### Authentication
- [ ] Access API routes without auth cookie
  - Expected: 401 Unauthorized response
  - Verify: No data leaked in error response
- [ ] Access protected pages when logged out
  - Expected: Redirect to login page
  - Verify: No flash of protected content

---

## Known Issues (from automated audit)

### TypeScript
- [x] ~~`COMMON_DRAFTING_PROMPTS` exported from route file~~ — FIXED (removed export)

### Hardcoded Credentials (low-risk, anon key is public)
- [x] ~~`lib/supabase/client.ts`~~ — FIXED (now uses env vars)
- [x] ~~`app/api/test/route.ts`~~ — FIXED (now uses env vars + try/catch)
- [ ] 17 other files with inline Supabase client creation (Sidebar, dashboard pages, etc.)
  - Risk: Low (anon key is designed to be public)
  - Recommendation: Refactor to shared client in future session

### N+1 Queries
- [x] ~~`app/api/firms/analytics/route.ts`~~ — FIXED (fetch case IDs once, single invoice query)
- [x] ~~`app/api/payment-reminders/process/route.ts`~~ — FIXED (batch-fetch cases + attorneys before loop)
- [x] ~~`app/api/payment-plans/process/route.ts`~~ — FIXED (added try/catch + cron auth; N+1 writes are Stripe-dependent, can't batch)
- [x] ~~`app/api/firms/analytics/performance/route.ts`~~ — FIXED (batch-fetch all cases + time entries in 2 queries)

### Missing Error Handling
- [x] ~~`app/api/states/[code]/route.ts`~~ — FIXED (wrapped entire handler in try/catch + added auth to LIST)
- [ ] `app/api/webhooks/stripe/route.ts` — signature verification outside try block (low risk, simple header reads)

### TODOs (deferred features)
- [ ] `components/billing/ExpenseForm.tsx:47` — Receipt file upload to Storage
- [ ] `lib/ai/document-classifier.ts` — GPT-4 Vision integration (3 TODOs)
- [ ] `app/api/cases/[caseId]/documents/generate/route.ts:456` — docxtemplater generation
- [ ] `app/api/intakes/[id]/submit/route.ts` — Notification sending (2 TODOs)
- [ ] `app/api/intakes/[id]/approve/route.ts:189` — Send notifications
- [ ] `app/api/intakes/[id]/request-info/route.ts:81` — Email notification
