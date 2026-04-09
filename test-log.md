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
