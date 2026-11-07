# Branch and Module Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist one primary branch and scoped module activation exceptions per existing client, then make the web's effective module access consume them without enabling multi-branch operations.

**Architecture:** Keep `stores.id` as the tenant and subscription boundary. Add an additive primary-branch table and read-only client access to a validated module catalog, scoped activation exceptions and their audit. The web loads the primary branch and exceptions before resolving navigation and route access; no owner-facing mutation is introduced yet.

**Tech Stack:** PostgreSQL 17/Supabase migrations and RLS, React, TypeScript, TanStack Query, Vitest, isolated Docker database tests.

**Spec:** `docs/superpowers/specs/2026-11-04-branch-module-persistence-design.md`

## Global Constraints

- Existing `store_id` remains the tenant identifier in users, sales, inventory, cash and RPCs.
- Existing stores and new stores each receive one primary branch; the store's legacy business fields remain the edit source in this phase.
- All new tables are tenant isolated; authenticated clients may read their rows and cannot write configuration directly.
- Activation records are exceptions to category defaults. A positive activation cannot enable a planned module or bypass its required plan feature.
- Current retail Standard/Pro/Enterprise navigation and operations must retain their effective behavior when no activation rows exist.
- No selector, multi-branch operation, owner activation controls, or schema rewrite of operational tables in this plan.

## Review Focus

- Changing a store's legacy subtype after migration must change the primary branch category; Task 1 tests this.
- A missing primary branch or failed activation read must block module links/routes instead of using the retail fallback; Task 3 tests this.
- A branch activation from another tenant must not be visible or accepted under the current tenant; Tasks 1–2 test this.
- An organization module cannot receive a branch-scoped activation and vice versa; Task 2 tests this.
- A service-role write cannot activate a planned module or an ungranted plan feature; Task 2 tests this.

---

### Task 1: Primary branch persistence and tenant isolation

**Files:**
- Create: `packages/supabase/migrations/20261104010000_primary_branches.sql`
- Create: `packages/supabase/tests/primary-branches.sql`
- Modify: `scripts/test-db.sh`

**Interfaces:**
- Produces `public.branches(id uuid, store_id uuid, name text, category_id text, is_primary boolean, created_at timestamptz, updated_at timestamptz)` with unique `(id,store_id)` and at most one primary per store.
- Produces `public.legacy_store_category(business_type text, industry_sub_type text) returns text` matching `resolveLegacyBusinessProfile`.
- Produces a trigger on `stores` insert and legacy business/name update that creates or synchronizes its primary branch.
- Later tasks consume `branches.id`, `branches.category_id`, and its tenant-scoped SELECT policy.

- [ ] Write SQL behavior tests for backfilled stores A/B, legacy restaurant/supermarket/retail mapping, automatic branch creation, subtype/name resync, foreign-tenant SELECT denial, authenticated INSERT/UPDATE/DELETE denial, and composite tenant identity.
- [ ] Add the test file to `scripts/test-db.sh` after existing regression checks; run `pnpm test:db` and observe failure because `branches` does not exist.
- [ ] Implement the additive migration: constrained category IDs, primary uniqueness, backfill, trigger, RLS SELECT for active tenant or superadmin, no authenticated write policy, and explicit grants.
- [ ] Run `pnpm test:db`; expect all existing and new SQL behavioral checks to pass.
- [ ] Commit migration, test and runner update as `feat(db): add primary branches for existing stores`.

### Task 2: Scoped module activation storage and audit

**Files:**
- Create: `packages/supabase/migrations/20261104020000_module_activations.sql`
- Create: `packages/supabase/tests/module-activations.sql`
- Create: `scripts/module-catalog-expected.mjs`
- Modify: `scripts/test-db.sh`

**Interfaces:**
- Produces `public.module_catalog(id text, scope text, implementation_status text, required_feature text)` seeded from `MODULE_REGISTRY`.
- Produces `public.module_activations(id uuid, store_id uuid, branch_id uuid null, module_id text, enabled boolean, updated_by uuid null, updated_at timestamptz)`, with one exception per organization/module or branch/module.
- Produces `public.module_activation_audit` with old/new values, operation, actor and timestamp.
- Task 3 reads only tenant-visible `module_activations` rows.

- [ ] Write SQL tests for no default exceptions, own-tenant SELECT, foreign-tenant denial, no authenticated writes, composite branch FK, scope validation, planned module denial, plan-feature denial, allowed service-role writes, uniqueness and audit of insert/update/delete.
- [ ] Add the test to `scripts/test-db.sh`; run `pnpm test:db` and observe failure for absent tables.
- [ ] Implement catalog, activations and audit in one additive migration. Validate scope and plan in a BEFORE trigger, use an AFTER trigger for immutable audit, RLS SELECT for current active tenant or superadmin, and no authenticated DML policies.
- [ ] Add a behavioral drift check: `scripts/module-catalog-expected.mjs` imports `MODULE_REGISTRY` through Node's TypeScript stripping and emits a SQL comparison of the actual `module_catalog` rows to the registry's id/scope/status/requiredFeature values. Execute it against the isolated database in `scripts/test-db.sh`; expect the comparison to pass.
- [ ] Run `pnpm test:db`; expect all behavioral checks to pass.
- [ ] Commit as `feat(db): persist scoped module activations with audit`.

### Task 3: Resolve stored branch/category and activation in the web

**Files:**
- Modify: `packages/types/src/commerce.ts`, `packages/types/src/commerce.test.ts`
- Modify: `packages/types/src/access.ts`, `packages/types/src/access.test.ts`
- Modify: `packages/types/src/database.types.ts`
- Create: `apps/web/src/shared/hooks/usePrimaryBranch.ts`
- Create: `apps/web/src/shared/hooks/useModuleActivations.ts`
- Modify: `apps/web/src/shared/hooks/useStoreModules.ts`, `apps/web/src/shared/hooks/useStoreModules.test.tsx`
- Test: `apps/web/src/shared/components/AppSidebar.test.tsx`, `apps/web/src/shared/guards/ModuleGuard.test.tsx`

**Interfaces:**
- `resolveStoredBusinessProfile(categoryId: string | null | undefined): BusinessProfile | null` returns null for unknown categories.
- `resolveStoredModuleActivation(rows: readonly StoredModuleActivation[], branchId: string): ModuleActivation` ignores records outside the module's declared scope.
- `usePrimaryBranch(storeId: string | null)` and `useModuleActivations(storeId: string | null, branchId: string | null)` are tenant-keyed queries; no store/branch ID means disabled query.
- `useStoreModules()` returns the existing interface plus `branchId`, and denies access while branch/activation reads are loading or failed.

- [ ] Write failing domain tests for valid/invalid stored category and scope-aware activation mapping; run the focused Vitest files and observe the expected missing-interface failures.
- [ ] Implement the two pure domain helpers and verify those tests pass.
- [ ] Write failing hook tests: primary branch profile replaces legacy profile, absent exceptions preserve retail links, scoped false disables a module, true cannot bypass a plan feature, missing primary branch and query error block links/routes.
- [ ] Add generated-shape table types, query hooks and `useStoreModules` integration. The query for activations may fetch all tenant rows but the mapper must include only global rows and the selected branch. Existing store name behavior remains.
- [ ] Run focused hook/sidebar/guard tests and `pnpm typecheck`; expect pass.
- [ ] Commit as `feat(web): load persisted branch module access`.

### Task 4: Integrated verification and final review

**Files:** No product-code changes unless a verified finding requires one.

- [ ] Run `pnpm check`, `pnpm test:db` and `git diff --check` on the completed branch; expect zero command failures and no new lint diagnostics.
- [ ] Review the whole diff against the spec, especially direct SQL privileges, branch sync and fail-closed loading. Use one independent final reviewer as agreed with the user.
- [ ] Fix Critical/Important findings using RED→GREEN tests, rerun affected and full gates, then record any deferred minor findings.
- [ ] Keep the branch/worktree for the user's integration decision. Do not start the next phase.
