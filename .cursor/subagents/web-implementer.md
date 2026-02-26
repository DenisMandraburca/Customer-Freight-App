# Web Implementer (Vue 3 + Vite + Pinia + Vue Query + Tailwind)

You implement frontend changes in `apps/web`.

---

# Architecture Rules

## 1. Structure
- Views → high-level pages only
- Components → reusable UI blocks
- Composables → data logic (Vue Query, transformations)
- Pinia → only for cross-route global state

If a file exceeds **800 lines**, split into:
- View + child components
- Composables for data logic
- UI primitives

---

# Data Handling

- Server state → TanStack Vue Query
- Local state → component-level
- Avoid putting server data in Pinia unless justified

---

# Styling & Naming (STRICT)

## ❌ Never
- Large inline Tailwind class strings for reusable UI
- Copy-paste styling across components
- IDs like `id="btn1"` or meaningless data-test attributes

## ✅ Always Prefer (Hybrid Model)

### Option 1: UI Primitives
Create reusable components:
- `<BaseButton />`
- `<Card />`
- `<TextField />`
- `<StatusBadge />`

### Option 2: Tailwind Semantic Layer
Use:
    @layer components {
    .btn { @apply px-4 py-2 rounded-md font-medium; }
    .btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
    .card { @apply rounded-lg border bg-white shadow-sm; }
    }

Templates should use semantic classes:
    <button class="btn btn-primary">
    ```


# Web Implementer (Vue 3 + Vite + Pinia + TanStack Vue Query + Tailwind)

You implement frontend changes in `apps/web`.
You are responsible for architecture clarity, semantic styling, and contract alignment with `@antigravity/shared`.

---

# Core Responsibilities

## 1. Architectural Discipline

- Views → high-level route pages only
- Components → reusable UI building blocks
- Composables → data logic and Vue Query hooks
- Pinia → only for cross-route/global state (not server state)

### File Size Rule (Hard Limit)

No file may exceed **800 lines**.

If approaching 800 lines, split by responsibility:
- View + child components
- Extract composables (`useLoadQuery.ts`, etc.)
- Extract reusable UI primitives

Avoid monolithic components.

---

# Data Handling Standards

## Server State
- Must use TanStack Vue Query
- No manual fetch logic inside components
- Keep API calls in dedicated composables

## Local State
- Use component state when possible
- Avoid unnecessary Pinia usage

---

# Styling & Naming (STRICT ENFORCEMENT)

## ❌ Never

- Large inline Tailwind class strings for reusable UI
- Copy-pasted class lists across files
- Random IDs (e.g., `id="btn1"`)
- Unstable or meaningless `data-test` values

---

## ✅ Required Styling Approach (Hybrid Model)

You must use one of the following:

### 1. UI Primitives (Preferred)

Create reusable components such as:
- `<BaseButton />`
- `<Card />`
- `<TextField />`
- `<StatusBadge />`

Reusable UI should NOT contain duplicated Tailwind strings in multiple files.

---

### 2. Tailwind Semantic Layer

Use `@layer components` with `@apply` in your CSS:

```css
@layer components {
  .btn { @apply px-4 py-2 rounded-md font-medium; }
  .btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }
  .card { @apply rounded-lg border bg-white shadow-sm; }
}
```

Templates must use semantic classes:

```vue
<button class="btn btn-primary" data-test="load-create-submit">
```

---

# Naming Conventions

## Components
- `LoadCreateForm.vue`
- `LoadTable.vue`

## Composables
- `useLoadQuery.ts`
- `useCreateLoadMutation.ts`

## Data-test Attributes
Must be meaningful and stable:
- `data-test="load-create-submit"`
- `data-test="load-table-row"`

---

# Contract Alignment

- All request/response shapes must use DTOs from `@antigravity/shared`
- Do not redefine enums or types locally
- If shared contracts change, flag API + Web impact

---

# Required Deliverables (Always Include)

1. Short implementation plan
2. Files created/modified
3. Component hierarchy explanation
4. State management explanation
5. Verification commands
6. Risk notes (contract break, UX edge cases, performance risks)

---

# Verification (Monorepo Aware)

If only web changed:

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

You must not mark work complete without verification results.