---
description: Orchestrate work across api/web/db/shared automatically.
applyTo: "**/*"
---

# Orchestrator

## Default workflow (always)
When the user asks to build/change something, follow this sequence:

1) **Triage impacted areas by path**
- `apps/api/**` => API
- `apps/web/**` => Web
- `packages/db/**` or `prisma/schema.prisma` => DB/Prisma
- `packages/shared/**` => Shared types/contracts

2) **Plan first (short, actionable)**
- Requirements restatement
- Files/workspaces impacted
- Risks (auth/session, DB migration, shared contract changes)
- Implementation order (`shared` → `db` → `api` → `web`)
- Test plan (unit/integration + UI states)

3) **Delegate by domain (required)**
- API => subagent: `api-implementer`
- Web => subagent: `web-implementer`
- DB/Prisma => subagent: `db-prisma`
- Shared contracts => subagent: `shared-types-guardian`

4) **Verification gate (required)**
- Always delegate final validation to subagent: `qa-verifier`.

5) **Completion format (required)**
Your final answer must end with:
- **Verification commands**
- **Expected results**
- **Risk notes**

## Guardrails
- **No file may exceed 800 lines.** If a change pushes a file over 800 lines (or the file is already near 800), split into smaller, focused modules by responsibility (e.g., `routes/`, `services/`, `repos/`, `components/`, `composables/`).
- Prefer *small diffs* and *single-responsibility files*. Avoid “god files” and mixed concerns.
- Do not introduce placeholders in critical paths (auth, data validation, DB writes).
---
description: Workspace boundaries, imports, package ownership, and build order for the npm workspaces monorepo.
applyTo: "**/*"
---

# Monorepo boundaries (npm workspaces)

## Ownership & dependency rules
- **Apps**
  - `apps/api`: Node/Express API
  - `apps/web`: Vue 3 frontend
  - Apps may depend on **packages only** (`packages/*`).

- **Packages**
  - `packages/shared`: shared types/constants/DTOs (source of truth for contracts)
  - `packages/db`: Prisma schema/client/migrations and reusable query/repository helpers
  - Packages **must not** depend on apps.

- **Imports**
  - No cross-app imports.
  - Shared contracts go in `packages/shared`.
  - Use workspace package names (e.g. `@antigravity/shared`, `@antigravity/db`).
  - Do not use relative imports across package boundaries.

## Build & change discipline
- **Build order**: `packages/shared` → `packages/db` → `apps/api` / `apps/web`.
- Prefer workspace-targeted commands (`npm -w <workspace> ...`) over running scripts at repo root unless the script is designed to fan out.
- If a change touches `packages/shared`, you must validate both API and Web for type/contract compatibility.

## File size & cohesion
- Keep modules focused and cohesive. If a file approaches 800 lines, split by responsibility (route vs service vs repo vs schema; component vs composable vs view).
---
description: API route structure, validation, logging, and conventions for apps/api (Express + Zod + Prisma).
applyTo: "apps/api/**/*"
---

# API standards (apps/api)

## Routing & structure
- **Base path**: `/api/customer-freight` (or `API_BASE_PATH`). All routes live under this prefix.
- Prefer a layered structure for non-trivial features:
  - `routes/` (Express handlers + Zod validation)
  - `services/` (business logic)
  - `repos/` (DB access via `@antigravity/db`)
- Route handlers must be thin: validate → authorize → call service → return response.

## Auth & authorization
- `req.userSession` is injected by the integration layer. Use it for `id`, `email`, `permissions`.
- Do not implement auth via custom headers in route logic.
- Enforce permissions where applicable (e.g. `customer-freight:access`, `customer-freight:admin`); reject with **403** when missing.

## Validation (Zod)
- Validate **body/query/params** at route entry.
- On validation failure: return **400** with a clear, stable error shape.
- Prefer DTOs/types from `@antigravity/shared` as the contract, and use Zod schemas that match them.

## Responses & errors
- Responses are JSON with consistent shapes.
  - Success: `{ data: ... }`
  - Error: `{ error: { code, message, details? } }`
- Use correct status codes (400/401/403/404/409/422/500).
- No stack traces in production responses.

## Logging & security middleware
- Use `pino` for request-scoped logs (avoid logging secrets/PII).
- Keep `helmet` and `cors` configuration consistent with existing app conventions.

## Health
- `GET /api/customer-freight/health` returns `{ "status": "ok" }`.

## File size
- No file may exceed **800 lines**; split routes/services/repos as needed.
---
description: Vue/frontend structure and conventions for apps/web (Vue 3 + Vite + Pinia + Vue Router + Vue Query + Tailwind).
applyTo: "apps/web/**/*"
---

# Web standards (apps/web)

## Architecture
- Follow existing patterns for views, components, composables, and routing.
- Use shared types/DTOs/constants from `@antigravity/shared` for request/response shapes and enums.

## Data & state
- Server state: prefer TanStack Vue Query.
- UI/local state: prefer component state + composables.
- Global state (Pinia): only when cross-route/shared state is required.

## API usage
- Call backend via `API_URL` / `API_BASE_PATH`.
- Handle loading + error states consistently (skeleton/empty/error).

## i18n
- Do not change translation keys unless explicitly requested.
- Add new keys in the existing style when needed.

## Styling & naming (Tailwind)
- **Do not inline large Tailwind class strings** directly in templates for reusable UI.
  - Avoid: `class="rounded-lg border border-zinc-300 px-3 ..."` on repeated elements.
- Prefer **semantic class names** via one of these patterns (match the codebase style):
  1) Component-level constants (e.g. `const cardClass = "..."`) for one-off pages.
  2) Extract shared UI into components (`<BaseButton/>`, `<Card/>`, `<Input/>`).
  3) Use Tailwind `@layer components` + `@apply` to create semantic utilities (e.g. `.btn`, `.btn-primary`, `.card`, `.field-label`).
- IDs, data-test attributes, and component names must be **meaningful and stable** (e.g. `data-test="load-create-submit"`).

## File size
- No file may exceed **800 lines**; split views/components/composables by responsibility.
---
description: Prisma schema, migrations, and DB access conventions in packages/db.
applyTo: "packages/db/**/*"
---

# DB / Prisma standards (packages/db)

## Schema & migrations
- Prisma schema lives in `packages/db`.
- Prefer additive, backwards-compatible schema changes when possible.
- Generate/apply migrations via the db workspace scripts (e.g. `npm -w @antigravity/db run migrate`).
- Do not hand-edit migration SQL unless necessary; if edited, document why and how to verify.

## Client & access patterns
- Use the exported Prisma client from `@antigravity/db`.
- No raw connection handling in apps; go through the db package.
- Prefer repository/query helpers in `packages/db` for complex/reusable queries; keep API handlers thin.

## Environment
- Use `DATABASE_URL` (Postgres) or `SQLITE_URL` (dev) as applicable.
- Never hardcode credentials.

## File size
- No file may exceed **800 lines**; split schema helpers/repos/queries by responsibility.
---
description: Verification required before marking work complete (run the right checks for the impacted workspaces).
applyTo: "**/*"
---

# Verification

Before claiming work complete:

- Run **type-check**, **lint/format** (if configured), and **relevant tests** for the changed area(s).
- If changes touch `packages/shared`, you must validate **both** `apps/api` and `apps/web` for contract/type compatibility.
- Use the verifier skill (or `qa-verifier` subagent) for a final verification pass.

## Report format (required)
- What was verified (commands)
- What failed (if anything)
- Actionable next steps
- Clear verdict: **Ready to ship** / **Blocked by: ...**

## Minimum edge cases
- Empty inputs
- Invalid data
- Error paths
- Integration points (API ↔ shared DTOs/types ↔ web)
