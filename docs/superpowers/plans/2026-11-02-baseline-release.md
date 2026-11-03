# Lumen POS Baseline Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the stabilized dirty checkout into a reproducible, reviewable Git baseline and prove it in local and GitHub CI without publishing to production.

**Architecture:** Preserve the current application and its test-backed stabilization. Separate local AI-tool payloads and generated Supabase state from product source, commit the baseline on `codex/stabilization-baseline`, verify it from Git, then push a pull request so GitHub runs the repository CI. Production-only gates that require store hardware or deployment credentials stay explicit and cannot be represented as passing automation.

**Tech Stack:** Git, GitHub CLI/Actions, pnpm, Turbo, Vitest, Supabase CLI, PostgreSQL 17/Docker.

**Spec:** `docs/superpowers/specs/2026-11-02-stabilization-design.md`

## Global Constraints

- Preserve all product source, migrations, user plans, design references and prior work.
- Do not commit secrets, `.env.local`, generated builds, dependency trees, Supabase CLI state or duplicated tool installations.
- Do not reset the database or rewrite already-applied migrations.
- Use branch `codex/stabilization-baseline` from `main`; no force push and no production deployment.
- Keep the 132-error/5-warning lint debt visible and ratcheted; do not expand the baseline.
- Hardware validation and production deployment require their real targets and must remain unclaimed until supplied.

## Review Focus

- Ignored local tooling must remain on disk while disappearing from Git status.
- Secret scanning must cover every file staged for commit, including generated examples and CI configuration.
- The committed tree must reproduce typecheck, tests, lint ratchet, builds and isolated SQL checks.
- The branch must contain the complete product snapshot, including untracked migrations and application modules, without transient Supabase state.
- GitHub CI must run against the exact pushed commit; a local result cannot substitute for the remote check.

---

### Task 1: Repository hygiene and staging boundary

**Files:**
- Modify: `.gitignore`
- Remove from tracking: `packages/supabase/.temp/cli-latest`
- Preserve locally but ignore: tool payload directories, `.impeccable`, `apps/web/.impeccable`

**Interfaces:**
- Produces: a deterministic staged-file boundary with product and documentation files only.

- [x] Add precise ignore rules for duplicated AI-tool packages, Impeccable run state and Supabase CLI temp state.
- [x] Remove the tracked Supabase CLI version marker from the index while retaining the local generated file.
- [x] Inventory remaining untracked files and verify that source, designs, plans and `.github/workflows/ci.yml` remain eligible.
- [x] Scan all candidate staged files for service-role keys, private keys and GitHub/OpenAI tokens; require zero matches.

### Task 2: Create the reviewable baseline commits

**Files:**
- Commit: application, SQL, types, assets and product plans.
- Commit: regression tests, CI/tooling and stabilization documentation.

**Interfaces:**
- Produces: branch `codex/stabilization-baseline` with understandable commits based on `main`.

- [x] Create the branch without altering working files.
- [x] Commit the current product/application snapshot and its database history.
- [x] Commit verification infrastructure, CI workflow and stabilization records.
- [x] Verify `git status` contains no untracked product files and inspect all commit summaries.

### Task 3: Fresh verification from the committed tree

**Files:**
- Verify: committed repository only; do not edit migrations during verification.

**Interfaces:**
- Consumes: committed baseline from Task 2.
- Produces: fresh evidence tied to the final commit SHA.

- [x] Run `pnpm install --frozen-lockfile --offline`.
- [x] Run `pnpm check` and require typecheck, all Vitest tests, lint ratchet and both builds to pass.
- [x] Run `pnpm test:db` and require all PostgreSQL assertions/concurrency probes to pass.
- [x] Run `git diff --check`, tracked secret scan and ensure only ignored local files remain.

### Task 4: GitHub CI and baseline handoff

**Files:**
- Remote: branch and pull request against `main`.
- Tag after integration: `stabilization-baseline-2026-11-02`.

**Interfaces:**
- Consumes: final verified commit SHA and authenticated GitHub CLI.
- Produces: remote CI evidence and a merge-ready review surface.

- [ ] Authenticate GitHub CLI if the existing token is invalid; this is the only required user-operated credential step.
- [ ] Push `codex/stabilization-baseline` and open a pull request against `main` with validation evidence and explicit limits.
- [ ] Wait for GitHub Actions frontend/database jobs and require both to pass; fix only reproducible repository failures.
- [ ] Preserve the branch/PR for review. Create the baseline tag only on the integrated `main` commit, never before merge.

### Task 5: Production-readiness gates

**Files:**
- Modify: `docs/STABILIZATION.md`
- Modify: `docs/superpowers/stabilization-ledger.md`

**Interfaces:**
- Produces: an exact boundary between verified development baseline and unverified production operations.

- [x] Record browser/manual, backup/restore, monitoring, performance, printer/scanner and deployment gates.
- [x] Execute local backup/restore and browser smoke checks when the local stack supports them without changing preserved data.
- [x] Record hardware validation as pending until the printer/scanner is physically connected.
- [x] Record production deployment/monitoring as pending until a staging or production target and credentials are supplied.

## Self-review

- Spec coverage: repository safety, verification, SQL isolation, review and limits are assigned to Tasks 1–5.
- Step scan: each step produces one inspectable repository, test, or GitHub result.
- Type consistency: branch, tag and command names are identical throughout.
- Review focus: every listed failure mode is checked by Tasks 1, 3 or 4.
- Proportion: this plan changes release hygiene and evidence only; it adds no product feature or architecture rewrite.
