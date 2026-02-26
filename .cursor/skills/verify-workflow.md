---
name: verify-workflow
description: Verify that completed work is implemented and working. Use after tasks are marked done or when the user asks to verify.
---

# Verify workflow

1. **Scope**: Identify what was claimed complete (features, routes, fixes).
2. **Existence**: Confirm files and code paths exist; no placeholders or TODOs in critical paths.
3. **Build**: Run `npm run build` (or equivalent). Fix type/lint errors.
4. **Tests**: Run test suite for affected areas. Fix failing tests.
5. **Smoke**: If applicable, hit key endpoints or UI flows (e.g. health, login, main feature).
6. **Edge cases**: Consider empty input, invalid data, 403/404. Note gaps.
7. **Report**: Verified ✓, Incomplete/broken ✗, and actionable next steps. End with verdict (Ready to ship / Blocked by: …).

---
name: verify-workflow
description: Perform deterministic, workspace-aware verification of completed work in the monorepo. Enforces file-size limits, contract integrity, and structured reporting.
---

# Verify Workflow (Monorepo Gate)

Use this skill after implementation is claimed complete or when explicitly asked to verify.

This skill is mandatory before marking work as "Ready to ship".

---

# 1. Scope Identification (Required)

Identify exactly what was claimed complete:

- Features
- Routes
- UI flows
- Schema changes
- Refactors

List affected workspaces explicitly:

- `packages/shared`
- `packages/db`
- `apps/api`
- `apps/web`

---

# 2. Implementation Validation

- Confirm files exist.
- Confirm code paths are fully implemented.
- No placeholders in critical paths (auth, validation, DB writes).
- No TODOs in production logic.
- No commented-out temporary logic.

---

# 3. File Structure & Size Enforcement

- No file may exceed **800 lines**.
- If a file exceeds 800 lines, mark as violation and require split by responsibility.
- Detect monolithic components, routes, or services.

---

# 4. Contract Integrity (Critical)

If `packages/shared` was modified:

- Ensure API and Web compile with updated types.
- Confirm no duplicate DTO definitions exist.
- Confirm enums/constants are not redefined locally.
- Detect type drift between shared → api → web.

---

# 5. Styling & Frontend Discipline (If Web Changed)

- No massive inline Tailwind duplication.
- Reusable UI must use:
  - UI primitives OR
  - Semantic Tailwind classes via `@layer components`.
- `data-test` attributes must be meaningful and stable.

---

# 6. Workspace-Aware Verification Commands

Run only what is required based on impact:

## API

```bash
npm -w apps/api run typecheck
npm -w apps/api test
```

## Web

```bash
npm -w apps/web run typecheck
npm -w apps/web run test
```

## Shared

```bash
npm -w packages/shared run build
npm -w apps/api run typecheck
npm -w apps/web run typecheck
```

## DB

```bash
npm -w @antigravity/db run build
```

Fix any failures before proceeding.

---

# 7. Edge Case Review (Minimum Required)

- Empty inputs
- Invalid data (400)
- Unauthorized (401)
- Forbidden (403)
- Not found (404)
- Error paths (500)
- Integration boundaries (API ↔ shared ↔ web)

---

# 8. Required Report Format

The output must follow this structure:

## Scope Verified

## Commands Executed
(list exact commands)

## Failures (if any)

## Required Fixes

## File Size Violations (if any)

## Final Verdict
- Ready to ship
- Blocked by: <reason>

## Risk Notes
(required if schema, contracts, or auth were touched)

---

You must not mark work complete without verification results.