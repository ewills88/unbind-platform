# Manual Testing Checklist — Sessions 15-24

> Generated from codebase audit on 2026-04-05
> Use this for manual QA testing before launch.

---

## SESSION 15: Integrations & Automation

### 15.1 Google Calendar Integration

**Navigation:** Dashboard → Settings → Integrations → Google Calendar

- [ ] Click "Connect Google Calendar"
  - Expected: Redirects to Google OAuth consent screen
  - Verify: OAuth scopes include calendar.events and calendar.readonly

- [ ] Complete Google OAuth flow
  - Expected: Redirected back to integrations page with "Connected" status
  - Verify: `calendar_connections` table has entry with encrypted tokens

- [ ] Select which calendar to sync
  - Expected: Dropdown lists all user's Google calendars
  - Verify: Selected calendar ID saved to connection record

- [ ] Create a case event in Unbind
  - Expected: Event appears in Google Calendar within sync cycle
  - Verify: Check Google Calendar directly; event has correct title, time, description

- [ ] Modify event in Google Calendar
  - Expected: Changes reflected in Unbind after next sync (every 15 min via cron)
  - Verify: Event title/time updated in Unbind events table

- [ ] Click "Disconnect" on Google Calendar
  - Expected: Connection removed, status shows "Disconnected"
  - Verify: Tokens removed from `calendar_connections` table

- [ ] Click "Sync Now" button
  - Expected: Manual sync triggers immediately with loading indicator
  - Verify: Last sync timestamp updates

### 15.2 Email Notifications (Resend)

**Navigation:** Triggered by system events (no direct UI)

- [ ] Create a new case (triggers case.created event)
  - Expected: Email sent to attorney via Resend API
  - Verify: Check Resend dashboard for delivery status

- [ ] Submit an intake questionnaire
  - Expected: Notification email sent to assigned attorney
  - Verify: Email contains intake summary and link to review

- [ ] Test quiet hours (set timezone, trigger notification outside hours)
  - Expected: Email queued, not sent immediately
  - Verify: Email delivered after quiet hours end

### 15.3 Webhook Configuration

**Navigation:** Dashboard → Admin → Integrations → Webhooks (or /api/webhooks)

- [ ] Create a new webhook via API (`POST /api/webhooks`)
  - Expected: Webhook created with HMAC secret generated
  - Verify: Record in `webhooks` table with signing secret

- [ ] Trigger a webhook event (e.g., create a case)
  - Expected: POST sent to webhook URL with signed payload
  - Verify: `webhook_deliveries` table shows delivery attempt with status

- [ ] Test webhook with invalid URL
  - Expected: Delivery fails, retry scheduled (up to 3 attempts)
  - Verify: `webhook_deliveries` shows retry_count incrementing

- [ ] Send test webhook (`POST /api/webhooks/[id]/test`)
  - Expected: Test payload delivered to configured URL
  - Verify: Response logged in deliveries table

- [ ] Verify sensitive data sanitization
  - Expected: SSN, passwords, tokens stripped from webhook payloads
  - Verify: Inspect delivered payload for redacted fields

### 15.4 Automation Rules Engine

**Navigation:** Triggered by system events (background workflows)

- [ ] Create a case with a deadline 7 days out
  - Expected: `deadline-7-days` workflow triggers email + team notification
  - Verify: Email sent and notification created

- [ ] Create an overdue invoice (7+ days past due)
  - Expected: `invoice-overdue-7-days` workflow triggers reminder
  - Verify: Check email delivery and notification records

- [ ] Record a payment against an invoice
  - Expected: `payment-received-thank-you` workflow sends confirmation
  - Verify: Thank-you email delivered to client

### 15.5 QuickBooks Export

**Navigation:** Dashboard → Reports → Export (or API endpoint)

- [ ] Export invoices as CSV
  - Expected: CSV file downloads with invoice data
  - Verify: Open in Excel, confirm columns match QuickBooks import format

- [ ] Export invoices as IIF (QuickBooks Desktop format)
  - Expected: IIF file downloads
  - Verify: File structure matches QuickBooks Desktop import spec

- [ ] Export invoices as QBO (QuickBooks Online format)
  - Expected: QBO file downloads
  - Verify: File can be imported into QuickBooks Online

- [ ] Export with date range filter
  - Expected: Only invoices within range included
  - Verify: Check first and last invoice dates in export

### 15.6 Missing Integrations

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: SendGrid email provider
  - Expected: Alternative email delivery provider
  - Verify: N/A — type defined but no implementation

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Twilio SMS notifications
  - Expected: SMS alerts for urgent deadlines
  - Verify: N/A — type defined but no implementation

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Microsoft 365/Outlook calendar sync
  - Expected: Calendar sync for Outlook users
  - Verify: N/A — type defined but no implementation

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: DocuSign e-signature integration
  - Expected: Send documents for signature via DocuSign
  - Verify: N/A — type defined but no implementation

---

## SESSION 16: Discovery Management

### 16.1 Discovery Request Creation

**Navigation:** Dashboard → Cases → [Case] → Discovery tab

- [ ] Click "New Discovery Request"
  - Expected: Modal/form opens with type selection
  - Verify: Types available: Form Interrogatories, Special Interrogatories, RFP, RFA, Subpoena, Deposition Notice

- [ ] Create a Form Interrogatories request (outgoing)
  - Expected: Request saved with status "draft"
  - Verify: Appears in outgoing discovery list with correct type

- [ ] Create an incoming RFP (Request for Production)
  - Expected: Request saved with served date and deadline calculated
  - Verify: Deadline matches state-specific rules

- [ ] Set discovery request status to "in_progress"
  - Expected: Status badge updates
  - Verify: Status change persisted in database

### 16.2 Discovery Deadline Calculation

**Navigation:** API endpoint `/api/discovery/calculate-deadline`

- [ ] Calculate deadline for California interrogatories (served by mail)
  - Expected: 30 days + 5 days mail extension = 35 calendar days
  - Verify: Weekend adjustment applied if landing on Sat/Sun

- [ ] Calculate deadline for electronic service
  - Expected: Base period + 2 days electronic extension
  - Verify: Correct state-specific rules applied

- [ ] Check urgency visualization
  - Expected: Color-coded badges (normal, warning, urgent, overdue)
  - Verify: "Warning" shows within 7 days, "Urgent" within 3 days, "Overdue" if past

### 16.3 Discovery Items & Responses

**Navigation:** Dashboard → Cases → [Case] → Discovery → [Request] → Items

- [ ] Add items to a discovery request
  - Expected: Items numbered sequentially
  - Verify: Item text, response field, and objection options visible

- [ ] Respond to an interrogatory item
  - Expected: Response text saved per item
  - Verify: Response persisted via `/api/discovery/items/[itemId]`

- [ ] File an objection on an item
  - Expected: Objection type selectable (overbroad, vague, attorney-client, etc.)
  - Verify: 8 objection types available

- [ ] Bulk update multiple items
  - Expected: Multiple items updated in one operation
  - Verify: `/api/discovery/items/bulk` processes all items

### 16.4 Discovery Document Generation

**Navigation:** Discovery request → Generate Response Document

- [ ] Generate discovery response as Word document
  - Expected: .docx file downloads with court caption, responses, verification
  - Verify: Document includes proper party info, case number, item-by-item responses

### 16.5 Discovery Extensions

**Navigation:** Discovery request → Request Extension

- [ ] Request a deadline extension
  - Expected: Extension request created with new proposed date
  - Verify: `/api/discovery/[id]/extension` processes request

- [ ] Grant an extension on incoming discovery
  - Expected: Deadline updated to new date
  - Verify: New deadline reflected in discovery list

### 16.6 Depositions

**Navigation:** Dashboard → Cases → [Case] → Depositions tab

- [ ] View depositions tab
  - Expected: `CaseDepositionsTab` component renders
  - Verify: UI shows deposition list (may be empty initially)

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Create a new deposition
  - Expected: Deposition created with deponent info, date, location
  - Verify: Component exists but **no API routes for deposition CRUD** — data may not persist

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Upload deposition transcript
  - Expected: Transcript attached to deposition record
  - Verify: No API route found — check if upload works

### 16.7 Privilege Log

**Navigation:** Dashboard → Cases → [Case] → Privilege Log tab

- [ ] View privilege log tab
  - Expected: `CasePrivilegeLogTab` component renders
  - Verify: UI shows privilege log entries

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Add privilege log entry
  - Expected: Entry created with privilege type, document info, Bates numbers
  - Verify: Component exists but **no API routes for privilege log CRUD**

---

## SESSION 17: Settlement Negotiation

### 17.1 Settlement Proposals

**Navigation:** Dashboard → Cases → [Case] → Settlement tab → Proposals

- [ ] Create a new settlement proposal
  - Expected: Proposal form opens with sections for property, support, custody
  - Verify: Proposal saved as "draft" status

- [ ] Add property division items to proposal
  - Expected: Assets and debts added with allocation (client/spouse/split)
  - Verify: Equalization payment auto-calculated

- [ ] Add spousal support terms
  - Expected: Support type (permanent, rehabilitative, bridge, lump sum) selectable
  - Verify: Amount, duration, and frequency saved

- [ ] Add child support terms
  - Expected: Guideline amount with deviation tracking
  - Verify: Deviation reason required if different from guideline

- [ ] Add custody arrangement
  - Expected: Legal and physical custody types selectable
  - Verify: Schedule type options available (equal, primary, custom)

- [ ] Send proposal (change status to "sent")
  - Expected: Status changes, counter-offer workflow enabled
  - Verify: Status badge updates in proposal list

- [ ] Create counter-offer from received proposal
  - Expected: New proposal version created with original as reference
  - Verify: Version number incremented

- [ ] Accept a proposal
  - Expected: Status changes to "accepted"
  - Verify: Both parties' proposals reflect final agreement

### 17.2 Proposal Comparison

**Navigation:** Settlement tab → Compare button (with 2+ proposals)

- [ ] Compare two proposals side-by-side
  - Expected: Property, support, custody terms displayed in columns
  - Verify: API `/api/cases/[caseId]/proposals/compare` returns comparison data

### 17.3 Settlement Document Generation

**Navigation:** Settlement tab → Documents tab → Generate

- [ ] Generate MSA (Marital Settlement Agreement)
  - Expected: Multi-step wizard: select template → choose sections → fill variables → generate
  - Verify: Document type options include MSA, stipulation, etc.

- [ ] Select document sections
  - Expected: Sections include preamble, recitals, property division, debt division, spousal support, child custody, child support, tax provisions, insurance, attorney fees, general provisions, signatures
  - Verify: At least 12 section types available

- [ ] Generate Word document from proposal
  - Expected: .docx file with all selected sections populated from proposal data
  - Verify: Template variables ({{client_name}}, etc.) replaced with actual values

- [ ] Conditional blocks render correctly
  - Expected: `{{#if hasChildren}}` blocks only appear when applicable
  - Verify: Document omits child sections for cases without children

### 17.4 Signature Workflow

**Navigation:** Settlement tab → Documents → [Document] → Signatures

- [ ] Request signatures on settlement document
  - Expected: Signature requests created for each signer
  - Verify: Signer roles include petitioner, respondent, attorneys, mediator, judge, notary, witness

- [ ] Track signature status
  - Expected: Status flow: pending → sent → viewed → signed (or declined/expired)
  - Verify: Status updates in real-time via `/api/settlement-documents/[id]/signatures`

- [ ] Add review comments on document
  - Expected: Comments added with type (comment, suggestion, approval, rejection, question)
  - Verify: Comment thread visible in document detail sidebar

- [ ] Submit document for review
  - Expected: Status changes to "in review"
  - Verify: Review workflow: submit → in review → approved/rejected

### 17.5 Scenario Modeler

**Navigation:** Settlement tab → Scenarios tab

- [ ] Create a new settlement scenario
  - Expected: Alternative allocation of property, support, custody
  - Verify: `ScenarioModeler` component renders with input fields

- [ ] Compare scenario outcomes
  - Expected: Side-by-side comparison of different scenarios
  - Verify: Pros/cons tracked per scenario

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Save scenario
  - Expected: Scenario persisted to database
  - Verify: **No API routes found for scenario CRUD** — may only work in-memory

### 17.6 Negotiation Timeline

**Navigation:** Settlement tab → Timeline tab

- [ ] View negotiation timeline
  - Expected: Chronological list of events (proposals sent, countered, accepted, etc.)
  - Verify: 19+ event types displayed with icons

- [ ] Check movement summary
  - Expected: Summary of key changes between rounds
  - Verify: Deadlines and milestones highlighted

### 17.7 Mediation Manager

**Navigation:** Settlement tab → Mediation tab

- [ ] View mediation sessions
  - Expected: `MediationManager` component renders (44KB implementation)
  - Verify: Session scheduling UI visible

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Create mediation session
  - Expected: Session created with date, location (in-person/video/hybrid), mediator info
  - Verify: **No API routes for mediation CRUD** — component exists but backend may be missing

- [ ] Track mediation positions
  - Expected: Position entries with priority (critical, high, medium, low, tradeable)
  - Verify: Position tracking interface loads

### 17.8 Settlement Analytics

**Navigation:** Settlement tab → Analytics tab

- [ ] View settlement analytics
  - Expected: Metrics for proposal count, average rounds, days in negotiation
  - Verify: Property distribution and support calculation summaries displayed

---

## SESSION 18: E-Filing Integration

### 18.1 E-Filing Credentials Setup

**Navigation:** Dashboard → Admin → Integrations (or `/api/efiling/credentials`)

- [ ] Add Tyler/Odyssey e-filing credentials
  - Expected: Username, password, and environment (production/staging/sandbox) saved
  - Verify: Credentials encrypted at rest in database

- [ ] Verify credentials (`POST /api/efiling/credentials/[id]/verify`)
  - Expected: System tests login against Tyler API
  - Verify: Status updated to "verified" or error returned

- [ ] Link payment account to credentials
  - Expected: Payment account associated for filing fees
  - Verify: Account appears in payment selection during filing

### 18.2 Court & Filing Code Lookup

**Navigation:** API endpoints (used during filing flow)

- [ ] Query court locations (`/api/efiling/codes?type=court`)
  - Expected: List of courts for selected state/county
  - Verify: Court codes match Tyler/Odyssey directory

- [ ] Query filing codes (`/api/efiling/codes?type=filing`)
  - Expected: Available filing types for selected court
  - Verify: Codes include petition, response, motion, etc.

- [ ] Query document types
  - Expected: Document types available for filing
  - Verify: Types match court requirements

### 18.3 E-Filing Submission

**Navigation:** Filing flow (from case documents or filing queue)

- [ ] Submit a filing to court (`POST /api/efiling/submit`)
  - Expected: Envelope created in Tyler system with documents, party info, filing codes
  - Verify: Submission record created with envelope ID and "submitted" status

- [ ] Check filing fee calculation
  - Expected: Court filing fee + convenience fee displayed before submission
  - Verify: Fee matches Tyler fee schedule

- [ ] Track filing status
  - Expected: Status polling shows current state (processing, accepted, rejected)
  - Verify: `/api/efiling/submissions/[id]/status` returns current status

- [ ] Handle filing rejection
  - Expected: Rejection reason and code displayed
  - Verify: User can view rejection details and resubmit

- [ ] Receive stamped documents
  - Expected: Court-stamped documents available for download after acceptance
  - Verify: Stamped document saved to case documents

### 18.4 E-Filing Webhooks

**Navigation:** Background processing (`/api/webhooks/efiling`)

- [ ] Receive status update from Tyler
  - Expected: Submission record updated automatically
  - Verify: In-app notification created for attorney

### 18.5 E-Filing Status Monitoring

**Navigation:** Background cron (`/api/cron/check-efiling-status`)

- [ ] Verify cron job polls pending submissions
  - Expected: All "submitted" and "processing" filings checked periodically
  - Verify: Status transitions recorded with timestamps

### 18.6 Missing E-Filing Features

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: E-filing dashboard/queue UI
  - Expected: Dedicated page showing all filings with status, filters
  - Verify: N/A — no UI page found for filing management

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Filing document preparation UI
  - Expected: UI to select documents, filing codes, and court before submission
  - Verify: N/A — filing must be initiated via API

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: File & ServeXpress provider
  - Expected: Alternative e-filing provider
  - Verify: N/A — infrastructure exists, implementation missing

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: One Legal provider
  - Expected: California-specific e-filing provider
  - Verify: N/A — infrastructure exists, implementation missing

---

## SESSION 19: Analytics & Reporting

### 19.1 Financial Reports

**Navigation:** Dashboard → Reports → Financial tab

- [ ] View Revenue Report
  - Expected: Revenue breakdown by month, attorney, case type, and client
  - Verify: Totals match sum of individual entries

- [ ] View A/R Aging Report
  - Expected: Outstanding invoices grouped by age (current, 30, 60, 90+ days)
  - Verify: Aging buckets calculated correctly from invoice dates

- [ ] View Collections Report
  - Expected: Payment collection rates and trends
  - Verify: Collection rate = payments received / invoices sent

- [ ] View Profitability Report
  - Expected: Revenue minus costs per case/attorney
  - Verify: Profit margins calculated correctly

### 19.2 Attorney Performance Reports

**Navigation:** Dashboard → Reports → Performance tab

- [ ] View attorney performance table
  - Expected: Billable hours, utilization rate, revenue per attorney
  - Verify: Utilization = billable hours / total available hours

- [ ] Click attorney for deep-dive view
  - Expected: Detailed metrics for selected attorney
  - Verify: Settlement rates, client satisfaction scores visible

- [ ] View team performance summary
  - Expected: Aggregate team metrics with comparisons
  - Verify: Team averages calculated across all attorneys

### 19.3 Case Reports

**Navigation:** Dashboard → Reports → Cases tab

- [ ] View case lifecycle report
  - Expected: Cases by stage with average time per stage
  - Verify: Stage progression data populated

- [ ] View case outcomes report
  - Expected: Settlement vs. trial outcomes, average duration
  - Verify: Data sourced from `caseAnalytics.ts`

### 19.4 Report Export

**Navigation:** Reports page → Export button

- [ ] Export report as PDF
  - Expected: PDF file downloads with formatted report data
  - Verify: PDF includes firm name, date range, and report title

- [ ] Export report as Excel
  - Expected: .xlsx file downloads with data in spreadsheet format
  - Verify: Columns match report fields, numbers formatted correctly

- [ ] Export report as CSV
  - Expected: .csv file downloads
  - Verify: Data comma-delimited and parseable

### 19.5 Scheduled Reports

**Navigation:** Dashboard → Reports → Scheduled tab

- [ ] Create a scheduled report
  - Expected: Form to select report type, frequency (daily/weekly/biweekly/monthly), recipients
  - Verify: Schedule saved with next run date calculated

- [ ] Edit scheduled report frequency
  - Expected: Frequency updated, next run recalculated
  - Verify: `calculateNextRun()` returns correct date for timezone

- [ ] Run scheduled report on demand
  - Expected: Report generated immediately via `/api/reports/schedules/[id]/run`
  - Verify: Report delivered to configured email recipients

- [ ] Delete a scheduled report
  - Expected: Schedule removed, no future runs
  - Verify: Record deleted from database

### 19.6 Dashboard Metrics

**Navigation:** Dashboard → Analytics (or main dashboard)

- [ ] View KPI dashboard
  - Expected: Key metrics displayed (active cases, revenue, utilization)
  - Verify: `/api/analytics/kpi` returns current values

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Analytics dashboard page is a stub
  - Expected: Rich visualization with charts
  - Verify: `/app/dashboard/analytics/page.tsx` may show minimal content

### 19.7 Missing Analytics Features

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Custom report builder
  - Expected: UI to create custom reports with selected fields/metrics
  - Verify: N/A — only pre-built report types exist

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Report comparison (period-over-period)
  - Expected: Compare two date ranges side-by-side
  - Verify: N/A — single-period reports only

---

## SESSION 20: Client Portal

### 20.1 Magic Link Authentication

**Navigation:** /portal/login

- [ ] Enter email and request magic link
  - Expected: Email sent with login link, UI shows "Check your email" message
  - Verify: Token created with 15-minute expiry

- [ ] Click magic link in email
  - Expected: Redirected to portal dashboard, session established
  - Verify: `/api/portal/auth/verify` validates token and creates session

- [ ] Try expired magic link (wait 15+ minutes)
  - Expected: Error message "Link expired, request a new one"
  - Verify: Token rejected by verification endpoint

- [ ] Toggle to password login
  - Expected: Password form appears as alternative
  - Verify: Both login methods work on same page

### 20.2 Portal Dashboard

**Navigation:** /portal/dashboard (after login)

- [ ] View welcome banner
  - Expected: Client name and assigned attorney info displayed
  - Verify: Case progress tracker with stage indicators visible

- [ ] View progress percentage
  - Expected: Overall case progress percentage shown
  - Verify: Percentage reflects completed tasks vs total

- [ ] View recent activity feed
  - Expected: Chronological list of recent case events
  - Verify: Activities include document uploads, messages, status changes

- [ ] Click quick action links
  - Expected: Navigate to Messages, Documents, Tasks, etc.
  - Verify: All quick action links resolve to correct portal pages

### 20.3 Secure Messaging

**Navigation:** /portal/messages

- [ ] View conversation list
  - Expected: List of conversations with unread counts and status badges
  - Verify: Conversations sorted by most recent activity

- [ ] Select a conversation
  - Expected: Message thread loads with sender names, timestamps, content
  - Verify: Messages displayed in chronological order

- [ ] Send a message
  - Expected: Message appears immediately in thread, sent to attorney
  - Verify: Press Enter to send (Shift+Enter for newline)

- [ ] Start a new conversation
  - Expected: Modal opens with subject, category, and message fields
  - Verify: Category options match `CONVERSATION_TYPE_LABELS`

- [ ] Search conversations
  - Expected: Filter conversations by subject keyword
  - Verify: Search updates list in real-time

- [ ] Filter by status (open/closed/all)
  - Expected: Conversation list filters correctly
  - Verify: Status filter buttons toggle active state

- [ ] Close a conversation
  - Expected: Conversation status changes to "closed"
  - Verify: Closed conversations show in "closed" filter

- [ ] Verify polling for new messages
  - Expected: New messages from attorney appear within 5 seconds without refresh
  - Verify: `setInterval` polling active when conversation open

- [ ] Use message templates (quick replies)
  - Expected: Template content populates message input
  - Verify: Templates load from `/api/portal/templates`

### 20.4 Document Viewing & Upload

**Navigation:** /portal/documents

- [ ] View shared documents list
  - Expected: All documents shared by attorney displayed with file info
  - Verify: File type icons, names, sizes, upload dates shown

- [ ] Search documents
  - Expected: Filter by filename
  - Verify: Results update as you type

- [ ] Download a document
  - Expected: File downloads to local device
  - Verify: `/api/portal/documents/[id]/download` returns file

- [ ] View document upload requests
  - Expected: List of documents attorney has requested from client
  - Verify: Requests show status (pending, submitted, approved, rejected)

- [ ] Submit a requested document
  - Expected: File upload interface, document linked to request
  - Verify: Request status changes to "submitted"

- [ ] Track document views
  - Expected: View recorded when client opens document
  - Verify: `/api/portal/documents/[id]/view` logging entry

### 20.5 Appointment Requests

**Navigation:** /portal/appointments

- [ ] View upcoming appointments
  - Expected: List of scheduled appointments with date, time, type, location
  - Verify: Past appointments in separate section

- [ ] Book a new appointment (3-step wizard)
  - Expected: Step 1: Select type (consultation, document review, etc.)
  - Verify: Type options include location (in-person, video, phone)

- [ ] Select date and time
  - Expected: Step 2: Calendar with available slots, week navigation
  - Verify: Only available slots shown (no double-booking)

- [ ] Confirm appointment
  - Expected: Step 3: Review and confirm, appointment created
  - Verify: Appointment appears in list with "scheduled" status

- [ ] Cancel an appointment
  - Expected: Cancellation dialog with reason field
  - Verify: Status changes to "cancelled", reason saved

### 20.6 Task Management (Client View)

**Navigation:** /portal/tasks

- [ ] View task list with statistics
  - Expected: Total, completed, and pending counts displayed
  - Verify: Task cards show title, status, priority, due date

- [ ] Filter tasks (all, active, completed, by status)
  - Expected: List filters correctly per selection
  - Verify: Filter buttons toggle active state

- [ ] Start a task
  - Expected: Task status changes to "in_progress"
  - Verify: Status badge updates

- [ ] Submit a task with notes
  - Expected: Task marked as "submitted" with notes attached
  - Verify: `/api/portal/tasks/[id]/submit` processes submission

- [ ] Expand task for details
  - Expected: Full description and any attached instructions visible
  - Verify: Task type icons (upload, review, questionnaire, etc.) shown

### 20.7 Online Payments

**Navigation:** /portal/billing

- [ ] View invoice list
  - Expected: Invoices with status badges (draft, sent, overdue, partially paid, paid, void)
  - Verify: Outstanding balance summary at top

- [ ] Make a payment on an invoice
  - Expected: Payment dialog with amount input and payment method selection
  - Verify: Payment processed via Stripe

- [ ] Add a payment method
  - Expected: Stripe payment setup flow
  - Verify: Card saved and listed in payment methods

- [ ] Set default payment method
  - Expected: Selected method marked as default
  - Verify: Default used for future payments

- [ ] View payment history
  - Expected: List of past payments with dates, amounts, methods
  - Verify: History matches Stripe records

### 20.8 Push Notifications & PWA

**Navigation:** Browser settings / device home screen

- [ ] Verify PWA manifest loads
  - Expected: `/manifest.json` accessible with app name, icons, shortcuts
  - Verify: Start URL is `/portal/dashboard`, display is `standalone`

- [ ] Verify service worker registers
  - Expected: Service worker active at `/portal` scope
  - Verify: Browser DevTools → Application → Service Workers shows registered

- [ ] Test offline fallback
  - Expected: Offline page shown when network unavailable
  - Verify: `/offline.html` renders (content may be minimal)

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Push notification permission prompt
  - Expected: UI button to request notification permission
  - Verify: No dedicated UI component found — service worker configured but no prompt

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: PWA install prompt
  - Expected: "Add to Home Screen" banner or button
  - Verify: N/A — no install prompt UI

---

## SESSION 21: Admin Console

### 21.1 Admin Dashboard

**Navigation:** Dashboard → Admin (admin role required)

- [ ] View admin console hub
  - Expected: Quick stats (active members, pending invitations, plan, seat usage)
  - Verify: 8 navigation sections displayed

- [ ] Verify admin-only access
  - Expected: Non-admin users cannot access `/dashboard/admin`
  - Verify: Redirect or 403 for non-admin roles

### 21.2 Firm Settings

**Navigation:** Dashboard → Admin → Firm Settings

- [ ] Edit firm profile (name, address, phone, website)
  - Expected: Changes saved with success feedback
  - Verify: Updated values persist after page reload

- [ ] Update billing defaults (hourly rate, increment, retainer)
  - Expected: Billing settings saved
  - Verify: New defaults applied to new time entries

- [ ] Update case settings (numbering format, defaults)
  - Expected: Case configuration saved
  - Verify: New cases use updated numbering format

- [ ] Update notification settings
  - Expected: Email templates and triggers configurable
  - Verify: Changes affect future notification delivery

### 21.3 User Management

**Navigation:** Dashboard → Admin → User Management

- [ ] View member list
  - Expected: All firm members with name, email, role, status, department
  - Verify: Search and filter (show inactive) working

- [ ] Invite a new team member
  - Expected: Invite dialog with name, email, role selection
  - Verify: Invitation email sent, status shows "invited"

- [ ] Change a user's role
  - Expected: Role dropdown updates and saves
  - Verify: Permission changes take effect on user's next action

- [ ] Deactivate a user
  - Expected: User status changes to "inactive", access revoked
  - Verify: Deactivated user cannot log in

- [ ] Reactivate a user
  - Expected: User status changes back to "active"
  - Verify: User can log in again

### 21.4 Roles & Permissions

**Navigation:** Dashboard → Admin → Roles & Permissions

- [ ] View role list (system + custom)
  - Expected: Left panel shows all roles
  - Verify: System roles (admin, attorney, paralegal, client) are locked

- [ ] View permission matrix for a role
  - Expected: Right panel shows permissions by category
  - Verify: Toggle switches for each permission

- [ ] Create a custom role
  - Expected: New role created with selected permissions
  - Verify: Custom role appears in role list

- [ ] Modify permissions on a custom role
  - Expected: Permission toggles save immediately
  - Verify: Users with this role see updated access

- [ ] Verify system roles cannot be modified
  - Expected: Toggle switches disabled for system roles
  - Verify: No API changes accepted for system roles

### 21.5 Custom Fields

**Navigation:** Dashboard → Admin → Custom Fields

- [ ] Select entity type (cases, clients, documents, invoices, tasks)
  - Expected: Tab navigation between entity types
  - Verify: Correct fields shown per entity

- [ ] Add a new custom field
  - Expected: Field type selection (text, number, currency, date, select, etc.)
  - Verify: 12 field types available

- [ ] Configure field options (required, visible in list, visible in portal)
  - Expected: Options saved per field
  - Verify: Required fields enforced on form submission

- [ ] Add options for select/multiselect field
  - Expected: Option list editable
  - Verify: Options appear in field dropdown

- [ ] Delete a custom field
  - Expected: Field removed with confirmation
  - Verify: Field no longer appears in forms

### 21.6 Subscription & Billing

**Navigation:** Dashboard → Admin → Billing

- [ ] View current plan details
  - Expected: Plan name, pricing, seat usage displayed
  - Verify: Seat count matches active users

- [ ] View plan upgrade options
  - Expected: Available plans with features and pricing
  - Verify: Monthly/annual toggle adjusts pricing

- [ ] Access Stripe billing portal
  - Expected: Redirect to Stripe customer portal
  - Verify: Can update payment method and view invoices

- [ ] View invoice history
  - Expected: List of past invoices with status
  - Verify: Invoices match Stripe billing records

### 21.7 Audit Logging

**Navigation:** Dashboard → Admin → Audit Logs

- [ ] View audit log list
  - Expected: Paginated list (25 per page) of admin actions
  - Verify: Each entry shows actor, action, entity, timestamp, IP

- [ ] Filter by action type (create, update, delete, view, invite, deactivate, permission_change)
  - Expected: List filters to selected action type
  - Verify: Filter dropdown works correctly

- [ ] Filter by entity type (firm settings, members, roles, integrations, custom fields, cases)
  - Expected: List filters to selected entity
  - Verify: Both filters can be combined

- [ ] Expand audit entry to view changes
  - Expected: JSON diff of before/after values displayed
  - Verify: Changes accurately reflect what was modified

- [ ] Paginate through audit logs
  - Expected: Next/previous page navigation
  - Verify: Total event count displayed

### 21.8 Integration Management

**Navigation:** Dashboard → Admin → Integrations

- [ ] View integration catalog
  - Expected: List of available integrations by category
  - Verify: Categories include Calendar, Storage, Email, Accounting, etc.

- [ ] View integration status (connected/pending/disconnected)
  - Expected: Status indicator per integration
  - Verify: Last sync timestamp shown for connected integrations

- [ ] Connect/disconnect an integration
  - Expected: Connect button initiates setup, disconnect removes connection
  - Verify: Status updates after action

### 21.9 Document Templates

**Navigation:** Dashboard → Admin → Templates

- [ ] View task templates
  - Expected: List of task templates with usage count and active status
  - Verify: Template data loads from database

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Email template management
  - Expected: Create/edit email templates
  - Verify: Tab exists but limited backend integration

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Document template management
  - Expected: Create/edit document templates
  - Verify: Tab exists but limited backend integration

### 21.10 Performance Monitoring (Admin)

**Navigation:** Dashboard → Admin → Performance

- [ ] View system health status (healthy/degraded/unhealthy)
  - Expected: Overall health indicator with service checks
  - Verify: Database, Redis, memory status shown

- [ ] View latency metrics
  - Expected: Response time metrics displayed
  - Verify: Auto-refresh updates metrics

- [ ] View memory usage (heap, RSS)
  - Expected: Current memory consumption shown
  - Verify: Values update on refresh

- [ ] View error tracking
  - Expected: Error types, counts, severity levels
  - Verify: Slowest operations listed

---

## SESSION 22: Performance

### 22.1 Health Check Endpoints

**Navigation:** Direct API calls

- [ ] GET `/api/health`
  - Expected: JSON with database, Redis, memory status; overall health
  - Verify: Returns 200 if healthy, 503 if unhealthy

- [ ] GET `/api/health/live`
  - Expected: Simple 200 response confirming app is running
  - Verify: Always returns 200 if process is alive

- [ ] GET `/api/health/ready`
  - Expected: 200 if database connected, 503 if not
  - Verify: Tests actual database query

### 22.2 Metrics Endpoint

**Navigation:** GET `/api/metrics`

- [ ] Fetch metrics in Prometheus format
  - Expected: Text output with `http_requests_total`, `db_query_duration_seconds`, etc.
  - Verify: Content-Type is `text/plain`

- [ ] Fetch metrics in JSON format (`?format=json`)
  - Expected: JSON object with all metric categories
  - Verify: Includes HTTP, DB, cache, job, and business metrics

### 22.3 Redis Caching

**Navigation:** Indirect (observed via X-Cache header)

- [ ] Make same API request twice
  - Expected: Second request returns `X-Cache: HIT` header
  - Verify: Response time significantly faster on cache hit

- [ ] Verify cache TTL (default 5 minutes)
  - Expected: Cache expires after TTL
  - Verify: Request after TTL returns `X-Cache: MISS`

- [ ] Verify cache invalidation on data change
  - Expected: Related cache cleared when data updated
  - Verify: Updated data returned on next request

- [ ] Verify graceful fallback when Redis unavailable
  - Expected: App continues working without cache
  - Verify: No errors, just slower responses

### 22.4 Rate Limiting

**Navigation:** Rapid API calls to same endpoint

- [ ] Exceed rate limit
  - Expected: 429 Too Many Requests response
  - Verify: Headers include X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

- [ ] Verify rate limit resets after window
  - Expected: Requests succeed after reset time
  - Verify: X-RateLimit-Remaining back to full limit

### 22.5 Background Job Queue

**Navigation:** Indirect (triggered by system events)

- [ ] Verify job queues are processing
  - Expected: Background jobs execute (analytics refresh, notifications, etc.)
  - Verify: Check metrics endpoint for job processing counts

- [ ] Verify job retry on failure
  - Expected: Failed jobs retried up to 3 times with exponential backoff
  - Verify: Job retry count visible in metrics

### 22.6 Cron Jobs

**Navigation:** Vercel cron configuration

- [ ] Verify calendar sync runs every 15 minutes
  - Expected: `/api/cron/sync-calendars` executes on schedule
  - Verify: Calendar events synced without manual trigger

- [ ] Verify daily reminders sent at 8 AM
  - Expected: `/api/cron/send-reminders` sends deadline reminders
  - Verify: Reminder emails received

- [ ] Verify daily cleanup at 3 AM
  - Expected: `/api/cron/cleanup` removes stale data
  - Verify: Temporary data cleaned

---

## SESSION 23: Testing

### 23.1 Unit Tests

**Navigation:** Terminal: `npm run test:unit`

- [ ] Run unit tests
  - Expected: All tests pass (date utils, permissions, validations, cache, notifications, tasks)
  - Verify: No failures in test output

- [ ] Check coverage thresholds
  - Expected: 80% statements, 75% branches, 80% functions, 80% lines
  - Verify: Run `npm run coverage` and check report

### 23.2 Component Tests

**Navigation:** Terminal: `npm test`

- [ ] Run component tests
  - Expected: InvoiceGenerator, TaskCard, VirtualList tests pass
  - Verify: DOM rendering and interaction tests succeed

### 23.3 Integration Tests

**Navigation:** Terminal: `npm run test:integration`

- [ ] Run integration tests
  - Expected: Health and metrics endpoint tests pass
  - Verify: Tests verify actual endpoint behavior

### 23.4 Security Tests

**Navigation:** Terminal: `npm run test:security`

- [ ] Run security tests
  - Expected: Auth tests pass (authentication, authorization)
  - Verify: Unauthorized access properly rejected

### 23.5 E2E Tests (Playwright)

**Navigation:** Terminal: `npm run test:e2e`

- [ ] Run E2E tests
  - Expected: Auth, cases, client flows, attorney flows pass
  - Verify: Multi-browser (Chromium, Firefox, WebKit) execution

- [ ] Run E2E in UI mode
  - Expected: `npm run test:e2e:ui` opens Playwright UI
  - Verify: Can visually step through tests

### 23.6 Accessibility Tests

**Navigation:** Terminal: `npm run test:a11y`

- [ ] Run accessibility tests
  - Expected: WCAG 2A/2AA compliance checks pass
  - Verify: Axe-core scans key pages (login, dashboard, portal)

- [ ] Verify keyboard navigation
  - Expected: All interactive elements reachable via Tab
  - Verify: Focus indicators visible

- [ ] Verify color contrast
  - Expected: Text meets WCAG contrast ratios
  - Verify: No contrast violations reported

### 23.7 Load Tests

**Navigation:** Terminal: `k6 run tests/load/k6-config.js`

- [ ] Run load tests
  - Expected: Ramp to 50 users, p95 < 2000ms, error rate < 5%
  - Verify: Health, metrics, and cases endpoints tested

### 23.8 Missing Testing Features

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Visual regression testing
  - Expected: Screenshot comparison for UI changes
  - Verify: N/A — no visual regression framework configured

- [ ] ⚠️ FEATURE NOT IMPLEMENTED: Contract/API testing
  - Expected: API schema validation testing
  - Verify: N/A — no contract testing framework

---

## SESSION 24: Deployment

### 24.1 Environment Configuration

**Navigation:** Review `.env.example`

- [ ] Verify all required environment variables documented
  - Expected: 40+ variables covering Supabase, Stripe, Resend, Redis, etc.
  - Verify: `.env.example` exists with descriptions

- [ ] Verify feature flags configured
  - Expected: ENABLE_CLIENT_PORTAL, ENABLE_EFILING, ENABLE_AI_DOCUMENTS
  - Verify: Feature flags control feature availability

### 24.2 Vercel Configuration

**Navigation:** Review `vercel.json`

- [ ] Verify deployment region
  - Expected: Region set to `iad1` (US East)
  - Verify: `vercel.json` contains region configuration

- [ ] Verify security headers
  - Expected: CSP, X-Frame-Options, X-XSS-Protection headers configured
  - Verify: Response headers present on deployed site

- [ ] Verify cron jobs configured
  - Expected: 5 cron jobs defined (payments, reminders, cleanup, calendar sync, reports)
  - Verify: Cron expressions match expected schedules

### 24.3 CI/CD Pipeline (GitHub Actions)

**Navigation:** GitHub → Actions tab

- [ ] Verify CI workflow runs on push/PR
  - Expected: Lint, type check, unit tests, integration tests, E2E, security scan, build
  - Verify: `.github/workflows/ci.yml` workflow succeeds

- [ ] Verify staging deployment on `develop` push
  - Expected: Auto-deploy to staging with health check
  - Verify: `.github/workflows/deploy-staging.yml` completes

- [ ] Verify production deployment on `main` push
  - Expected: Tests run → Vercel deploy → health check → CDN purge
  - Verify: `.github/workflows/deploy-production.yml` completes

- [ ] Verify automatic rollback on failure
  - Expected: If health check fails, rollback to previous deployment
  - Verify: Rollback step in production workflow

- [ ] Verify Slack notifications
  - Expected: Deploy notifications sent to Slack
  - Verify: Slack webhook configured in workflow

### 24.4 Docker Configuration

**Navigation:** Review `Dockerfile` and `docker-compose.yml`

- [ ] Build Docker image
  - Expected: Multi-stage build succeeds (Node 20 Alpine)
  - Verify: `docker build .` completes without errors

- [ ] Run with docker-compose
  - Expected: App + Redis start, health checks pass
  - Verify: `docker-compose up` starts both services

- [ ] Verify non-root user
  - Expected: Container runs as `nextjs` user (UID 1001)
  - Verify: Security best practice for production

### 24.5 Database Migrations

**Navigation:** Terminal: `npm run migrate`

- [ ] Check migration status
  - Expected: List of applied and pending migrations
  - Verify: `npm run migrate status` shows migration history

- [ ] Run pending migrations
  - Expected: All 52+ migrations apply successfully
  - Verify: `npm run migrate up` completes without errors

- [ ] Verify migration rollback
  - Expected: `npm run migrate down` reverts last migration
  - Verify: Database schema reverts to previous state

### 24.6 Deployment Scripts

**Navigation:** Terminal: scripts directory

- [ ] Run deployment script
  - Expected: `npm run deploy` executes build, test, migrate, deploy
  - Verify: Script completes for specified environment

- [ ] Test rollback script
  - Expected: `npm run rollback` reverts to previous Vercel deployment
  - Verify: Previous deployment becomes active

### 24.7 Backup & Restore

**Navigation:** Terminal: scripts directory

- [ ] Run backup script
  - Expected: Database backup created (full or incremental)
  - Verify: Backup file generated with manifest

- [ ] Test restore from backup
  - Expected: Database restored to backup state
  - Verify: Data matches backup contents

- [ ] ⚠️ PARTIALLY IMPLEMENTED: Automated S3 backups
  - Expected: Backups automatically uploaded to S3
  - Verify: Script framework exists but may need testing

---

## TESTING SUMMARY

### Features Fully Implemented
- Google Calendar integration (OAuth, sync, UI)
- Email notifications via Resend (templates, quiet hours, queue)
- Webhook system (HMAC signing, retry, delivery tracking)
- Automation rules engine (deadline, invoice, payment workflows)
- QuickBooks export (CSV, IIF, QBO)
- Discovery request management (CRUD, deadline calculation, document generation)
- Settlement proposals (full lifecycle with counter-offers)
- Settlement documents (generation, signatures, comments, versions)
- Settlement dashboard (6-tab interface)
- Tyler/Odyssey e-filing integration (complete provider)
- E-filing credentials and submission tracking
- Financial, attorney, and case analytics with export
- Scheduled reports with email delivery
- Client portal (magic link auth, messaging, documents, appointments, tasks, payments)
- PWA manifest and service worker
- Admin console (settings, users, roles, custom fields, billing, audit)
- Redis caching with graceful fallback
- Rate limiting with Redis backend
- Background job queue (BullMQ)
- Performance monitoring (Prometheus metrics, tracing, error tracking)
- Health check endpoints (liveness, readiness, full)
- Comprehensive test suite (unit, integration, E2E, accessibility, load)
- CI/CD pipeline (GitHub Actions for CI, staging, production)
- Docker configuration (multi-stage build, compose)
- Database migrations (52+ files, runner script)
- Deployment & rollback scripts

### Features Partially Implemented
- Depositions (types + UI exist, no API routes for CRUD)
- Privilege log (types + UI exist, no API routes for CRUD)
- Mediation sessions (44KB component, no API routes)
- Settlement scenarios (modeler UI exists, no persistence API)
- E-filing dashboard/queue UI (backend complete, no dedicated page)
- Analytics dashboard page (stub — full APIs exist)
- Document template admin (UI tabs exist, limited backend)
- Push notification UI (service worker configured, no permission prompt)
- PWA install prompt (manifest exists, no install UI)
- Automated S3 backups (script framework, needs testing)

### Features Not Found
- SendGrid email integration
- Twilio SMS notifications
- Microsoft 365/Outlook calendar sync
- DocuSign e-signature integration
- File & ServeXpress e-filing provider
- One Legal e-filing provider
- Custom report builder
- Visual regression testing
- Contract/API testing framework
- Feature flag runtime management UI

### Critical Issues Found During Audit
1. **Deposition CRUD API routes missing** — UI component exists (34KB) but no backend to persist data
2. **Privilege log CRUD API routes missing** — UI component exists but no backend
3. **Mediation session API routes missing** — Large 44KB component with no backend support
4. **Settlement scenario API missing** — Modeler can create scenarios but cannot save them
5. **E-filing has no dashboard UI** — Attorneys must use API directly for filing management
6. **Analytics dashboard is a stub** — Full analytics APIs exist but overview page is minimal
7. **Template management backend incomplete** — Admin can see templates but limited CRUD
