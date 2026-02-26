---
name: api-route-zod
description: Add or change API routes with Zod validation for body/query. Use when implementing or updating API endpoints in apps/api.
---

# API route + Zod

1. **Route**: Place under the correct router and base path (`/api/customer-freight/...`). Use existing router structure.
2. **Schema**: Define Zod schema(s) for body and/or query. Export if reused. Use shared types from `@antigravity/shared` where applicable.
3. **Validate**: Call `schema.parse()` or `schema.safeParse()` at handler entry. On failure, return 400 with `{ error: string }` or structured validation errors.
4. **Handler**: Use `req.userSession` for auth. Call db/repository from `@antigravity/db`. Return JSON with consistent shape (e.g. `{ data }`).
5. **Errors**: Map known errors to 4xx (404, 403); unknown to 500. No stack in response.
6. **Tests**: Add or update route tests (e.g. success, validation failure, auth failure).

---
name: api-route-zod
description: Implement or modify Express API routes with strict Zod validation, thin-route architecture, shared DTO alignment, and structured error handling.
---

# API Route + Zod Skill (apps/api)

This skill defines the REQUIRED structure when creating or modifying API endpoints.

---

# 1. Architectural Pattern (Mandatory)

Routes must be THIN and follow this order:

1. Validate input (Zod)
2. Authorize (permissions via `req.userSession`)
3. Call service layer
4. Return structured response

Do NOT:
- Put business logic inside route handlers
- Perform complex Prisma queries directly in routes
- Duplicate validation logic across files

If logic becomes non-trivial, split into:
- `routes/<feature>.routes.ts`
- `services/<feature>.service.ts`
- `repos/<feature>.repo.ts` (or move reusable logic to `packages/db`)

---

# 2. Zod Validation Standards

## Schema Placement
- Define schemas close to the route or in `schemas/` folder if reused.
- Align schemas with DTOs from `@antigravity/shared`.
- Never redefine DTO structures locally if they exist in shared.

## Validation Execution
- Use `schema.safeParse()` for controlled error handling.
- On validation failure:
  - Return HTTP 400
  - Response shape must be:

```ts
{ 
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid request data",
    details?: ...
  }
}
```

Do not return raw Zod error objects.

---

# 3. Authorization

- Use `req.userSession`.
- Enforce permission checks when applicable.
- Missing permission → 403.
- Missing authentication → 401.

No custom header-based auth logic.

---

# 4. Response Standards

Success:

```ts
{ data: ... }
```

Error:

```ts
{ error: { code, message, details? } }
```

Rules:
- No stack traces in production responses.
- Map known domain errors to 4xx.
- Unexpected errors → 500.

---

# 5. Logging

- Use `pino` request logger.
- Do NOT log sensitive information.
- Log at appropriate levels (info, warn, error).

---

# 6. File Size Enforcement

- No file may exceed **800 lines**.
- If approaching 800 lines, split by responsibility.
- Avoid route files that contain multiple unrelated features.

---

# 7. Required Tests

Every new or modified route must include:

Minimum test coverage:
- Success case
- Validation failure
- Auth failure (if applicable)
- Permission failure (if applicable)
- Not found (if applicable)

Tests must verify response structure consistency.

---

# 8. Required Deliverables (Always Include)

When this skill is used, the agent must output:

1. Short plan
2. Files created/modified
3. Validation schema summary
4. Authorization logic explanation
5. Verification commands
6. Risk notes (contract impact, migration impact, permission risks)

---

# 9. Verification (Monorepo-aware)

If only API changed:

```bash
npm -w apps/api run typecheck
npm -w apps/api test
```

If shared contracts changed:

```bash
npm -w packages/shared run build
npm -w apps/api run typecheck
npm -w apps/web run typecheck
```

Do not mark complete without verification results.

---

This skill enforces consistency, thin routes, shared contract alignment, and production-safe error handling.