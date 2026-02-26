---
name: plan-workflow
description: Break down features or tasks into ordered steps, identify dependencies, and produce an actionable plan. Use when starting a feature, refactor, or multi-step task.
---

# Plan workflow

1. **Clarify scope**: What is in scope and out of scope? Inputs, outputs, constraints.
2. **Identify areas**: Which packages/apps are affected (api, web, db, shared)?
3. **Order steps**: Dependencies first (e.g. shared types → DB → API → web). No step should assume work that comes later.
4. **List deliverables**: Files to add/change, routes, types, tests.
5. **Risks and edge cases**: What can break? Permissions, empty data, errors.
6. **Output**: Bulleted or numbered plan the agent (or user) can execute step-by-step. Get approval only when scope is ambiguous; otherwise execute.

---
name: plan-workflow
description: Produce a deterministic, dependency-aware implementation plan for features, refactors, or multi-step tasks in the monorepo. Enforces ordering, risk analysis, file-size discipline, and verification gates.
---

# Plan Workflow (Monorepo-Oriented)

This skill defines the REQUIRED structure for planning any non-trivial change.

It must be used before implementation when:
- Multiple workspaces are affected
- Schema/contracts change
- New routes + UI are introduced
- Refactors span multiple files

---

# 1. Scope Definition (Mandatory)

Clearly define:

- What is IN scope
- What is OUT of scope
- Inputs (user input, API payloads, DB models)
- Outputs (responses, UI changes, side effects)
- Constraints (permissions, performance, backwards compatibility)

Only request clarification if scope is ambiguous.
If scope is clear → proceed.

---

# 2. Impacted Workspaces

Explicitly list which areas are affected:

- `packages/shared`
- `packages/db`
- `apps/api`
- `apps/web`

If shared is touched, explicitly state that both API and Web must be validated.

---

# 3. Dependency-First Execution Order

Always plan in this order:

1. Shared contracts
2. Database schema/migrations
3. API routes/services
4. Web views/components

No step may depend on work that comes later.

---

# 4. File Structure & Size Awareness

For each planned file change:

- Identify file path
- Identify file responsibility
- Confirm no file will exceed **800 lines**
- If risk of exceeding 800 lines → pre-plan file splits

Avoid monolithic files in the plan.

---

# 5. Deliverables (Concrete Outputs)

List specific deliverables:

- Files to create/modify
- Routes to add/change
- DTOs/types to update
- Migrations (if any)
- Tests required
- UI components involved

Deliverables must be actionable and explicit.

---

# 6. Risk & Edge Case Analysis

Minimum required review:

- Permission failures (401/403)
- Validation failures (400)
- Not found (404)
- Empty states
- Error paths
- Contract drift risk (shared ↔ api ↔ web)
- Migration/backfill risk (if DB touched)

---

# 7. Verification Strategy (Required Section)

Define which commands must be run after implementation.

Examples:

If API only:

```bash
npm -w apps/api run typecheck
npm -w apps/api test
```

If Web only:

```bash
npm -w apps/web run typecheck
npm -w apps/web test
```

If Shared touched:

```bash
npm -w packages/shared run build
npm -w apps/api run typecheck
npm -w apps/web run typecheck
```

If DB touched:

```bash
npm -w @antigravity/db run build
```

---

# 8. Delegation Awareness

When used by the Orchestrator:

- Identify which subagents should execute which steps
- Clearly mark boundaries between DB/API/Web responsibilities

Example:

- Step 1 → shared-types-guardian
- Step 2 → db-prisma
- Step 3 → api-implementer
- Step 4 → web-implementer
- Final → qa-verifier

---

# Required Output Format

The plan must be structured as:

## Scope

## Impacted Workspaces

## Execution Order

## Deliverables

## Risks

## Verification Commands

No vague planning. No missing sections.

This skill ensures deterministic execution, dependency correctness, and structural discipline across the monorepo.