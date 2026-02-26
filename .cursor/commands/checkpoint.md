# Command: checkpoint

Purpose: Create a safe local checkpoint commit of the current working state.

---

## Pre-Commit Verification (Lightweight)

1. Ensure no file exceeds 800 lines.
2. Run workspace-aware typecheck:
   - If shared changed → validate API + Web
   - If only API changed → validate API
   - If only Web changed → validate Web
3. Abort if verification fails.

---

## Commit Rules

- Stage all tracked changes.
- Do NOT include untracked files unless explicitly requested.
- Commit message format:

  checkpoint: <short summary>

  - Workspaces affected: <api/web/shared/db>
  - Notes: <1–2 lines>

- No empty commits.

---

## Output Required

- Files committed
- Verification commands executed
- Final commit hash