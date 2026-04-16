# Test Log

- 2026-04-08T20:44 — 12 test files, 130 tests passing (vitest v4.0.18)
- 2026-04-08T21:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)

### 2026-04-08T22:27 — 11 of 12 test files FAILING

**Failing tests:** All 11 test files except tests/security/auth.test.ts (7 tests passed there).

**Error (same for all 11):**
```
Error: Failed to resolve import "@/..." from "tests/..."  Does the file exist?
```

**Affected files:**
- tests/integration/health.test.ts — cannot resolve @/app/api/health/route
- tests/integration/metrics.test.ts — cannot resolve @/app/api/metrics/route
- tests/components/InvoiceGenerator.test.tsx — cannot resolve @/components/billing/InvoiceGenerator
- tests/components/TaskCard.test.tsx — cannot resolve @/components/billing/TaskCard
- tests/components/VirtualList.test.tsx — cannot resolve @/components/dashboard/VirtualList
- tests/unit/lib/dates.test.ts — cannot resolve @/lib/dates
- tests/unit/lib/permissions.test.ts — cannot resolve @/lib/permissions
- tests/unit/lib/validations.test.ts — cannot resolve @/lib/validations
- tests/unit/services/cacheService.test.ts — cannot resolve @/lib/cache/cacheService
- tests/unit/services/notificationService.test.ts — cannot resolve @/lib/portal/notificationService
- tests/unit/services/taskService.test.ts — cannot resolve @/lib/portal/taskService

**Root cause:**
In commit `386e80d` (Vercel deployment prep), `tsconfig.json` `exclude` was expanded to include
`"tests"`, `"**/*.test.ts"`, `"**/*.test.tsx"` to prevent TypeScript OOM during `npm run build`.
Vitest uses `vite-tsconfig-paths` plugin which reads `tsconfig.json` for `@/*` path alias resolution.
With tests excluded from tsconfig, the path alias `@/*` no longer resolves from within test files.
The `.next` directory was also deleted during the build, removing any cached module resolution.

tests/security/auth.test.ts still passes because it doesn't import any `@/...` paths — it only
uses relative imports and built-in mocks.

**Proposed fix:**
Create a separate `tsconfig.test.json` that extends `tsconfig.json` but does NOT exclude tests,
then point vitest at it. In `vitest.config.ts`, change the tsconfigPaths plugin:

```ts
// vitest.config.ts — change line 6:
plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
```

```json
// tsconfig.test.json (new file):
{
  "extends": "./tsconfig.json",
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "out", "dist", "e2e"]
}
```

This keeps the build-time OOM fix (tests excluded from production tsconfig) while restoring
path resolution for Vitest. No source code changes needed — only config files.

**Fix applied:** tsconfig.test.json created, vitest.config.ts updated. All 130 tests passing again.

- 2026-04-08T22:34 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-08T23:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T00:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T01:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T03:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T04:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T05:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T09:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T11:13 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T13:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T17:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T21:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T22:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-09T23:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T01:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T03:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T04:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T09:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T13:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T17:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T21:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T22:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-10T23:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T01:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T03:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T04:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T09:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T13:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T17:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T21:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T22:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-11T23:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T01:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T03:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T04:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T07:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T09:12 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T13:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T15:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T17:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T21:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T22:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-12T23:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T01:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T03:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T04:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T09:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T13:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T17:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T21:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T22:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-13T23:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T01:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T03:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T04:12 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T09:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T13:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T17:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T19:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T20:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T21:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T22:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-14T23:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T00:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T01:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T02:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T03:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T04:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T05:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T06:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T07:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T08:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T09:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T10:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T11:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T12:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T13:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T14:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T15:10 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T16:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T17:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T18:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T19:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T20:11 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
- 2026-04-15T21:11 — 1 test failed (transient), re-run at 21:23 passed all 130
- 2026-04-15T21:23 — ✅ all tests passing (12 files, 130 tests, vitest v4.0.18)
