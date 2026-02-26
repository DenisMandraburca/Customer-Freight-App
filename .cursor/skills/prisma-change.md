---
name: prisma-change
description: Implement Prisma schema/migration changes in packages/db with backwards-compatible discipline, monorepo verification, and clear deliverables.
---

# Prisma Change (packages/db)

Use this skill when adding/modifying Prisma models, fields, relations, indexes, or migrations.

---

# 1. Scope & Intent (Required)

Before editing, state:
- What you are changing (model/field/index)
- Why (feature need, performance, data correctness)
- Whether this is **backwards compatible**

Prefer additive, backwards-compatible changes.

---

# 2. Schema Update

- Edit the Prisma schema in `packages/db` only.
- Follow existing naming conventions and relation patterns.
- Add indexes intentionally (justify query pattern).

If the project uses multiple dialects (Postgres prod, SQLite dev/test), ensure compatibility only if the repo is configured for both.

---

# 3. Migration Discipline

- Generate migrations using the repository’s workspace scripts.
- Do **not** invent commands.
- Do not hand-edit migration SQL unless necessary.

If hand-editing is required (e.g., data backfill):
- Explain what changed
- Explain why generation was insufficient
- Provide verification steps

Avoid destructive migrations (drop/rename) unless explicitly requested.

---

# 4. Client & Exports

- Ensure Prisma client is regenerated where required.
- Ensure `@antigravity/db` exports the client and any new types/helpers.

---

# 5. Repository/Query Layer

- Add/update repo/query helpers in `packages/db` for complex or reusable access.
- Do not move business rules or permission checks into DB layer.

---

# 6. Environment

- Document any new env vars (e.g., `DATABASE_URL`, `SQLITE_URL`).
- Never hardcode credentials.

---

# 7. File Size Enforcement

- No file may exceed **800 lines**.
- If approaching 800 lines, split by responsibility:
  - `repos/`
  - `queries/`
  - `helpers/`

---

# 8. Required Deliverables (Always Include)

1. Short plan
2. Schema diff summary (models/fields/relations/indexes)
3. Migration notes:
   - backwards compatible? (yes/no)
   - data backfill required? (yes/no)
   - locking/large table risk? (yes/no)
4. Contract impact (does this require `packages/shared` updates?)
5. Affected callers (API/Web)
6. Verification commands
7. Risk notes

---

# 9. Verification (Monorepo-aware)

At minimum (DB workspace):

```bash
npm -w @antigravity/db run build
```

If shared/contracts or app callers are impacted:

```bash
npm -w packages/shared run build
npm -w apps/api run typecheck
npm -w apps/web run typecheck
```

Do not mark complete without verification results.
