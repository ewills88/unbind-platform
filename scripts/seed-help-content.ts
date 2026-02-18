// Session 25: Seed Script for Help Center Content
// Run: npx tsx scripts/seed-help-content.ts
// Idempotent: uses upsert on slug/unique fields

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seedCategories() {
  console.log('Seeding help categories...')

  const categories = [
    {
      name: 'Getting Started',
      slug: 'getting-started',
      description: 'Set up your account and learn the basics of Unbind',
      icon: 'book-open',
      sort_order: 1,
    },
    {
      name: 'Case Management',
      slug: 'case-management',
      description: 'Create and manage divorce cases effectively',
      icon: 'folder-open',
      sort_order: 2,
    },
    {
      name: 'Billing & Invoicing',
      slug: 'billing',
      description: 'Time tracking, invoicing, and payment processing',
      icon: 'credit-card',
      sort_order: 3,
    },
    {
      name: 'Documents',
      slug: 'documents',
      description: 'Upload, manage, and analyze case documents',
      icon: 'file-text',
      sort_order: 4,
    },
    {
      name: 'Client Portal',
      slug: 'client-portal',
      description: 'Client access, communication, and self-service features',
      icon: 'users',
      sort_order: 5,
    },
    {
      name: 'Account Settings',
      slug: 'account-settings',
      description: 'Manage your profile, firm settings, and preferences',
      icon: 'settings',
      sort_order: 6,
    },
  ]

  for (const cat of categories) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('help_categories')
      .upsert(cat, { onConflict: 'slug' })

    if (error) console.error(`  Error seeding category ${cat.slug}:`, error.message)
    else console.log(`  ✓ ${cat.name}`)
  }

  return categories
}

async function seedArticles() {
  console.log('\nSeeding help articles...')

  // Fetch category IDs
  const { data: categories } = await supabase
    .from('help_categories')
    .select('id, slug')

  const catMap: Record<string, string> = {}
  for (const c of categories || []) {
    catMap[c.slug] = c.id
  }

  const articles = [
    // Getting Started
    {
      category_id: catMap['getting-started'],
      title: 'Creating Your Account',
      slug: 'creating-your-account',
      summary: 'Step-by-step guide to setting up your Unbind account',
      tags: ['account', 'setup', 'registration'],
      content: `# Creating Your Account

Welcome to Unbind! This guide will walk you through creating your account and getting started.

## Step 1: Register

Visit the registration page and enter your email address, full name, and password. You'll need to verify your email address before proceeding.

## Step 2: Set Up Your Profile

After verifying your email, complete your profile:
- Upload a profile photo
- Enter your bar number and jurisdiction
- Set your preferred notification settings

## Step 3: Create or Join a Firm

You can either:
- **Create a new firm** — Set up your firm's profile and invite team members
- **Join an existing firm** — Accept an invitation from a firm administrator

## Step 4: Explore the Dashboard

Once your account is set up, you'll be taken to your dashboard where you can:
- Create your first case
- View the onboarding checklist
- Access help articles and tutorials

## Need Help?

If you run into any issues, contact our support team at support@unbind.law.`,
    },
    {
      category_id: catMap['getting-started'],
      title: 'Understanding the Dashboard',
      slug: 'understanding-the-dashboard',
      summary: 'A tour of the main dashboard and its key features',
      tags: ['dashboard', 'navigation', 'overview'],
      content: `# Understanding the Dashboard

Your dashboard is the central hub for managing your practice on Unbind.

## Key Sections

### Cases Overview
The cases section shows your active cases with status indicators, upcoming deadlines, and recent activity.

### Calendar
View all upcoming events, court dates, and deadlines across all your cases in one place.

### Messages
Quick access to unread messages from clients and team members.

### Billing Summary
Track billable hours, pending invoices, and revenue at a glance.

## Navigation

Use the sidebar to navigate between:
- **Dashboard** — Overview and quick actions
- **Cases** — Full case management
- **Calendar** — Events and deadlines
- **Documents** — Document management
- **Billing** — Time entries and invoices
- **Reports** — Analytics and reporting
- **Settings** — Account and firm settings

## Tips

- Click on any case card to open it
- Use keyboard shortcuts for faster navigation
- Customize your dashboard widgets in Settings`,
    },
    {
      category_id: catMap['getting-started'],
      title: 'Inviting Team Members',
      slug: 'inviting-team-members',
      summary: 'How to add attorneys and staff to your firm account',
      tags: ['team', 'invitations', 'firm', 'members'],
      content: `# Inviting Team Members

Add attorneys, paralegals, and staff to your Unbind firm account.

## Sending Invitations

1. Go to **Settings** → **Firm Members**
2. Click **Invite Member**
3. Enter the member's email address
4. Select their role:
   - **Senior Attorney** — Full case access and billing
   - **Attorney** — Case access and time tracking
   - **Paralegal** — Document and case support
   - **Staff** — Administrative access
5. Click **Send Invitation**

## Managing Roles

Each role has specific permissions:

| Permission | Senior Attorney | Attorney | Paralegal | Staff |
|-----------|:-:|:-:|:-:|:-:|
| View cases | ✓ | ✓ | ✓ | ✗ |
| Create cases | ✓ | ✓ | ✗ | ✗ |
| Billing | ✓ | ✓ | ✗ | ✗ |
| Documents | ✓ | ✓ | ✓ | ✗ |
| Firm settings | ✓ | ✗ | ✗ | ✗ |

## Removing Members

To remove a team member, go to **Settings** → **Firm Members**, find the member, and click **Remove**.`,
    },
    // Case Management
    {
      category_id: catMap['case-management'],
      title: 'Creating a New Case',
      slug: 'creating-a-new-case',
      summary: 'How to create and configure a new divorce case',
      tags: ['case', 'create', 'setup'],
      content: `# Creating a New Case

Follow these steps to create a new divorce case in Unbind.

## Step 1: Start a New Case

Click **New Case** from the dashboard or cases page.

## Step 2: Enter Case Details

Fill in the required information:
- **Client Name** — Your client's full legal name
- **Case Type** — Divorce, dissolution, legal separation, etc.
- **State** — The jurisdiction for the case
- **Opposing Party** — Name of the opposing party
- **Filing Date** — Date of filing (if already filed)

## Step 3: Assign Team Members

Select the attorneys and staff who will work on the case.

## Step 4: Set Up Billing

Configure billing for the case:
- Set hourly rates
- Choose billing method (hourly, flat fee, hybrid)
- Set up retainer if applicable

## Step 5: Invite Client

Send a portal invitation to your client so they can:
- View case progress
- Upload documents
- Communicate securely
- Review and pay invoices`,
    },
    {
      category_id: catMap['case-management'],
      title: 'Managing Case Stages',
      slug: 'managing-case-stages',
      summary: 'Track your case through each stage of the divorce process',
      tags: ['case', 'stages', 'workflow', 'status'],
      content: `# Managing Case Stages

Unbind tracks your case through predefined stages of the divorce process.

## Default Stages

1. **Initial Filing** — Case intake and petition filing
2. **Discovery** — Document exchange and interrogatories
3. **Negotiation** — Settlement discussions
4. **Mediation** — Third-party mediation sessions
5. **Settlement** — Agreement drafting and review
6. **Trial** — Court proceedings (if needed)

## Advancing Stages

Cases can be advanced to the next stage manually or automatically:
- Click **Advance Stage** on the case detail page
- Set up automated stage transitions based on events

## Stage-Specific Actions

Each stage unlocks relevant tools:
- **Discovery** → Financial affidavit templates
- **Negotiation** → Settlement proposal tools
- **Mediation** → Session scheduling and notes
- **Settlement** → Agreement builder

## Custom Stages

Contact your administrator to customize stages for your firm's workflow.`,
    },
    {
      category_id: catMap['case-management'],
      title: 'Working with Court Deadlines',
      slug: 'working-with-court-deadlines',
      summary: 'Set up and manage court deadlines and automatic reminders',
      tags: ['deadlines', 'calendar', 'court', 'reminders'],
      content: `# Working with Court Deadlines

Never miss a court deadline with Unbind's deadline tracking system.

## Automatic Deadline Calculation

When you create a triggering event (like a filing date), Unbind automatically calculates related deadlines based on your state's rules:
- Response deadlines
- Discovery cutoffs
- Motion filing deadlines
- Trial dates

## Manual Deadlines

Create custom deadlines from the case calendar:
1. Click **Add Event** on the calendar
2. Select **Deadline** as the event type
3. Set the date, description, and priority
4. Assign responsible team members

## Reminders

Configure reminders for each deadline:
- **Email notifications** — 7 days, 3 days, 1 day before
- **Dashboard alerts** — Highlighted on the dashboard
- **Calendar integration** — Sync with Google Calendar

## Overdue Tracking

Overdue deadlines are flagged in red across the platform and generate urgent notifications to assigned team members.`,
    },
    // Billing
    {
      category_id: catMap['billing'],
      title: 'Tracking Time Entries',
      slug: 'tracking-time-entries',
      summary: 'Record billable and non-billable time for your cases',
      tags: ['time', 'billing', 'tracking', 'hours'],
      content: `# Tracking Time Entries

Record time accurately for billing and productivity tracking.

## Creating Time Entries

### Quick Entry
Click the timer icon in the top navigation to start a quick timer. When done, click stop and fill in the details.

### Manual Entry
Go to **Billing** → **Time Entries** → **New Entry**:
- Select the case
- Enter description of work
- Set duration (hours and minutes)
- Mark as billable or non-billable
- Select the appropriate rate

## Bulk Entry

Use the weekly view to enter multiple time entries at once. Click on any day to add entries for that date.

## Time Entry Best Practices

- Record time as you work for accuracy
- Use descriptive entries for client transparency
- Review unbilled entries weekly
- Use task codes for consistent categorization

## Reports

View time entry reports from **Reports** → **Time & Billing**:
- Billable vs. non-billable hours
- Hours by case, attorney, or date range
- Utilization rates`,
    },
    {
      category_id: catMap['billing'],
      title: 'Generating Invoices',
      slug: 'generating-invoices',
      summary: 'Create and send professional invoices to clients',
      tags: ['invoices', 'billing', 'payments'],
      content: `# Generating Invoices

Create professional invoices from your time entries and expenses.

## Creating an Invoice

1. Go to the case **Billing** tab
2. Click **Generate Invoice**
3. Select the date range for unbilled entries
4. Review and adjust line items
5. Add any fixed fees or expenses
6. Preview the invoice
7. Click **Send** to email to the client

## Invoice Settings

Customize your invoices in **Settings** → **Billing**:
- Upload firm logo
- Set payment terms (Net 15, Net 30, etc.)
- Configure accepted payment methods
- Add custom notes or disclaimers

## Payment Processing

Clients can pay invoices through:
- **Online payment** — Credit card via Stripe
- **Bank transfer** — ACH payment
- **Manual payment** — Record offline payments

## Invoice Status

Track invoices through their lifecycle:
- **Draft** — Not yet sent
- **Sent** — Delivered to client
- **Viewed** — Client has opened the invoice
- **Partial** — Partially paid
- **Paid** — Fully paid
- **Overdue** — Past payment terms`,
    },
    {
      category_id: catMap['billing'],
      title: 'Setting Up Payment Processing',
      slug: 'setting-up-payment-processing',
      summary: 'Configure Stripe for online client payments',
      tags: ['payments', 'stripe', 'setup'],
      content: `# Setting Up Payment Processing

Accept online payments from clients through Stripe integration.

## Connecting Stripe

1. Go to **Settings** → **Billing** → **Payment Processing**
2. Click **Connect Stripe Account**
3. Follow the Stripe onboarding flow
4. Once connected, clients can pay invoices online

## Accepted Payment Methods

With Stripe connected, clients can pay via:
- Credit cards (Visa, Mastercard, Amex)
- Debit cards
- ACH bank transfers (lower fees)

## Fee Structure

Stripe charges standard processing fees:
- **Cards**: 2.9% + 30¢ per transaction
- **ACH**: 0.8% per transaction (capped at $5)

## Trust Accounting

Unbind supports IOLTA trust accounting:
- Separate trust and operating accounts
- Automatic reconciliation
- Compliance with state bar requirements`,
    },
    // Documents
    {
      category_id: catMap['documents'],
      title: 'Uploading Documents',
      slug: 'uploading-documents',
      summary: 'Upload and organize case documents securely',
      tags: ['documents', 'upload', 'files'],
      content: `# Uploading Documents

Securely upload and manage documents for your cases.

## Supported File Types

- PDF documents
- Word documents (.doc, .docx)
- Excel spreadsheets (.xls, .xlsx)
- Images (.jpg, .png, .gif)
- Text files (.txt)

## Uploading Files

### Drag and Drop
Drag files directly onto the documents area of any case.

### Manual Upload
Click **Upload Document** and select files from your computer.

### Client Uploads
Clients can upload documents through the client portal.

## Organization

Documents are automatically organized by:
- **Category** — Financial, legal, correspondence, etc.
- **Date** — Upload date and document date
- **Status** — Draft, final, filed, etc.

## Security

All documents are:
- Encrypted at rest with AES-256
- Encrypted in transit with TLS 1.3
- Access-controlled by case permissions
- Versioned for audit trail`,
    },
    {
      category_id: catMap['documents'],
      title: 'AI Document Analysis',
      slug: 'ai-document-analysis',
      summary: 'Use AI to automatically extract data from financial documents',
      tags: ['ai', 'analysis', 'documents', 'extraction'],
      content: `# AI Document Analysis

Unbind uses AI to automatically analyze and extract data from case documents.

## How It Works

1. Upload a document to a case
2. Click **Analyze** on the document
3. AI processes the document and extracts key information
4. Review extracted data and confirm accuracy

## What Gets Extracted

### Financial Documents
- Income figures and sources
- Asset values and descriptions
- Debt balances and creditors
- Account numbers and institutions

### Legal Documents
- Party names and dates
- Key provisions and terms
- Filing requirements
- Deadline dates

## Accuracy

AI extraction is highly accurate but should always be reviewed by an attorney. The system highlights confidence levels for each extracted field.

## Privacy

Document analysis is performed securely:
- Documents are not stored by the AI provider
- Analysis results are encrypted
- No data is used for AI training`,
    },
    {
      category_id: catMap['documents'],
      title: 'E-Filing Documents',
      slug: 'e-filing-documents',
      summary: 'File documents electronically with courts across the country',
      tags: ['e-filing', 'court', 'filing'],
      content: `# E-Filing Documents

Submit court filings electronically through Unbind's e-filing integration.

## Supported Courts

Unbind supports e-filing in courts across all 50 states. Check the state-specific requirements in **Settings** → **E-Filing**.

## Filing Process

1. Prepare your document in the case
2. Go to **Filings** tab and click **New Filing**
3. Select the court and filing type
4. Attach the document and any exhibits
5. Review filing fees
6. Submit the filing
7. Receive confirmation and filing stamp

## Filing Requirements

Each court has specific requirements:
- Document format (PDF/A)
- Page size and margins
- Signature requirements
- Filing fee schedules

Unbind validates your documents against court requirements before submission.

## Service of Process

After filing, use Unbind to serve documents:
- Electronic service to opposing counsel
- Track service confirmations
- Generate proof of service`,
    },
    // Client Portal
    {
      category_id: catMap['client-portal'],
      title: 'Client Portal Overview',
      slug: 'client-portal-overview',
      summary: 'Understanding the client-facing portal features',
      tags: ['client', 'portal', 'overview'],
      content: `# Client Portal Overview

The client portal gives your clients secure access to their case information.

## Client Features

### Case Dashboard
Clients can view:
- Case status and current stage
- Upcoming deadlines and events
- Recent activity

### Documents
Clients can:
- View shared documents
- Upload requested documents
- Download their documents

### Messaging
Secure messaging between client and attorney:
- Real-time message delivery
- File attachments
- Read receipts

### Billing
Clients can:
- View invoices
- Make online payments
- Download payment receipts
- View billing history

## Inviting Clients

1. Open the case
2. Click **Invite Client**
3. Enter the client's email
4. Client receives an invitation to create their portal account

## Privacy Controls

You control what clients can see:
- Toggle document visibility
- Set message permissions
- Control billing access`,
    },
    {
      category_id: catMap['client-portal'],
      title: 'Client Communication Best Practices',
      slug: 'client-communication-best-practices',
      summary: 'Tips for effective and secure client communication',
      tags: ['communication', 'messaging', 'client', 'best-practices'],
      content: `# Client Communication Best Practices

Effective communication builds trust and improves case outcomes.

## Using Secure Messaging

Always use Unbind's built-in messaging for case-related communication:
- All messages are encrypted and logged
- Maintains attorney-client privilege
- Creates an audit trail

## Response Time

Set client expectations for response times:
- Acknowledge messages within 24 hours
- Provide substantive responses within 48 hours
- Use auto-responders for out-of-office periods

## Document Requests

When requesting documents from clients:
- Be specific about what's needed
- Set clear deadlines
- Provide examples when possible
- Follow up on overdue requests

## Status Updates

Keep clients informed:
- Send weekly case updates
- Notify of significant developments immediately
- Explain next steps clearly
- Use plain language, avoid legal jargon`,
    },
    {
      category_id: catMap['client-portal'],
      title: 'Managing Client Tasks',
      slug: 'managing-client-tasks',
      summary: 'Assign and track tasks for clients through the portal',
      tags: ['tasks', 'client', 'todo'],
      content: `# Managing Client Tasks

Assign tasks to clients and track their completion through the portal.

## Creating Client Tasks

1. Open the case
2. Go to the **Tasks** tab
3. Click **New Task**
4. Set the task title and description
5. Assign to the client
6. Set a due date
7. Click **Create**

## Task Types

Common client tasks include:
- **Document upload** — Request specific documents
- **Form completion** — Financial affidavits, questionnaires
- **Review** — Review draft documents
- **Approval** — Approve settlements or agreements
- **Payment** — Pay outstanding invoices

## Tracking Progress

Monitor client task completion from:
- The case dashboard
- The tasks overview page
- Automated reminder notifications

## Reminders

Unbind sends automatic reminders:
- When a task is assigned
- 3 days before the due date
- On the due date
- When overdue`,
    },
    // Account Settings
    {
      category_id: catMap['account-settings'],
      title: 'Profile Settings',
      slug: 'profile-settings',
      summary: 'Manage your personal profile and preferences',
      tags: ['profile', 'settings', 'account'],
      content: `# Profile Settings

Customize your Unbind profile and preferences.

## Personal Information

Update your profile at **Settings** → **Profile**:
- Full name
- Email address
- Phone number
- Profile photo
- Bar number and jurisdiction
- Bio/description

## Notification Preferences

Control how you receive notifications:
- **Email** — Case updates, messages, deadlines
- **In-app** — Dashboard notifications
- **Push** — Mobile notifications (PWA)

Configure notification frequency:
- Real-time
- Hourly digest
- Daily digest

## Security

Manage your account security:
- Change password
- Enable two-factor authentication
- View login history
- Manage connected devices

## Display Preferences

Customize your experience:
- Date format
- Time zone
- Default calendar view
- Dashboard layout`,
    },
    {
      category_id: catMap['account-settings'],
      title: 'Firm Settings',
      slug: 'firm-settings',
      summary: 'Configure firm-wide settings and branding',
      tags: ['firm', 'settings', 'branding', 'admin'],
      content: `# Firm Settings

Configure settings that apply to your entire firm.

## Firm Profile

Update firm information at **Settings** → **Firm**:
- Firm name and address
- Phone and fax numbers
- Website URL
- Firm logo (used on invoices and documents)

## Billing Configuration

Set firm-wide billing defaults:
- Default hourly rates by role
- Invoice templates
- Payment terms
- Trust account settings

## User Management

Manage team members:
- Invite new members
- Set roles and permissions
- Deactivate accounts
- View activity logs

## Integrations

Connect third-party services:
- Stripe for payments
- Google Calendar for events
- Email for notifications

## Data Management

- Export firm data
- Configure data retention
- Manage storage usage`,
    },
    {
      category_id: catMap['account-settings'],
      title: 'Two-Factor Authentication',
      slug: 'two-factor-authentication',
      summary: 'Set up 2FA for additional account security',
      tags: ['security', '2fa', 'authentication'],
      content: `# Two-Factor Authentication

Add an extra layer of security to your Unbind account.

## Why Use 2FA?

Two-factor authentication protects your account even if your password is compromised. This is especially important for accounts with access to sensitive legal data.

## Setting Up 2FA

1. Go to **Settings** → **Security**
2. Click **Enable Two-Factor Authentication**
3. Choose your method:
   - **Authenticator App** (recommended) — Google Authenticator, Authy, etc.
   - **SMS** — Text message codes
4. Scan the QR code with your authenticator app
5. Enter the verification code
6. Save your recovery codes in a secure location

## Recovery Codes

When you enable 2FA, you'll receive recovery codes. These are one-time use codes that let you access your account if you lose your authentication device.

**Important:** Store recovery codes securely. They cannot be regenerated.

## Disabling 2FA

To disable 2FA:
1. Go to **Settings** → **Security**
2. Click **Disable Two-Factor Authentication**
3. Enter your current 2FA code to confirm`,
    },
  ]

  for (const article of articles) {
    if (!article.category_id) {
      console.error(`  Skipping ${article.slug}: no category found`)
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('help_articles')
      .upsert(
        {
          ...article,
          is_published: true,
          view_count: Math.floor(Math.random() * 100),
          helpful_count: Math.floor(Math.random() * 20),
          not_helpful_count: Math.floor(Math.random() * 3),
        },
        { onConflict: 'slug' }
      )

    if (error) console.error(`  Error seeding article ${article.slug}:`, error.message)
    else console.log(`  ✓ ${article.title}`)
  }
}

async function seedFAQs() {
  console.log('\nSeeding FAQs...')

  const faqs = [
    { question: 'What is Unbind?', answer: 'Unbind is a cloud-based divorce collaboration platform designed for family law attorneys and their clients. It provides case management, document management, billing, messaging, e-filing, and AI-powered tools to streamline the divorce process.', category: 'general', sort_order: 1 },
    { question: 'Is my data secure on Unbind?', answer: 'Yes. We use bank-level encryption (AES-256 at rest, TLS 1.3 in transit), row-level security policies, and strict access controls. We are pursuing SOC 2 Type II certification. Attorney-client privilege is maintained at all times.', category: 'general', sort_order: 2 },
    { question: 'How much does Unbind cost?', answer: 'Unbind offers flexible pricing based on firm size and usage. We offer monthly and annual subscription plans. Contact us at sales@unbind.law for current pricing or sign up for a free trial.', category: 'billing', sort_order: 3 },
    { question: 'Can clients access the platform?', answer: 'Yes! Each client gets secure portal access where they can view case progress, upload documents, communicate with their attorney, review invoices, and make payments. Clients only see information that their attorney has made visible.', category: 'general', sort_order: 4 },
    { question: 'Which states support e-filing?', answer: 'Unbind supports e-filing in courts across all 50 states. Filing requirements, accepted formats, and fee schedules vary by jurisdiction. Check the e-filing section for your specific court\'s requirements.', category: 'general', sort_order: 5 },
    { question: 'How does AI document analysis work?', answer: 'Our AI analyzes uploaded documents to extract key data points such as income, assets, debts, and important dates. The AI processes documents securely — no data is stored by the AI provider or used for training. All results should be reviewed by an attorney.', category: 'documents', sort_order: 6 },
    { question: 'Can I import data from other platforms?', answer: 'Yes, we support data import from common case management platforms. Contact our support team at support@unbind.law for assistance with data migration.', category: 'general', sort_order: 7 },
    { question: 'How do I reset my password?', answer: 'Click "Forgot Password" on the login page and enter your email address. You\'ll receive a password reset link via email. If you don\'t receive the email, check your spam folder or contact support.', category: 'account', sort_order: 8 },
    { question: 'What payment methods do clients have?', answer: 'Clients can pay invoices via credit card (Visa, Mastercard, Amex), debit card, or ACH bank transfer through our Stripe integration. Attorneys can also record offline payments manually.', category: 'billing', sort_order: 9 },
    { question: 'Is there a mobile app?', answer: 'Unbind is built as a Progressive Web App (PWA) that works beautifully on mobile devices. You can install it on your phone\'s home screen for an app-like experience without needing to download from an app store.', category: 'general', sort_order: 10 },
    { question: 'How do I invite team members?', answer: 'Go to Settings → Firm Members and click "Invite Member." Enter their email and select their role (Senior Attorney, Attorney, Paralegal, or Staff). They\'ll receive an email invitation to create their account.', category: 'account', sort_order: 11 },
    { question: 'Can I customize court deadline rules?', answer: 'Unbind comes pre-configured with court deadline rules for each state. Custom deadline rules can be configured by firm administrators. Contact support if you need help with jurisdiction-specific customizations.', category: 'general', sort_order: 12 },
    { question: 'What happens to my data if I cancel?', answer: 'You\'ll have 30 days after cancellation to export all your data. After that period, data is permanently deleted per our retention policy. We recommend exporting important files before cancelling your subscription.', category: 'account', sort_order: 13 },
    { question: 'Does Unbind provide legal advice?', answer: 'No. Unbind is a technology platform — a tool for legal professionals. All legal decisions, advice, and strategies remain the sole responsibility of the attorney. The platform facilitates case management but does not substitute for professional legal judgment.', category: 'general', sort_order: 14 },
    { question: 'How do I contact support?', answer: 'Email us at support@unbind.law for assistance. Our support team is available Monday through Friday, 8 AM to 6 PM Pacific Time. For urgent issues, use the in-app help chat for faster response times.', category: 'general', sort_order: 15 },
  ]

  for (const faq of faqs) {
    const { error } = await supabase
      .from('faqs')
      .insert({ ...faq, is_published: true })

    if (error && error.code !== '23505') {
      console.error(`  Error seeding FAQ: ${error.message}`)
    } else {
      console.log(`  ✓ ${faq.question.substring(0, 50)}...`)
    }
  }
}

async function seedOnboardingChecklists() {
  console.log('\nSeeding onboarding checklists...')

  const attorneyChecklist = [
    { role: 'attorney', step_number: 1, title: 'Complete your profile', description: 'Add your photo, bar number, and contact details', action_url: '/dashboard/settings', is_required: true },
    { role: 'attorney', step_number: 2, title: 'Set up your firm', description: 'Configure firm name, logo, and billing settings', action_url: '/dashboard/settings', is_required: true },
    { role: 'attorney', step_number: 3, title: 'Invite team members', description: 'Add attorneys and staff to your firm', action_url: '/dashboard/settings', is_required: false },
    { role: 'attorney', step_number: 4, title: 'Create your first case', description: 'Set up a divorce case with client details', action_url: '/dashboard/cases', is_required: true },
    { role: 'attorney', step_number: 5, title: 'Upload a document', description: 'Add documents to your case', action_url: '/dashboard/cases', is_required: false },
    { role: 'attorney', step_number: 6, title: 'Connect payment processing', description: 'Link your Stripe account for client payments', action_url: '/dashboard/settings', is_required: false },
    { role: 'attorney', step_number: 7, title: 'Invite a client', description: 'Give your client portal access', action_url: '/dashboard/cases', is_required: false },
  ]

  const clientChecklist = [
    { role: 'client', step_number: 1, title: 'Complete your profile', description: 'Add your name and contact information', action_url: '/client/settings', is_required: true },
    { role: 'client', step_number: 2, title: 'Review your case', description: 'View your case details and current status', action_url: '/client/dashboard', is_required: true },
    { role: 'client', step_number: 3, title: 'Upload requested documents', description: 'Submit any documents your attorney has requested', action_url: '/client/documents', is_required: true },
    { role: 'client', step_number: 4, title: 'Send a message', description: 'Communicate securely with your attorney', action_url: '/client/messages', is_required: false },
    { role: 'client', step_number: 5, title: 'Review billing', description: 'Check your invoices and payment options', action_url: '/client/billing', is_required: false },
  ]

  const allItems = [...attorneyChecklist, ...clientChecklist]

  for (const item of allItems) {
    const { error } = await supabase
      .from('onboarding_checklists')
      .insert(item)

    if (error && error.code !== '23505') {
      console.error(`  Error seeding checklist: ${error.message}`)
    } else {
      console.log(`  ✓ [${item.role}] ${item.title}`)
    }
  }
}

async function seedFeatureTours() {
  console.log('\nSeeding feature tours...')

  const tours = [
    {
      feature_key: 'dashboard',
      title: 'Dashboard Tour',
      description: 'Learn your way around the Unbind dashboard',
      target_roles: ['attorney', 'client'],
      steps: [
        { title: 'Welcome to Unbind', content: 'This is your dashboard — the central hub for managing your practice. Let\'s take a quick tour.', target: '[data-tour="dashboard-header"]', position: 'bottom' },
        { title: 'Cases Overview', content: 'See all your active cases at a glance. Click any case to view details, deadlines, and documents.', target: '[data-tour="cases-section"]', position: 'bottom' },
        { title: 'Quick Actions', content: 'Create new cases, log time entries, or upload documents with one click.', target: '[data-tour="quick-actions"]', position: 'left' },
        { title: 'Notifications', content: 'Stay on top of messages, deadlines, and case updates with real-time notifications.', target: '[data-tour="notifications"]', position: 'bottom' },
      ],
    },
    {
      feature_key: 'case-creation',
      title: 'Creating a Case',
      description: 'How to create and set up a new divorce case',
      target_roles: ['attorney'],
      steps: [
        { title: 'New Case', content: 'Click here to start creating a new case. You\'ll enter client details, case type, and jurisdiction.', target: '[data-tour="new-case-btn"]', position: 'bottom' },
        { title: 'Case Details', content: 'Fill in the client name, opposing party, case type, and filing state. These details can be updated later.', target: '[data-tour="case-form"]', position: 'right' },
        { title: 'Team Assignment', content: 'Assign attorneys and staff to the case. Team members will be notified automatically.', target: '[data-tour="team-assignment"]', position: 'bottom' },
      ],
    },
    {
      feature_key: 'document-upload',
      title: 'Document Upload Tour',
      description: 'How to upload and manage case documents',
      target_roles: ['attorney', 'client'],
      steps: [
        { title: 'Upload Documents', content: 'Drag and drop files here, or click to browse. We support PDF, Word, Excel, and image files.', target: '[data-tour="upload-area"]', position: 'bottom' },
        { title: 'Document Categories', content: 'Documents are automatically organized by category. You can change categories manually if needed.', target: '[data-tour="doc-categories"]', position: 'right' },
        { title: 'AI Analysis', content: 'Click "Analyze" on any financial document to have our AI extract key data points automatically.', target: '[data-tour="analyze-btn"]', position: 'left' },
      ],
    },
  ]

  for (const tour of tours) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('feature_tours')
      .upsert(tour, { onConflict: 'feature_key' })

    if (error) console.error(`  Error seeding tour ${tour.feature_key}:`, error.message)
    else console.log(`  ✓ ${tour.title}`)
  }
}

async function main() {
  console.log('=== Unbind Help Center Seed Script ===\n')

  try {
    await seedCategories()
    await seedArticles()
    await seedFAQs()
    await seedOnboardingChecklists()
    await seedFeatureTours()

    console.log('\n=== Seeding complete! ===')
  } catch (error) {
    console.error('\nSeeding failed:', error)
    process.exit(1)
  }
}

main()
