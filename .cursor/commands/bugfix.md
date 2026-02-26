# Command: bugfix

**Trigger**: User reports a bug or asks to fix a specific issue.

## Steps

1. **Reproduce**: Identify where the bug manifests (api, web, db, shared). Get steps or error message if missing.
2. **Locate**: Find the code path (route, component, query) that causes the bug. Check edge cases (empty input, permissions, errors).
3. **Fix**: Change the minimal set of files. Prefer fixing root cause over masking symptoms. Do not refactor unrelated code.
4. **Verify**: Run build and tests for the affected area. Add or adjust a test if the bug was testable and missing. Report verdict.

## Output

- Root cause (one line).
- Files changed and what was fixed.
- Verification result (Ready to ship / Blocked by: …).
