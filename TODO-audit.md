# TODO/FIXME Audit

> Generated: 2026-04-09

## app/api/intakes/[id]/submit/route.ts

- **Line 143**: `// TODO: Send notification to attorney if invited_by is set`
  - Priority: **MEDIUM** — Attorneys don't get notified when a client submits an intake

- **Line 144**: `// TODO: Create notification for case dashboard`
  - Priority: **MEDIUM** — Submitted intakes don't appear as dashboard notifications

## app/api/intakes/[id]/request-info/route.ts

- **Line 54**: `// TODO: Send email notification to client`
  - Priority: **MEDIUM** — Clients aren't emailed when attorney requests additional info during intake

## app/api/intakes/[id]/approve/route.ts

- **Line 162**: `// TODO: Send notifications`
  - Priority: **MEDIUM** — Neither client nor attorney get notified when a case is approved/created from intake

## components/billing/ExpenseForm.tsx

- **Line 48**: `// TODO: Upload receipt file to Supabase Storage if present`
  - Priority: **MEDIUM** — Expense receipt file upload is non-functional

## lib/ai/document-classifier.ts

- **Line 7**: `// TODO for Session 4:` (GPT-4 Vision API integration)
  - Priority: **LOW** — Deferred AI enhancement; filename-based classification works as fallback

- **Line 131**: `// TODO: Future AI Enhancement (Session 4)`
  - Priority: **LOW** — AI-based document analysis placeholder

- **Line 150**: `// TODO: Implement in Session 4`
  - Priority: **LOW** — Falls back to filename-based classification

---

## Summary

- **Total items**: 8
- **High priority**: 0
- **Medium priority**: 5
- **Low priority**: 3
