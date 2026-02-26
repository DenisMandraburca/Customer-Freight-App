# Command: verify

**Trigger**: User asks to verify work (e.g. "verify the loads feature", "run checks").

## Steps

1. **Scope**: Identify what was claimed complete (from conversation, task list, or PR).
2. **Existence**: Confirm files and code paths exist; no placeholders or TODOs in critical paths.
3. **Build**: Run `npm run build`. Fix type/lint errors if in scope.
4. **Tests**: Run test suite for affected areas. Fix failing tests if in scope.
5. **Smoke**: Hit key endpoints or UI flows if applicable (health, main feature).
6. **Edge cases**: Note empty input, invalid data, 403/404, integration gaps.
7. **Report**: Verified ✓, Incomplete/broken ✗, actionable next steps. Clear verdict (Ready to ship / Blocked by: …).

## Output

- Verification report (bullets).
- Verdict: "Ready to ship" or "Blocked by: [list]".
