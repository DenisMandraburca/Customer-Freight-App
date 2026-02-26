---
name: vue-feature
description: Implement or change Vue frontend features in apps/web. Use when adding pages, components, or flows that call the API.
---

# Vue feature

1. **Types**: Use types from `@antigravity/shared` for API request/response. Do not redefine DTOs in the app.
2. **API calls**: Use existing HTTP client pattern (fetch or wrapper). Base URL from env; handle errors and loading.
3. **Components**: Match existing structure (e.g. components/, composables/, views/). One responsibility per component; keep files under 1600 lines.
4. **State**: Prefer props + emits and composables. Only introduce store if the app already uses one and the feature fits.
5. **i18n**: Use existing translation keys or add new ones in the same format. Do not change keys unless requested.
6. **UX**: Loading and error states; accessible where applicable. No placeholder copy in production paths.

---
name: vue-feature
description: Implement or modify Vue frontend features in apps/web with strict shared DTO alignment, Vue Query data patterns, semantic Tailwind styling, 800-line discipline, and monorepo-aware verification.
---

# Vue Feature (apps/web)

Use this skill when adding/changing Vue pages, components, routes, or UI flows that interact with the API.

This skill is mandatory for non-trivial UI work.

---

# 1. Scope & Intent (Required)

Before coding, state:
- What user-visible behavior changes
- What API endpoints are touched/needed
- What shared DTOs/types are used or need updates
- Any non-goals (explicitly out of scope)

Only ask clarification if requirements are ambiguous.

---

# 2. Contract Alignment (Critical)

- Use types/DTOs/enums/constants from `@antigravity/shared`.
- Do **not** redefine DTOs or enums inside `apps/web`.
- If a contract must change, coordinate with `shared-types-guardian` and ensure API impact is addressed.

---

# 3. Architecture & File Organization

## Responsibility boundaries
- Views (`views/`) are route-level composition only.
- Components (`components/`) are reusable UI blocks.
- Composables (`composables/`) contain data logic (Vue Query hooks, mapping, transforms).
- Pinia is used only for cross-route/global UI state (not server state).

## File size (Hard limit)
- No file may exceed **800 lines**.
- If approaching 800 lines, split by responsibility:
  - Extract child components
  - Extract composables
  - Extract shared UI primitives

Avoid monolithic view/components.

---

# 4. Data Fetching & Mutations (Vue Query)

- Use TanStack Vue Query for server state.
- Do not write ad-hoc `fetch()` directly inside templates.
- Prefer dedicated composables:
  - `useLoadsQuery()`
  - `useCreateLoadMutation()`

Requirements:
- Handle loading/error/empty states.
- Use stable query keys.
- Invalidate/update relevant queries after mutations.

---

# 5. Routing

- Use Vue Router patterns consistent with the app.
- Route components should orchestrate state + compose child components.
- Keep route params validated/parsed (don’t assume correctness).

---

# 6. Styling & Naming (Strict)

## Tailwind rule
- Do **not** inline large Tailwind class strings in templates for reusable UI.
- Avoid repeated long class lists across files.

## Required approach (Hybrid)
Use one of:
1) UI primitives/components (`<BaseButton/>`, `<Card/>`, `<TextField/>`, `<StatusBadge/>`).
2) Semantic Tailwind classes via `@layer components` + `@apply` (e.g., `.btn`, `.btn-primary`, `.card`, `.input`).

## IDs & test selectors
- IDs, component names, and `data-test` attributes must be meaningful and stable.
  - Example: `data-test="load-create-submit"`

---

# 7. i18n

- Reuse existing translation keys where possible.
- Add new keys following existing conventions.
- Do not rename/remove keys unless explicitly requested.

---

# 8. UX & Accessibility

Minimum required:
- Clear loading state
- Clear error state (user-friendly message + optional retry)
- Empty state
- Keyboard/focus-friendly controls for forms and dialogs

No placeholder copy in production paths.

---

# 9. Required Deliverables (Always Include)

When this skill is used, output must include:

1. Short plan
2. Files created/modified
3. Component hierarchy (what composes what)
4. State & data flow explanation (Vue Query + any Pinia)
5. Contract usage (which DTOs/types used)
6. Verification commands
7. Risk notes (contract break risk, UX edge cases, performance risks)

---

# 10. Verification (Monorepo-aware)

If only Web changed:

```bash
npm -w apps/web run typecheck
npm -w apps/web test
```

If shared contracts changed:

```bash
npm -w packages/shared run build
npm -w apps/web run typecheck
npm -w apps/api run typecheck
```

Do not mark complete without verification results.