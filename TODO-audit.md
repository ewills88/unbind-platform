# TODO/FIXME Audit

> Generated: 2026-04-08

## app/api/intakes/[id]/submit/route.ts

- **Line 143**: `// TODO: Send notification to attorney if invited_by is set`
  - Priority: **MEDIUM** — Impacts case workflow notifications when attorney is invited

- **Line 144**: `// TODO: Create notification for case dashboard`
  - Priority: **MEDIUM** — Impacts case management dashboard visibility

## app/api/intakes/[id]/request-info/route.ts

- **Line 54**: `// TODO: Send email notification to client`
  - Priority: **MEDIUM** — Clients need notification when additional info is requested during intake

## app/api/intakes/[id]/approve/route.ts

- **Line 162**: `// TODO: Send notifications`
  - Priority: **MEDIUM** — Blocks client and attorney notification upon case approval

## components/billing/ExpenseForm.tsx

- **Line 48**: `// TODO: Upload receipt file to Supabase Storage if present`
  - Priority: **MEDIUM** — Blocks expense receipt storage functionality

## lib/ai/document-classifier.ts

- **Line 7**: `// TODO for Session 4:` (GPT-4 Vision integration)
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
