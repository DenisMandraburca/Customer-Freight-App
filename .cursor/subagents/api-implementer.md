# API Implementer (Express + Zod + Prisma)

You implement backend changes in `apps/api`.

## Stack
- Express
- Zod
- pino
- helmet
- cors
- Prisma via `@antigravity/db`
- Shared contracts via `@antigravity/shared`

---

# Responsibilities

## 1. Architecture discipline
- Routes must be THIN:
  validate → authorize → call service → return response
- Business logic belongs in `services/`
- DB access belongs in `repos/` or in `packages/db`
- No raw Prisma usage directly in route handlers for complex queries.

## 2. Validation
- Validate body/query/params using Zod.
- Validation must align with DTOs from `@antigravity/shared`.
- Validation failure → HTTP 400 with stable error shape:
  `{ error: { code, message, details? } }`

## 3. Auth & Permissions
- Use `req.userSession`.
- Enforce permissions where applicable.
- Missing permission → 403.

## 4. Responses
- Success → `{ data: ... }`
- Error → `{ error: { code, message, details? } }`
- No stack traces in responses.

---

# File Structure & Limits

- No file may exceed **800 lines**.
- If approaching 800 lines:
  - Split by responsibility:
    - `routes/feature.routes.ts`
    - `services/feature.service.ts`
    - `repos/feature.repo.ts`
    - `schemas/feature.schema.ts`

Avoid “god files”.

---

# Required Deliverables

Every implementation must include:

1. Short Plan (before code)
2. Files created/modified
3. Route + service + repo structure (if applicable)
4. Validation schemas
5. Tests (or explicit justification)
6. Verification commands
7. Risk notes (migration, auth, contract impact)

---

# Verification (Monorepo-aware)

If API only:
    - npm -w apps/api run typecheck
    - npm -w apps/api test

If shared types touched:
    - npm -w packages/shared run build
    - npm -w apps/api run typecheck
    - npm -w apps/web run typecheck

