# Web Structure Phase One Implementation Plan

> **For agentic workers:** Execute task by task with TDD and verification.

**Goal:** Establish neutral folder boundaries in `apps/web` while preserving existing routes and behavior.

**Architecture:** Keep the current application and SQL contracts. Move the application shell and access guards into their ownership folders, move Customers into `modules`, and move the existing multi-family dashboard into `areas/legacy`. The remaining `features` folders migrate in later phases.

**Tech Stack:** React, TypeScript, Vite, Vitest, Supabase.

**Spec:** `docs/superpowers/specs/2026-11-07-general-platform-restructuring-draft.md`

## Global Constraints

- Do not edit `apps/admin`.
- Do not change route URLs, access rules, SQL or user-visible behavior.
- Do not implement multisucursal or module add-ons.
- Preserve existing Commerce flows.

## Review Focus

- Protected routes continue enforcing module, plan and role checks.
- Existing navigation retains the same links and visibility.
- Customer page and service keep tenant filtering and history.
- Direct imports in `core` do not pull business modules into it; legacy dependencies through shared hooks remain for later phases.
- Web build and full test suite pass after moves.

---

### Task 1: Establish architecture folders and move shell/guards

**Files:** `apps/web/src/app/router/AppRoutes.tsx`, `apps/web/src/app/shell/*`, `apps/web/src/core/access/guards/*`, `apps/web/src/features/inventory/components/BarcodeLabelModal.tsx`, and relocated existing tests.

**Interfaces:** `AppLayout`, `AppSidebar`, `NavigationHeader`, `ModuleGuard`, `PlanGuard`, `RoleGuard` preserve their existing props and exports.

- [x] Use the existing sidebar and guard tests as behavior characterization; no new behavior is introduced.
- [x] Move files and adjust relative imports. Preserve props and exports.
- [x] Run focused tests: 13/13 passed; typecheck passed at this point.

### Task 2: Move Customers into modules

**Files:** `apps/web/src/features/customers/**`, `apps/web/src/modules/customers/**`, `apps/web/src/app/router/AppRoutes.tsx`, and three POS consumers.

**Interfaces:** `CustomersPage` and customer service exports remain the same; route `/customers` remains protected by `customers:view`.

- [x] Move Customers files, update import paths, and expose the page and consumed hooks through `index.ts`.
- [x] Run typecheck; it identified three old POS imports. Update those consumers to the public module entry.
- [x] Run the full regression suite in Task 3.

### Task 3: Transitional area dashboard boundary

**Files:** `apps/web/src/areas/legacy/**`, `apps/web/src/app/router/AppRoutes.tsx`, and the relocated dashboard test.

**Interfaces:** `/` still renders the existing multi-family dashboard through the legacy area entry; area boundaries do not import `apps/admin`.

- [x] Move dashboard files and existing test into `areas/legacy`; route imports the new public entry.
- [x] Focused tests: 21/21 passed.
- [x] Run `pnpm check`: typecheck, 161/161 tests, lint baseline and builds passed.
- [x] Repeat the Web build with non-sensitive placeholder Supabase settings; full 1.2 MB bundle built successfully. The first worktree build lacked local environment variables and produced a reduced bundle.
- [x] Confirm the diff has no `apps/admin` changes or SQL changes.
- [x] Commit phase-one structure after final review of staged paths.

## Final verification

`VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=baseline-placeholder pnpm check` exited 0: typecheck, 161 tests in 31 files, lint baseline with no new diagnostics, and complete Web/Admin builds. The placeholders were only process environment values for the build and are not stored in the repository.

## Execution ruling

The changes in this phase are mechanical relocations with unchanged public behavior. Existing behavior tests were retained and run at the new locations. New tests that assert file names or folder paths would only mirror this refactor, so they are omitted. TDD red/green resumes for each new behavior in later phases.

`areas/legacy` temporarily imports the existing POS and inventory implementations from `features`; those slices move under `modules` in the Commerce consolidation phase. The guards temporarily use the existing store hooks. The neutral access model belongs to phase 2/3.
