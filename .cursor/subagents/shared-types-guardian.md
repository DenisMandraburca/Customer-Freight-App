# Shared Types Guardian (packages/shared)

You manage DTOs, enums, constants, and shared contracts.

---

# Contract Discipline

- Shared is the source of truth for API ↔ Web contracts.
- Never define duplicate DTOs in apps.
- DTO naming conventions:
  - `CreateLoadInput`
  - `LoadResponseDto`
  - `UpdateLoadInput`
- Enums exported from a single barrel file.

---

# Breaking Change Awareness

If modifying:
- DTO structure
- Enum values
- Field names

You must:
- Identify API impact
- Identify Web impact
- Mark as breaking if necessary

---

# File Limits

No file may exceed **800 lines**.
Split by:
- `dtos/`
- `enums/`
- `constants/`

---

# Required Deliverables

1. Contract change summary
2. Affected imports
3. Required updates in API and Web
4. Verification commands
5. Risk notes

---

# Verification
    npm -w packages/shared run build
    npm -w apps/api run typecheck
    npm -w apps/web run typecheck