# Server Modular Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce persisted module access on SQL writes, RPCs, sensitive reads, and `manage-staff` while preserving authorized history and the current single-branch retail POS.

**Architecture:** SQL owns the runtime decision from the existing tenant, primary branch, module catalog, category defaults, plan, activation, subscription, and fixed role permissions. Direct table writes use existing guards, `SECURITY DEFINER` RPCs use explicit checks, RLS protects reads, and the service-role Edge Function verifies the caller through a user-scoped RPC before mutation. Category and role matrices are mirrored in SQL and checked against TypeScript.

**Tech Stack:** PostgreSQL 17, Supabase/PostgREST and Edge Functions, TypeScript, Vitest, pnpm, Docker-backed SQL tests.

**Spec:** `docs/superpowers/specs/2026-11-05-server-modular-authorization-design.md`

## Global Constraints

- Keep `stores.id` as tenant boundary and use only the primary branch; no client-supplied operational `branch_id`.
- Preserve migration history; add corrective migrations dated after `20261104020000`.
- No activation UI, branch selector, multi-branch operations, or new public module.
- A positive activation cannot override plan, implementation status, or role; missing branch or conflicting configuration fails closed.
- Historical financial records remain readable by authorized active users after deactivation or subscription expiry. New writes require valid subscription, except the precise closeout and idempotent replay cases in the spec.
- Keep current product, sale, stock, user-limit, audit, and tenant invariants. Test red before green; commit each independently verified task.
- Final review with Antigravity is required before integration. If unavailable, report the missing gate and stop before integration.

## Review Focus

1. A planned or unknown module must deny access even with a forged positive activation — Task 1 test `unknown_or_planned_module_denied`.
2. An old permissive RLS policy must not grant a cashier access to another person's cash amounts — Task 4 test `cashier_cannot_read_other_register_amounts`.
3. A disabled module must not allow a dated offline sale that has no existing idempotency key — Task 3 test `new_offline_sale_denied_after_disable`.
4. Failed authorization in `manage-staff` must leave Auth and profiles untouched — Task 5 test `denied_staff_action_has_no_side_effects`.
5. A sale and an activation change racing at the same tenant must have a defined order — Task 6 test `activation_change_serializes_with_sale`.

## File Map

- `packages/supabase/migrations/20261105010000_module_access_core.sql`: SQL default/role matrices, access helpers, privileges, and activation synchronization.
- `packages/supabase/migrations/20261105020000_module_write_guards.sql`: direct table write and closeout checks.
- `packages/supabase/migrations/20261105030000_module_rpc_guards.sql`: guarded public RPC entry points, private original bodies, and obsolete-overload revocation.
- `packages/supabase/migrations/20261105040000_module_read_policies.sql`: replacement read RLS and narrow open-register notice RPC.
- `packages/supabase/tests/module-authorization.sql`: isolated fixture and behavioral assertions. `scripts/test-db.sh` loads it after `module-activations.sql` and before concurrency tests.
- `packages/supabase/tests/module-authorization-concurrency.sh`: activation/write race, invoked by `scripts/test-db.sh` after the existing concurrency suite.
- `scripts/module-catalog-expected.mjs`: TypeScript/SQL parity for module catalog, category defaults, and role permissions.
- `packages/supabase/functions/manage-staff/handler.ts` and `packages/supabase/functions/identity.test.ts`: caller-scoped module check before service-role mutation.
- `apps/web/src/features/pos/services/posService.ts` and `posService.test.ts`: consume the minimal register notice without exposing another cashier's register.

---

### Task 1: SQL access core and matrix parity

**Files:** Create `packages/supabase/migrations/20261105010000_module_access_core.sql`; modify `scripts/module-catalog-expected.mjs`, `scripts/test-db.sh`; create `packages/supabase/tests/module-authorization.sql`.

**Interfaces:** Produce `public.has_store_permission(p_permission text) returns boolean`, `public.is_active_module(p_module_id text) returns boolean`, `public.require_active_module(p_module_id text,p_permission text) returns uuid`, and `public.require_closeout_permission() returns uuid`. The last two return the caller's tenant or raise `42501`. `is_active_module` requires a current subscription; historical RLS uses `has_store_permission` instead. `require_active_module` locks the tenant `stores` row `FOR SHARE` before reading activation; `validate_module_activation` serializes changes with the same row `FOR UPDATE`. Revoke direct matrix reads and constrain function execution to `authenticated`/internal callers.

- [ ] Write SQL tests `default_retail_pos_allowed`, `explicit_disable_denied`, `positive_category_override_allowed`, `standard_plan_cannot_gain_analytics`, `unknown_or_planned_module_denied`, `inactive_or_foreign_tenant_denied`, `missing_primary_branch_denied`, `expired_subscription_denies_write`, and `closeout_ignores_expiry_but_requires_active_role`. Use a fresh third tenant fixture so earlier activation and concurrency tests keep their data.
- [ ] Run `pnpm test:db`; confirm the new tests fail because the helper/matrices do not exist.
- [ ] Add normalized `category_module_defaults(category_id,module_id)` and `role_permissions(role,permission)` and populate from the approved TypeScript matrices. Resolve the branch-scoped activation against the primary branch and organization-scoped activation against `store_id`; use `module_catalog.required_feature` and `store_features`. Lock before write checks; prevent a concurrent activation update/delete from passing the locked store row. Keep read helpers stable and fail closed.
- [ ] Extend `scripts/module-catalog-expected.mjs` to assert exact sets and values for all three SQL matrices; run `pnpm test:db` and require every SQL assertion and concurrency baseline to pass.
- [ ] Commit as `feat(access): add SQL module decision core`.

### Task 2: Direct table writes and safe closeout

**Files:** Create `packages/supabase/migrations/20261105020000_module_write_guards.sql`; extend `packages/supabase/tests/module-authorization.sql`.

**Interfaces:** Consume `require_active_module` and `require_closeout_permission` from Task 1. Keep `require_store_role` for existing role, subscription, and feature-specific checks. Update `guard_business_write`, `guard_profile_write`, and `guard_store_write`; do not weaken protected columns, tenant checks, or transactional-only tables.

- [ ] Add failing tests `disabled_inventory_blocks_direct_product_variant_supplier_writes`, `disabled_inventory_blocks_purchase_orders_even_with_feature`, `disabled_customers_blocks_direct_mutation`, `disabled_staff_blocks_profile_mutation`, `disabled_settings_blocks_store_and_settings_mutation`, `disabled_pos_blocks_open_and_cash_movement`, `closeout_allows_only_existing_open_own_or_supervised_register`, and `pos_sale_stock_side_effect_does_not_require_inventory_activation`. Include foreign tenant, inactive identity, and wrong-role probes for every path.
- [ ] Run `pnpm test:db`; confirm the new direct-write tests fail on existing permissive behavior.
- [ ] Wire each existing trigger branch to its module and permission. Treat purchases as `inventory` plus `purchase_orders`; cash as `pos` plus `pos:manage_cash`. For an open-to-closed register transition, invoke the closeout helper and preserve the current field whitelist; all other writes require active access. Keep POS-owned stock movement inside its authorized transaction.
- [ ] Run `pnpm test:db`; require all new and baseline SQL assertions to pass.
- [ ] Commit as `feat(access): guard direct business writes`.

### Task 3: Guard every tenant RPC without cloning business logic

**Files:** Create `packages/supabase/migrations/20261105030000_module_rpc_guards.sql`; extend `packages/supabase/tests/module-authorization.sql`.

**Interfaces:** Consume Task 1 helpers. Keep public RPC names and signatures: `create_sale(uuid,text,jsonb,uuid,numeric,jsonb,text,text,timestamptz)`, `refund_sale(uuid,text,uuid)`, `receive_purchase_order(uuid)`, `adjust_variant_stock(uuid,numeric,text,text)`, `create_product_with_variant(jsonb,jsonb)`, `get_store_analytics(timestamptz,timestamptz)`, and `check_duplicate_customer(uuid,text,text,uuid)`. Rename existing implementations to private names, revoke their public/authenticated execution, and use thin `SECURITY DEFINER` public wrappers with fixed `search_path`; verify old signatures cannot be called.

- [ ] Add failing tests `disabled_pos_blocks_sale_and_refund`, `new_offline_sale_denied_after_disable`, `same_author_existing_key_returns_same_sale_after_disable_or_expiry`, `different_author_or_register_cannot_replay`, `disabled_inventory_blocks_adjust_product_create_and_receipt`, `disabled_customers_blocks_duplicate_rpc`, `disabled_analytics_or_plan_blocks_report`, `unknown_legacy_overload_not_executable`, and `authorized_retail_rpc_preserves_totals_stock_and_audit`.
- [ ] Run `pnpm test:db`; confirm the new RPC access tests fail while previously valid transactions still pass.
- [ ] Add the wrappers. For `create_sale`, check an existing idempotency key under tenant and original author/register before the active-module check; only the existing-row return may bypass expiry/deactivation. A new key still enters the original transactional body after module authorization. Map sale/refund to POS, receipt/product/adjustment to inventory, duplicate lookup to customers, and analytics to analytics plus its existing plan feature. Preserve admin force-close as the separate MFA-gated admin operation.
- [ ] Run `pnpm test:db`; require the RPC tests and existing money/concurrency checks to pass.
- [ ] Commit as `feat(access): enforce modules at RPC boundary`.

### Task 4: Sensitive reads and narrow register notice

**Files:** Create `packages/supabase/migrations/20261105040000_module_read_policies.sql`; extend `packages/supabase/tests/module-authorization.sql`; modify `apps/web/src/features/pos/services/posService.ts`, `apps/web/src/features/pos/services/posService.test.ts`.

**Interfaces:** Consume `has_store_permission` and `is_active_module` from Task 1. Produce `public.get_open_register_notice() returns table(id uuid,opened_by_name text)`, available only to an active user with POS cash permission in their own tenant. Preserve `is_super_admin()` plus MFA for its existing explicit cross-tenant inspection path.

- [ ] Add failing SQL tests for the spec's table-to-permission matrix, including `cashier_cannot_read_other_register_amounts`, `authorized_history_survives_module_and_subscription_pause`, `customer_metrics_is_invoker_only_and_anon_denied`, `stock_clerk_cannot_read_customer_or_sales_data`, `pos_can_read_catalog_when_inventory_off`, `foreign_tenant_history_is_hidden`, and `old_permissive_policy_does_not_override_denial`. Add a Vitest case asserting the single-register notice does not fetch another cashier's amounts or profile.
- [ ] Run `pnpm test:db` and `pnpm exec vitest run apps/web/src/features/pos/services/posService.test.ts`; confirm the new assertions fail.
- [ ] Replace old permissive SELECT policies rather than add OR policies. Implement the exact read matrix in the spec; retain same-tenant history for active permitted roles after deactivation/expiry. Revoke `anon` on `customer_metrics`. Add the narrow register notice RPC and update POS service's single-register query to use it while own-register queries retain normal RLS.
- [ ] Run `pnpm test:db` and the POS service Vitest file; require the new tests and existing read flows to pass.
- [ ] Commit as `feat(access): scope sensitive reads and cash notice`.

### Task 5: Bind `manage-staff` to the caller's module permission

**Files:** Modify `packages/supabase/functions/manage-staff/handler.ts`, `packages/supabase/functions/identity.test.ts`.

**Interfaces:** A user-scoped Supabase client using the request token calls `require_active_module('staff','staff:manage')` before any `supabaseAdmin.auth.admin` or profile mutation. The service-role client remains for authorized mutations. Superadmin with verified MFA takes the existing explicit admin path; tenant from the request body is never trusted for a normal caller.

- [ ] Add failing Vitest cases `denied_staff_action_has_no_side_effects` for create, invite, role/status change, reset, and delete; `db_authorization_error_fails_closed`, `foreign_store_id_is_ignored`, `superadmin_mfa_path_remains_separate`, and `authorized_owner_admin_keep_existing_role_limit_rules`.
- [ ] Run `pnpm exec vitest run packages/supabase/functions/identity.test.ts`; confirm the new tests fail before any service-role side effects.
- [ ] Add the user-scoped RPC authorization before target lookup/mutation. Return 403 on denial and fail closed on database/network error. Keep existing identity, MFA, tenant-membership, protected-role, user-limit, and rollback behavior.
- [ ] Run the identity test file and `pnpm typecheck`; require both to pass.
- [ ] Commit as `feat(access): authorize staff edge operations`.

### Task 6: Race, local integration, and final review

**Files:** Create `packages/supabase/tests/module-authorization-concurrency.sh`; modify `scripts/test-db.sh`; extend `packages/supabase/tests/module-authorization.sql` only if the race exposes a missing invariant.

**Interfaces:** Use the store-row lock from Task 1. The new race test creates an isolated tenant/session, holds an authorized sale transaction, attempts `module_activations` disable concurrently, and asserts the change waits; a sale started after disable fails without new sale, payment, or stock movement.

- [ ] Write `activation_change_serializes_with_sale` as a failing concurrency test and wire it into `scripts/test-db.sh`.
- [ ] Run `pnpm test:db`; confirm the new race assertion fails if synchronization is absent and passes only when the lock order is correct. Fix the smallest violating boundary if needed.
- [ ] Run `pnpm test:db` and `pnpm check` fresh. If Supabase local and a private status file exist, run `pnpm test:api:auth /ruta/privada/status.json`; otherwise record it as not run, never as passing. Do not print or commit that file.
- [ ] Review the complete diff and test evidence with Antigravity, fix findings, then rerun affected checks. If Antigravity is unavailable, stop before integration and report that gate. Confirm no activation UI or multi-branch operation entered the diff.
- [ ] Commit any race/review fixes as `test(access): verify module activation races` (omit an empty commit), then hand the branch back for integration review.

**Closure note (2026-11-05):** The user explicitly waived the Antigravity review after the CLI could not produce a report. This gate is waived, not passed. The race test and implementation commits are complete; finish with fresh verification and preserve the branch for subsequent work.
