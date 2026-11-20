# Modular Access Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lumen's rigid `business_type -> modules` decision with a tested compatibility foundation that resolves access from family, category, plan, activation and employee permission without changing existing stores or adding unfinished product modules.

**Architecture:** Introduce a pure domain layer in `@lumen-pos/types` for commercial taxonomy, module metadata, plan entitlements and deterministic access decisions. Adapt the current `business_type`, `industry_sub_type`, plan JSON and feature overrides into that layer, then make the web app consume one effective-access API for hooks, guards and navigation. This first plan deliberately keeps the database schema and current retail behavior intact; organization/branch persistence and new vertical modules receive separate plans.

**Tech Stack:** TypeScript 6, React 19, TanStack Query 5, React Router 7, Vitest 5, Testing Library, Supabase/PostgreSQL (read-only compatibility in this phase)

**Spec:** `docs/superpowers/specs/2026-11-03-lumen-modular-platform-design.md`

## Global Constraints

- Preserve the current `standard`, `pro` and `enterprise` plan codes.
- Preserve `BusinessType`, `RetailSubType`, `business_type` and `industry_sub_type` as legacy compatibility inputs during this phase.
- Do not add or alter database tables, RLS policies, Edge Functions, public web APIs, routes for planned modules, or subscription prices in this plan.
- Do not expose modules whose implementation status is `planned`.
- Do not redesign the interface or change current colors, layout or copy beyond access-denial reasons required by this plan.
- A category supplies defaults; an explicit activation may re-add an omitted module only when the plan grants it.
- A commercial override may grant or remove a plan feature; an owner activation must never bypass a missing plan entitlement.
- Missing or malformed legacy values must fall back to the current retail/general behavior, never grant broader access.
- Existing retail stores must retain their current effective modules and plan features after the adapter is introduced.
- No change may delete or rewrite historical tenant data.

## Review Focus

- Unknown or malformed legacy `business_type`/`industry_sub_type` must resolve to retail/general with no extra modules — pinned in Task 1.
- A category omission, organization activation and plan exclusion must follow one deterministic precedence; activation must not bypass the plan — pinned in Task 3.
- Mixed JSON values in plan features and overrides must keep booleans separate from positive integer limits and ignore unsafe values — pinned in Task 3.
- Loading or failed entitlement reads must not flash inaccessible navigation or allow a guarded route — pinned in Tasks 4 and 5.
- Current retail stores on Standard, Pro and Enterprise must receive the same effective access before and after migration — pinned in Task 5.

## Scope Boundary and File Map

This plan is the first independently shippable foundation, not the complete modular-platform migration.

- `packages/types/src/commerce.ts`: canonical family/category vocabulary and legacy profile adapter.
- `packages/types/src/modules.ts`: module IDs, metadata, implementation status, scope and category defaults.
- `packages/types/src/entitlements.ts`: typed parsing and merging of plan features, limits and commercial overrides.
- `packages/types/src/access.ts`: deterministic effective module/feature access resolver and denial reasons.
- `packages/types/src/business.ts`: temporary legacy exports and wrappers backed by the new domain layer.
- `packages/types/src/plans.ts`: existing plan models updated to consume typed entitlement values.
- `apps/web/src/shared/hooks/useStoreEntitlements.ts`: one React-query-backed view of effective plan configuration.
- `apps/web/src/shared/hooks/useStoreModules.ts`: compatibility hook backed by the pure resolver.
- `apps/web/src/shared/guards/ModuleGuard.tsx` and `PlanGuard.tsx`: direct-route enforcement using the same decisions as navigation.
- `apps/web/src/shared/components/AppSidebar.tsx`: module and permission visibility using resolved access.
- Existing feature consumers: replace local `{ ...planFeatures, ...overrides }` merges with the shared entitlement hook.

The next plans, in order, will cover: organization/branch schema and RLS; administrative family/category/module activation; vertical modules by family; and the optional public-commerce API.

---

### Task 1: Canonical Commercial Taxonomy and Legacy Adapter

**Files:**
- Create: `packages/types/src/commerce.ts`
- Create: `packages/types/src/commerce.test.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: legacy `BusinessType` and `RetailSubType` from `packages/types/src/business.ts`.
- Produces: `BusinessFamilyId`, `BusinessCategoryId`, `BusinessProfile`, `BusinessFamilyDefinition`, `BusinessCategoryDefinition`, `BUSINESS_FAMILIES`, `BUSINESS_CATEGORIES`, `getBusinessCategory(categoryId)`, and `resolveLegacyBusinessProfile(businessType, industrySubType)`.
- Exact family IDs: `retail`, `gastronomy`, `services`, `wholesale`; hybrid operation is module composition, not a fifth persisted family ID.
- Exact category IDs:
  - Retail: `comercio_general`, `minimarket_abarrotes`, `ropa_calzado`, `ferreteria_construccion`, `farmacia_belleza`, `libreria_papeleria`, `tecnologia_celulares`, `repuestos`, `tienda_mascotas`.
  - Gastronomy: `restaurante_tradicional`, `cafeteria`, `bar`, `panaderia`, `comida_rapida`, `dark_kitchen`.
  - Services: `barberia_belleza`, `lavanderia`, `taller`, `servicio_tecnico`.
  - Wholesale: `mayorista_general`, `distribuidor`.
- Exact current compatibility mappings: `tienda_articulos` uses its valid retail subtype; `supermercado` maps to `retail/minimarket_abarrotes`; `restaurante` maps to `gastronomy/restaurante_tradicional`; unknown inputs map to `retail/comercio_general`.

- [ ] **Step 1: Write taxonomy tests that initially fail**

Add cases named:

```ts
it('maps every current retail subtype to the retail family')
it('maps legacy supermercado to retail/minimarket_abarrotes')
it('maps legacy restaurante to gastronomy/restaurante_tradicional')
it('falls back safely for unknown legacy values')
it('declares each category under exactly one family')
```

Assert the exact mappings above and assert that the fallback never selects a category outside `retail`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run packages/types/src/commerce.test.ts`

Expected: FAIL because `commerce.ts` and its exports do not exist.

- [ ] **Step 3: Implement the taxonomy types and lookup tables**

In `packages/types/src/commerce.ts`, define:

```ts
export type BusinessFamilyId = 'retail' | 'gastronomy' | 'services' | 'wholesale'

export interface BusinessProfile {
  familyId: BusinessFamilyId
  categoryId: BusinessCategoryId
}

export function resolveLegacyBusinessProfile(
  businessType: BusinessType | string | null | undefined,
  industrySubType?: RetailSubType | string | null,
): BusinessProfile
```

Include the categories approved in the spec. Keep display names/descriptions in the definitions, but do not attach plan or module logic to this file.

- [ ] **Step 4: Export the taxonomy and verify GREEN**

Modify `packages/types/src/index.ts`, then run:

`pnpm exec vitest run packages/types/src/commerce.test.ts`

Expected: all Task 1 cases PASS.

- [ ] **Step 5: Commit the taxonomy**

```bash
git add packages/types/src/commerce.ts packages/types/src/commerce.test.ts packages/types/src/index.ts
git commit -m "feat(types): add commercial family and category taxonomy"
```

---

### Task 2: Module Registry, Scope and Category Composition

**Files:**
- Create: `packages/types/src/modules.ts`
- Create: `packages/types/src/modules.test.ts`
- Modify: `packages/types/src/business.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: `BusinessCategoryId` from Task 1 and the current `ModuleId`, `ModuleDefinition`, `ALL_MODULES` behavior from `business.ts`.
- Produces: `ModuleId`, `ModuleScope = 'organization' | 'branch'`, `ModuleImplementationStatus = 'available' | 'planned'`, `ModuleDefinition`, `MODULE_REGISTRY`, `CATEGORY_MODULE_DEFAULTS`, `getDefaultModuleIds(categoryId)`, `getAvailableModuleDefinitions(categoryId)`, and legacy wrappers in `business.ts`.
- `ModuleDefinition` must include `scope`, `implementationStatus`, `path`, and optional `requiredFeature`.
- Exact available IDs for this phase: `dashboard`, `pos`, `inventory`, `customers`, `analytics`, `staff`, `settings`.
- Exact planned IDs: `cash`, `orders`, `purchases`, `online_commerce`, `delivery`, `credit`, `loyalty`, `multi_branch`, `integrations`, `agenda`, `work_orders`, `kitchen`, `recipes`, `tables`, `scales`, `quotes`.
- Existing implemented modules retain their current IDs and paths. Planned definitions use `path: null`, and no planned module may be returned by `getAvailableModuleDefinitions`.

- [ ] **Step 1: Write failing module-composition tests**

Add cases named:

```ts
it('includes tables for restaurante_tradicional')
it('omits tables for dark_kitchen while retaining kitchen and recipes')
it('keeps online commerce optional for dark_kitchen')
it('omits inventory from the default barberia_belleza composition')
it('allows taller to default to inventory and work orders')
it('never returns planned modules as available navigation modules')
it('keeps legacy retail modules identical to the current BUSINESS_MODULES behavior')
```

The final case must compare the legacy `tienda_articulos` result against `dashboard`, `pos`, `inventory`, `customers`, `analytics`, `staff`, and `settings` in the same order.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run packages/types/src/modules.test.ts`

Expected: FAIL because the module registry does not exist.

- [ ] **Step 3: Implement the registry and category defaults**

Move the canonical module definitions out of `business.ts` into `modules.ts`. Mark only routes that currently exist and work as `available`; future modules remain `planned` even if a placeholder ID already existed.

Category defaults may contain planned IDs so the product model is explicit, but `getAvailableModuleDefinitions` must filter them.

- [ ] **Step 4: Convert `business.ts` into a compatibility facade**

Keep these exports callable during the migration:

```ts
getModulesForBusinessType(businessType: BusinessType): ModuleDefinition[]
isModuleAllowedForBusinessType(businessType: BusinessType, moduleId: ModuleId): boolean
isModuleAccessible(input: LegacyModuleAccessInput): boolean
```

Back them with `resolveLegacyBusinessProfile` and the new registry. Do not change current call-site behavior yet.

- [ ] **Step 5: Run taxonomy and module tests**

Run: `pnpm exec vitest run packages/types/src/commerce.test.ts packages/types/src/modules.test.ts`

Expected: all tests PASS, including the legacy retail equivalence case.

- [ ] **Step 6: Commit the registry**

```bash
git add packages/types/src/modules.ts packages/types/src/modules.test.ts packages/types/src/business.ts packages/types/src/index.ts
git commit -m "refactor(types): model category module composition"
```

---

### Task 3: Typed Entitlements and Deterministic Access Resolver

**Files:**
- Create: `packages/types/src/entitlements.ts`
- Create: `packages/types/src/entitlements.test.ts`
- Create: `packages/types/src/access.ts`
- Create: `packages/types/src/access.test.ts`
- Modify: `packages/types/src/plans.ts`
- Modify: `packages/types/src/index.ts`

**Interfaces:**
- Consumes: `BusinessProfile`, `ModuleId`, `MODULE_REGISTRY`, and category defaults from Tasks 1–2.
- Produces:

```ts
export type PlanFeatureKey = string
export type PlanLimitKey =
  | 'max_products'
  | 'max_users'
  | 'max_cash_registers'
  | 'max_branches'
  | 'max_storage_mb'

export interface EffectiveEntitlements {
  features: Readonly<Record<string, boolean>>
  limits: Readonly<Partial<Record<PlanLimitKey, number>>>
}

export function resolveEntitlements(
  planValues?: Record<string, unknown> | null,
  commercialOverrides?: Record<string, unknown> | null,
): EffectiveEntitlements

export type ModuleActivation = Partial<Record<ModuleId, boolean>>
export type ModuleAccessReason =
  | 'allowed'
  | 'not_available_yet'
  | 'plan_disabled'
  | 'category_disabled'
  | 'organization_disabled'
  | 'permission_denied'

export interface ModuleAccessResult {
  allowed: boolean
  reason: ModuleAccessReason
  module: ModuleDefinition
}

export function resolveModuleAccess(input: {
  profile: BusinessProfile
  moduleId: ModuleId
  entitlements: EffectiveEntitlements
  activation?: ModuleActivation
  permissionGranted?: boolean
}): ModuleAccessResult
```

- Precedence: planned status blocks first; required plan feature blocks second; explicit activation `false` blocks third; category membership or explicit activation `true` decides applicability fourth; permission blocks fifth; otherwise access is allowed.
- An activation of `true` may restore a category-omitted module, but cannot bypass `requiredFeature: false`.

- [ ] **Step 1: Write failing entitlement parser tests**

Add cases named:

```ts
it('merges boolean features and positive integer limits by override precedence')
it('lets an explicit false commercial override remove a plan feature')
it('ignores negative fractional non-finite and wrong-type limits')
it('does not coerce truthy strings into enabled features')
```

Assert, for example, that `{ advanced_analytics: true, max_users: 2 }` overridden by `{ advanced_analytics: false, max_users: 6 }` produces `false` and `6` in their separate maps.

- [ ] **Step 2: Write failing access-precedence tests**

Add cases named:

```ts
it('blocks a planned module even when activated')
it('blocks a required plan feature before category activation')
it('lets activation restore a category-omitted module when the plan grants it')
it('lets explicit false activation disable a category-default module')
it('returns permission_denied only after module entitlement succeeds')
it('allows the current retail core modules without new activation data')
```

- [ ] **Step 3: Run both focused tests and verify RED**

Run: `pnpm exec vitest run packages/types/src/entitlements.test.ts packages/types/src/access.test.ts`

Expected: FAIL because the resolver files do not exist.

- [ ] **Step 4: Implement typed parsing and access resolution**

Implement only the signatures and precedence above. Preserve unknown boolean feature keys for forward compatibility; accept only positive integers for recognized limit keys.

Update `plans.ts` to replace `Record<string, any>` in plan/override fields with `Record<string, unknown>` or the new typed aliases where compatible. Keep `getEffectiveFeatures` as a deprecated wrapper if existing admin code still imports it.

- [ ] **Step 5: Run all package-domain tests**

Run:

`pnpm exec vitest run packages/types/src/commerce.test.ts packages/types/src/modules.test.ts packages/types/src/entitlements.test.ts packages/types/src/access.test.ts`

Expected: all tests PASS.

- [ ] **Step 6: Commit the resolver**

```bash
git add packages/types/src/entitlements.ts packages/types/src/entitlements.test.ts packages/types/src/access.ts packages/types/src/access.test.ts packages/types/src/plans.ts packages/types/src/index.ts
git commit -m "feat(types): resolve modular plan access deterministically"
```

---

### Task 4: Web Entitlement Hooks and Legacy Store Adaptation

**Files:**
- Create: `apps/web/src/shared/hooks/useStoreEntitlements.ts`
- Create: `apps/web/src/shared/hooks/useStoreEntitlements.test.tsx`
- Create: `apps/web/src/shared/hooks/useStoreModules.test.tsx`
- Modify: `apps/web/src/shared/hooks/useStorePlan.ts`
- Modify: `apps/web/src/shared/hooks/useStoreModules.ts`
- Modify: `apps/web/src/shared/hooks/useRetailSubrubro.ts`

**Interfaces:**
- Consumes: `resolveLegacyBusinessProfile`, `resolveEntitlements`, `resolveModuleAccess`, `useStoreId`, and `useStorePlan`.
- Produces:

```ts
export interface StoreEntitlementsState {
  profile: BusinessProfile
  entitlements: EffectiveEntitlements
  planName: string
  isFeatureEnabled(feature: string): boolean
  getLimit(limit: PlanLimitKey): number | null
  isLoading: boolean
  error: Error | null
}

export function useStoreEntitlements(): StoreEntitlementsState
```

- `useStoreModules()` must expose `profile`, `availableModules`, `getModuleAccess(moduleId)`, `canAccessModule(moduleId)`, and the existing store metadata. Keep `businessType` temporarily for compatibility; remove `isModuleAllowedInBusinessType` from new consumers.
- No database column is added: the hook derives `profile` from current store fields and uses an empty activation map.

- [ ] **Step 1: Write failing hook tests**

Mock `useStoreId` and `useStorePlan`; add cases named:

```ts
it('derives a canonical profile from the current store fields')
it('merges plan values and commercial overrides once')
it('exposes boolean features separately from numeric limits')
it('uses the safe retail/general fallback when store data is malformed')
it('keeps loading true until both tenant and plan reads finish')
it('returns only implemented accessible modules')
```

- [ ] **Step 2: Run the hook tests and verify RED**

Run: `pnpm exec vitest run apps/web/src/shared/hooks/useStoreEntitlements.test.tsx apps/web/src/shared/hooks/useStoreModules.test.tsx`

Expected: FAIL because the new hook and return contract do not exist.

- [ ] **Step 3: Implement `useStoreEntitlements`**

Read plan/store data once through the existing query cache, normalize the legacy profile, and return the typed entitlement accessors. Do not duplicate merge logic in this hook.

- [ ] **Step 4: Rebuild `useStoreModules` on the resolver**

Call `getModuleAccess` for each registered module, filter to `allowed`, and preserve the currently configured commercial store name. An absent activation record means category defaults, not all modules enabled.

- [ ] **Step 5: Preserve the retail-specific hook as a compatibility adapter**

`useRetailSubrubro` must continue returning the existing retail configuration for current screens. For non-retail derived profiles, return `comercio_general` until a later vertical-specific hook replaces it.

- [ ] **Step 6: Run hooks and domain tests**

Run: `pnpm exec vitest run packages/types/src/*.test.ts apps/web/src/shared/hooks/useStoreEntitlements.test.tsx apps/web/src/shared/hooks/useStoreModules.test.tsx`

Expected: all selected tests PASS.

- [ ] **Step 7: Commit the web adapters**

```bash
git add apps/web/src/shared/hooks/useStoreEntitlements.ts apps/web/src/shared/hooks/useStoreEntitlements.test.tsx apps/web/src/shared/hooks/useStoreModules.ts apps/web/src/shared/hooks/useStoreModules.test.tsx apps/web/src/shared/hooks/useStorePlan.ts apps/web/src/shared/hooks/useRetailSubrubro.ts
git commit -m "refactor(web): derive modules from effective store access"
```

---

### Task 5: Centralize Existing Feature and Limit Consumers

**Files:**
- Modify: `apps/web/src/shared/guards/PlanGuard.tsx`
- Modify: `apps/web/src/shared/components/NavigationHeader.tsx`
- Modify: `apps/web/src/features/settings/components/PlanLimitsSection.tsx`
- Modify: `apps/web/src/features/inventory/PhysicalCountPage.tsx`
- Modify: `apps/web/src/features/inventory/components/InventoryDrawer.tsx`
- Modify: `apps/web/src/features/inventory/components/ProductTable.tsx`
- Modify: `apps/web/src/features/staff/StaffPage.tsx`
- Modify: `apps/web/src/features/pos/PosPage.tsx`
- Modify: `apps/web/src/features/pos/components/CheckoutModal.tsx`
- Create: `apps/web/src/shared/guards/PlanGuard.test.tsx`

**Interfaces:**
- Consumes: `useStoreEntitlements()` from Task 4.
- Produces: no new public interface; removes local feature-merge behavior from web feature consumers.
- Admin editing screens continue reading raw plan/override values because they must display and edit provenance, not only effective values.

- [ ] **Step 1: Write failing `PlanGuard` behavior tests**

Mock `useStoreEntitlements`; add cases named:

```ts
it('renders children only when the effective feature is enabled')
it('renders the plan restriction when an override explicitly disables the feature')
it('renders a loading screen without children while entitlements load')
it('renders a restriction without children when entitlement loading fails')
```

- [ ] **Step 2: Run the guard test and verify RED**

Run: `pnpm exec vitest run apps/web/src/shared/guards/PlanGuard.test.tsx`

Expected: at least the error-state case FAILS because `PlanGuard` currently merges raw JSON itself and has no normalized error state.

- [ ] **Step 3: Convert `PlanGuard` to the shared hook**

Use `isFeatureEnabled(feature)`, `planName`, `isLoading`, and `error`. Do not read Supabase or merge objects inside the guard.

- [ ] **Step 4: Replace every current web-side raw plan merge**

For each listed component, replace casts and `{ ...planFeatures, ...overrides }` with `isFeatureEnabled` or `getLimit`. Preserve its visible behavior and existing loading handling.

- [ ] **Step 5: Prove no duplicate merge remains in web product code**

Run:

`rg -n "\.\.\.planFeatures|\.\.\.overrides|feature_overrides as Record<string, (boolean|any)>" apps/web/src`

Expected: no manual effective-feature merge in `apps/web/src`; raw provenance reads are permitted only in admin code.

- [ ] **Step 6: Run focused and existing affected tests**

Run:

`pnpm exec vitest run apps/web/src/shared/guards/PlanGuard.test.tsx apps/web/src/features/inventory/services/inventoryService.test.ts apps/web/src/features/staff/services/staffService.test.ts apps/web/src/features/pos/hooks/useCreateSale.test.tsx`

Expected: all selected tests PASS.

- [ ] **Step 7: Commit centralized entitlement consumption**

```bash
git add apps/web/src/shared/guards/PlanGuard.tsx apps/web/src/shared/guards/PlanGuard.test.tsx apps/web/src/shared/components/NavigationHeader.tsx apps/web/src/features/settings/components/PlanLimitsSection.tsx apps/web/src/features/inventory/PhysicalCountPage.tsx apps/web/src/features/inventory/components/InventoryDrawer.tsx apps/web/src/features/inventory/components/ProductTable.tsx apps/web/src/features/staff/StaffPage.tsx apps/web/src/features/pos/PosPage.tsx apps/web/src/features/pos/components/CheckoutModal.tsx
git commit -m "refactor(web): centralize effective plan entitlements"
```

---

### Task 6: Align Route Guards and Navigation With One Access Decision

**Files:**
- Modify: `apps/web/src/shared/guards/ModuleGuard.tsx`
- Modify: `apps/web/src/shared/components/AppSidebar.tsx`
- Create: `apps/web/src/shared/guards/ModuleGuard.test.tsx`
- Create: `apps/web/src/shared/components/AppSidebar.test.tsx`
- Modify: `apps/web/src/app/router/AppRoutes.tsx` only if a current route is missing its existing module guard; do not add new routes.

**Interfaces:**
- Consumes: `getModuleAccess`, `canAccessModule`, `ModuleAccessReason`, and existing `useCurrentUserRole` permissions.
- Produces: consistent direct-route and navigation behavior with denial messages selected from the resolver reason.
- Reason copy: `plan_disabled` uses the current plan restriction; `category_disabled`/`organization_disabled` explain that the module is not active for this operation; `not_available_yet` must never produce a navigation link; `permission_denied` remains owned by `RoleGuard`.

- [ ] **Step 1: Write failing module-guard tests**

Mock `useStoreModules`; add cases named:

```ts
it('renders children for an allowed module')
it('renders the plan restriction for plan_disabled')
it('renders the inactive-module restriction for category_disabled')
it('never renders children while module access is loading or failed')
```

- [ ] **Step 2: Write failing sidebar consistency tests**

Render with `MemoryRouter`; add cases named:

```ts
it('shows only modules allowed by both effective access and role permission')
it('hides settings when the settings module is disabled even if the role has permission')
it('does not flash inaccessible links while access is loading')
it('keeps current retail Standard navigation unchanged after resolution')
it('adds analytics for current retail Pro when advanced_analytics is enabled')
```

- [ ] **Step 3: Run the focused UI tests and verify RED**

Run: `pnpm exec vitest run apps/web/src/shared/guards/ModuleGuard.test.tsx apps/web/src/shared/components/AppSidebar.test.tsx`

Expected: sidebar settings/loading cases FAIL under the current implementation.

- [ ] **Step 4: Update `ModuleGuard` to render from `ModuleAccessReason`**

Remove `BUSINESS_TYPES` and `isModuleAllowedInBusinessType` usage. Read one access result from `getModuleAccess(module)` and render children only for `allowed`.

- [ ] **Step 5: Update sidebar filtering**

Require resolved module access and role permission for every link, including settings. During loading or errors, render no actionable module links rather than optimistic links.

- [ ] **Step 6: Audit all current routes for matching module and role guards**

Inspect `AppRoutes.tsx`. Preserve public auth/docs routes and redirects. Add only missing guards for already-existing modules; do not generate routes dynamically or add planned pages.

- [ ] **Step 7: Run the complete verification suite**

Run, in order:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm test:db
```

Expected: every command exits `0`; the lint ratchet introduces no new violations; SQL tests confirm this frontend/domain refactor did not alter database behavior.

- [ ] **Step 8: Inspect compatibility and diff hygiene**

Run:

```bash
git diff --check
rg -n "getModulesForBusinessType|isModuleAllowedForBusinessType" apps/web/src
```

Expected: no whitespace errors and no web runtime consumer of the legacy access functions.

- [ ] **Step 9: Commit the effective-access integration**

```bash
git add apps/web/src/shared/guards/ModuleGuard.tsx apps/web/src/shared/guards/ModuleGuard.test.tsx apps/web/src/shared/components/AppSidebar.tsx apps/web/src/shared/components/AppSidebar.test.tsx apps/web/src/app/router/AppRoutes.tsx
git commit -m "refactor(web): align navigation and module guards"
```

## Completion Boundary

This plan is complete when current stores behave identically under the compatibility adapter, all module/feature decisions pass through the new pure resolver, planned modules remain hidden, and the full repository verification suite passes.

Completion does **not** mean that Lumen already supports multiple persisted branches, category editing, owner module activation, restaurants, services, wholesale, or public websites. Those are subsequent independently testable plans built on this foundation.
